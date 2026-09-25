-- Phase 71: Nutzer blockieren (App-Store-Richtlinie 1.2 für nutzergenerierte
-- Inhalte: Melden UND Blockieren müssen möglich sein).
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- Wirkung einer Blockierung (in BEIDE Richtungen):
--   * Beiträge, Kommentare, Chat-Nachrichten, Gebetsanliegen, Gebets-
--     Kommentare und Weltkarten-Aktivitäten des anderen sind unsichtbar
--     (RESTRICTIVE-RLS-Policies – greifen automatisch in jeder Abfrage,
--     auch in Realtime).
--   * Keine neuen Direktnachrichten / kein neuer Direkt-Chat.
--   * Die SECURITY-DEFINER-RPCs (umgehen RLS) filtern explizit.

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocked_id on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Manage own blocks" on public.user_blocks;
create policy "Manage own blocks" on public.user_blocks
  for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

-- Block in einer der beiden Richtungen? SECURITY DEFINER, weil RLS dem
-- Nutzer nur die eigenen Blockierungen zeigt – dass ihn jemand anderes
-- blockiert hat, muss trotzdem wirken.
create or replace function public.is_blocked_pair(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_other is not null and exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = (select auth.uid()))
  );
$$;

revoke execute on function public.is_blocked_pair(uuid) from public, anon;
grant execute on function public.is_blocked_pair(uuid) to authenticated;

-- ─── Inhalte blockierter Nutzer ausblenden ────────────────────
drop policy if exists "Hide blocked users" on public.feed_posts;
create policy "Hide blocked users" on public.feed_posts
  as restrictive for select to authenticated
  using (not public.is_blocked_pair(author_id));

drop policy if exists "Hide blocked users" on public.feed_comments;
create policy "Hide blocked users" on public.feed_comments
  as restrictive for select to authenticated
  using (not public.is_blocked_pair(author_id));

drop policy if exists "Hide blocked users" on public.messages;
create policy "Hide blocked users" on public.messages
  as restrictive for select to authenticated
  using (not public.is_blocked_pair(sender_id));

drop policy if exists "Hide blocked users" on public.personal_prayer_requests;
create policy "Hide blocked users" on public.personal_prayer_requests
  as restrictive for select to authenticated
  using (not public.is_blocked_pair(owner_id));

drop policy if exists "Hide blocked users" on public.prayer_notes;
create policy "Hide blocked users" on public.prayer_notes
  as restrictive for select to authenticated
  using (not public.is_blocked_pair(author_id));

drop policy if exists "Hide blocked users" on public.world_map_activities;
create policy "Hide blocked users" on public.world_map_activities
  as restrictive for select to authenticated
  using (not public.is_blocked_pair(author_id));

-- ─── Keine Direktnachrichten zwischen blockierten Nutzern ─────
drop policy if exists "No direct messages between blocked users" on public.messages;
create policy "No direct messages between blocked users" on public.messages
  as restrictive for insert to authenticated
  with check (
    not exists (
      select 1
      from public.conversations c
      join public.conversation_members cm on cm.conversation_id = c.id
      where c.id = messages.conversation_id
        and c.type = 'direct'
        and cm.user_id <> (select auth.uid())
        and public.is_blocked_pair(cm.user_id)
    )
  );

create or replace function public.start_direct_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_conv_id uuid;
begin
  if public.is_blocked_pair(other_user_id) then
    raise exception 'user_blocked' using errcode = 'P0001';
  end if;

  -- Check if a direct conversation between the two users already exists
  select cm1.conversation_id into v_conv_id
  from conversation_members cm1
  join conversation_members cm2 on cm2.conversation_id = cm1.conversation_id
  join conversations c on c.id = cm1.conversation_id
  where cm1.user_id = auth.uid()
    and cm2.user_id = other_user_id
    and c.type = 'direct'
  limit 1;

  if v_conv_id is not null then
    return v_conv_id;
  end if;

  -- Create new conversation
  insert into conversations (type) values ('direct') returning id into v_conv_id;

  -- Add both members
  insert into conversation_members (conversation_id, user_id)
  values (v_conv_id, auth.uid()), (v_conv_id, other_user_id);

  return v_conv_id;
end;
$function$;

-- ─── SECURITY-DEFINER-RPCs (umgehen RLS) explizit filtern ─────

-- Chat-Liste: Direkt-Chats mit blockierten Nutzern verschwinden, in
-- Gruppen-Chats zeigt die Vorschau keine Nachricht eines blockierten Nutzers.
create or replace function public.get_my_conversations()
returns table(id uuid, type text, community_id uuid, activity_id uuid, last_read_at timestamp with time zone, last_message jsonb, other_user jsonb, community jsonb, activity jsonb, unread boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  with my_membership as (
    select conversation_id, last_read_at
    from conversation_members
    where user_id = auth.uid()
  ),
  base as (
    select c.id, c.type, c.community_id, c.activity_id, mm.last_read_at
    from conversations c
    left join my_membership mm on mm.conversation_id = c.id
    where (c.id in (select conversation_id from my_membership)
       or (c.type = 'community' and c.community_id in (select get_my_community_ids())))
      and not (
        c.type = 'direct' and exists (
          select 1 from conversation_members bcm
          where bcm.conversation_id = c.id
            and bcm.user_id <> auth.uid()
            and public.is_blocked_pair(bcm.user_id)
        )
      )
  )
  select
    b.id,
    b.type,
    b.community_id,
    b.activity_id,
    b.last_read_at,
    lm.last_message,
    ou.other_user,
    comm.community,
    act.activity,
    coalesce(
      (lm.last_message ->> 'sender_id') is distinct from auth.uid()::text
      and (lm.last_message ->> 'created_at')::timestamptz > coalesce(b.last_read_at, 'epoch'::timestamptz),
      false
    ) as unread
  from base b
  left join lateral (
    select jsonb_build_object(
      'id', m.id, 'conversation_id', m.conversation_id, 'sender_id', m.sender_id,
      'type', m.type, 'text', m.text, 'is_deleted', m.is_deleted, 'created_at', m.created_at
    ) as last_message
    from messages m
    where m.conversation_id = b.id
      and not public.is_blocked_pair(m.sender_id)
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select jsonb_build_object(
      'id', p.id, 'username', p.username, 'full_name', p.full_name,
      'is_christian', p.is_christian, 'gender', p.gender
    ) as other_user
    from conversation_members ocm
    join profiles p on p.id = ocm.user_id
    where ocm.conversation_id = b.id and ocm.user_id <> auth.uid()
    limit 1
  ) ou on b.type = 'direct'
  left join lateral (
    select jsonb_build_object('id', co.id, 'name', co.name) as community
    from communities co
    where co.id = b.community_id
  ) comm on b.type = 'community'
  left join lateral (
    select jsonb_build_object(
      'id', wa.id, 'title', wa.title, 'activity_emoji', wa.activity_emoji, 'activity_type', wa.activity_type
    ) as activity
    from world_map_activities wa
    where wa.id = b.activity_id
  ) act on b.type = 'activity';
$function$;

create or replace function public.get_top_prayer_today()
returns table(request jsonb, interactions integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  with today_counts as (
    select request_id, count(*) as cnt
    from (
      select request_id from personal_prayer_logs where created_at >= date_trunc('day', now())
      union all
      select request_id from prayer_notes where created_at >= date_trunc('day', now())
    ) x
    group by request_id
  ),
  ranked as (
    select tc.request_id, tc.cnt
    from today_counts tc
    join personal_prayer_requests r on r.id = tc.request_id
    where r.visibility = 'public' and r.is_answered = false
      and not public.is_blocked_pair(r.owner_id)
    order by tc.cnt desc
    limit 1
  )
  select
    jsonb_build_object(
      'id', r.id, 'title', r.title, 'description', r.description,
      'profiles', jsonb_build_object(
        'id', p.id, 'username', p.username, 'full_name', p.full_name,
        'gender', p.gender, 'is_christian', p.is_christian
      )
    ) as request,
    ranked.cnt::int as interactions
  from ranked
  join personal_prayer_requests r on r.id = ranked.request_id
  join profiles p on p.id = r.owner_id;
$function$;

create or replace function public.get_world_map_users()
returns table(id uuid, full_name text, username text, avatar_url text, latitude double precision, longitude double precision, is_christian boolean, gender text, city text, country text, church_name text, bio text, bio_text text, show_bio boolean, address_district text, address_full text, shown_precision text)
language sql
stable security definer
set search_path to 'public'
as $function$
  with my_friends as (
    select case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end as friend_id
    from friendships f
    where f.status = 'accepted'
      and (f.requester_id = (select auth.uid()) or f.addressee_id = (select auth.uid()))
  ),
  scoped as (
    select
      p.*,
      coalesce(
        case when p.id in (select friend_id from my_friends)
          then p.location_precision_friends
          else p.location_precision_public
        end,
        'hidden'
      ) as prec
    from public.profiles p
    where p.id <> (select auth.uid())
      and p.show_on_world_map = true
      and p.latitude is not null
      and p.longitude is not null
      and not public.is_blocked_pair(p.id)
  )
  select
    s.id, s.full_name, s.username, s.avatar_url,
    case s.prec when 'exact' then s.latitude when 'district' then round(s.latitude::numeric, 3)::float else round(s.latitude::numeric, 2)::float end as latitude,
    case s.prec when 'exact' then s.longitude when 'district' then round(s.longitude::numeric, 3)::float else round(s.longitude::numeric, 2)::float end as longitude,
    s.is_christian, s.gender, s.city, s.country, s.church_name, s.bio, s.bio_text, s.show_bio,
    case when s.prec in ('district', 'exact') then s.address_district else null end as address_district,
    case when s.prec = 'exact' then s.address_full else null end as address_full,
    s.prec as shown_precision
  from scoped s
  where s.prec <> 'hidden';
$function$;
