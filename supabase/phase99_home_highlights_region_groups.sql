-- phase99: Aktuelles-Highlights (von Moderatoren) + automatische Regions-Gruppen
-- Idempotent. Im Supabase SQL-Editor ausführbar.

-- ─── 1. Highlights im Aktuelles-Tab ───────────────────────────────────────
-- kind 'update': Text (Update/wichtige Info), 'event': hervorgehobenes
-- Weltkarten-Event, 'prayer': hervorgehobenes öffentliches Gebet.
create table if not exists public.home_highlights (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('update', 'event', 'prayer')),
  title text,
  body text,
  is_important boolean not null default false,
  activity_id uuid references public.world_map_activities(id) on delete cascade,
  prayer_id uuid references public.personal_prayer_requests(id) on delete cascade,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint home_highlights_ref_check check (
    (kind = 'update' and nullif(trim(title), '') is not null)
    or (kind = 'event' and activity_id is not null)
    or (kind = 'prayer' and prayer_id is not null)
  )
);

create index if not exists home_highlights_created_idx on public.home_highlights (created_at desc);
create index if not exists home_highlights_activity_idx on public.home_highlights (activity_id);
create index if not exists home_highlights_prayer_idx on public.home_highlights (prayer_id);

alter table public.home_highlights enable row level security;

-- Nur App-Admins greifen direkt auf die Tabelle zu; alle anderen lesen über
-- die RPC get_home_highlights() (die auch Sichtbarkeit/Blockierungen prüft).
drop policy if exists "home_highlights admin select" on public.home_highlights;
create policy "home_highlights admin select" on public.home_highlights
  for select to authenticated using (public.is_app_admin());

drop policy if exists "home_highlights admin insert" on public.home_highlights;
create policy "home_highlights admin insert" on public.home_highlights
  for insert to authenticated
  with check (public.is_app_admin() and created_by = (select auth.uid()));

drop policy if exists "home_highlights admin update" on public.home_highlights;
create policy "home_highlights admin update" on public.home_highlights
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists "home_highlights admin delete" on public.home_highlights;
create policy "home_highlights admin delete" on public.home_highlights
  for delete to authenticated using (public.is_app_admin());

create or replace function public.get_home_highlights()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(x.j order by x.is_important desc, x.created_at desc), '[]'::jsonb)
  from (
    select h.is_important, h.created_at,
      case h.kind
        when 'update' then jsonb_build_object(
          'id', h.id, 'kind', 'update', 'title', h.title, 'body', h.body,
          'is_important', h.is_important, 'created_at', h.created_at)
        when 'event' then jsonb_build_object(
          'id', h.id, 'kind', 'event', 'note', h.body, 'is_important', h.is_important,
          'created_at', h.created_at, 'activity_id', a.id, 'title', a.title,
          'emoji', a.activity_emoji, 'location_name', a.location_name,
          'starts_at', a.starts_at, 'ends_at', a.ends_at, 'description', a.description,
          'recurrence_freq', a.recurrence_freq, 'recurrence_interval', a.recurrence_interval,
          'recurrence_weekdays', a.recurrence_weekdays, 'recurrence_end_date', a.recurrence_end_date)
        when 'prayer' then jsonb_build_object(
          'id', h.id, 'kind', 'prayer', 'note', h.body, 'is_important', h.is_important,
          'created_at', h.created_at, 'prayer_id', p.id, 'title', p.title,
          'description', p.description,
          'author_name', coalesce(nullif(pr.full_name, ''), pr.username))
      end as j
    from public.home_highlights h
    left join public.world_map_activities a
      on h.kind = 'event' and a.id = h.activity_id
         and a.is_public is true
         and (a.expires_at is null or a.expires_at > now())
         and not public.is_blocked_pair(a.author_id)
    left join public.personal_prayer_requests p
      on h.kind = 'prayer' and p.id = h.prayer_id
         and p.visibility = 'public'
         and p.moderation_hidden_at is null and p.moderation_deleted_at is null
         and not public.is_blocked_pair(p.owner_id)
    left join public.profiles pr on pr.id = p.owner_id
    where (h.expires_at is null or h.expires_at > now())
      and (h.kind = 'update' or a.id is not null or p.id is not null)
  ) x
  where x.j is not null;
$$;

revoke all on function public.get_home_highlights() from public, anon;
grant execute on function public.get_home_highlights() to authenticated;

-- ─── 2. Automatische Regions-Gruppen (Land + Bundesland) ─────────────────
alter table public.communities add column if not exists region_key text;
create unique index if not exists communities_region_key_uidx
  on public.communities (region_key) where region_key is not null;

alter table public.profiles
  add column if not exists address_state text,
  add column if not exists country_code text;

-- Legt die Regions-Gruppe an (falls nötig, inkl. Chat) und gibt ihre ID zurück.
create or replace function public._ensure_region_group(p_key text, p_name text, p_desc text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_creator uuid;
begin
  select id into v_id from communities where region_key = p_key;
  if v_id is null then
    select user_id into v_creator from app_admins order by created_at limit 1;
    insert into communities (name, description, invite_code, is_public, join_mode, community_type, created_by, region_key)
    values (p_name, p_desc,
            'R' || upper(substr(md5(random()::text || clock_timestamp()::text || p_key), 1, 9)),
            true, 'open', 'group', coalesce(v_creator, auth.uid()), p_key)
    on conflict (region_key) where region_key is not null do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from communities where region_key = p_key;
    end if;
  end if;

  if not exists (select 1 from conversations where type = 'community' and community_id = v_id) then
    insert into conversations (type, community_id) values ('community', v_id);
  end if;
  return v_id;
end;
$$;

revoke all on function public._ensure_region_group(text, text, text) from public, anon, authenticated;

-- Trägt den Standort-Bereich ins Profil ein und fügt den Nutzer der Länder-
-- und Bundesland-Gruppe hinzu (nur, wenn er auf der Weltkarte sichtbar ist).
-- Wechselt die Region, verlässt er die alten automatischen Gruppen.
create or replace function public.join_region_groups(
  p_country text, p_country_code text, p_state text, p_state_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_cc text := upper(nullif(trim(coalesce(p_country_code, '')), ''));
  v_country text := nullif(trim(coalesce(p_country, '')), '');
  v_state text := nullif(trim(coalesce(p_state, '')), '');
  v_scode text := upper(nullif(trim(coalesce(p_state_code, '')), ''));
  v_show boolean;
  v_flag text := '';
  v_keys text[] := '{}';
  v_ids uuid[] := '{}';
  v_gid uuid;
  v_conv uuid;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  if v_cc is null or v_country is null then
    return jsonb_build_object('joined', '[]'::jsonb);
  end if;

  update profiles set address_state = v_state, country_code = v_cc where id = v_uid;

  select coalesce(show_on_world_map, false) into v_show from profiles where id = v_uid;
  if not coalesce(v_show, false) then
    return jsonb_build_object('joined', '[]'::jsonb, 'skipped', 'not_on_map');
  end if;

  if v_cc ~ '^[A-Z]{2}$' then
    v_flag := chr(127397 + ascii(substr(v_cc, 1, 1))) || chr(127397 + ascii(substr(v_cc, 2, 1))) || ' ';
  end if;

  v_gid := _ensure_region_group('country:' || v_cc, v_flag || v_country,
    'Austausch der Geschwister aus ' || v_country || '. Diese Gruppe entsteht automatisch, wenn du dich mit Standort auf der Weltkarte einträgst.');
  v_keys := v_keys || ('country:' || v_cc);
  v_ids := v_ids || v_gid;

  if v_state is not null then
    v_gid := _ensure_region_group('state:' || v_cc || ':' || coalesce(v_scode, lower(v_state)), v_state,
      'Austausch der Geschwister aus ' || v_state || ' (' || v_country || '). Diese Gruppe entsteht automatisch, wenn du dich mit Standort auf der Weltkarte einträgst.');
    v_keys := v_keys || ('state:' || v_cc || ':' || coalesce(v_scode, lower(v_state)));
    v_ids := v_ids || v_gid;
  end if;

  -- Alte automatische Regions-Gruppen verlassen (Umzug)
  delete from conversation_members cm
  using conversations c, communities co
  where cm.user_id = v_uid and cm.conversation_id = c.id and c.type = 'community'
    and c.community_id = co.id and co.region_key is not null and not (co.region_key = any (v_keys));
  delete from community_members m
  using communities co
  where m.user_id = v_uid and m.community_id = co.id
    and co.region_key is not null and not (co.region_key = any (v_keys));

  -- Beitreten (Mitglied + Chat)
  foreach v_gid in array v_ids loop
    insert into community_members (community_id, user_id, role)
    values (v_gid, v_uid, 'member')
    on conflict (community_id, user_id) do nothing;

    select id into v_conv from conversations where type = 'community' and community_id = v_gid limit 1;
    if v_conv is not null then
      insert into conversation_members (conversation_id, user_id, last_read_at)
      values (v_conv, v_uid, now())
      on conflict (conversation_id, user_id) do nothing;
    end if;
  end loop;

  return jsonb_build_object('joined', to_jsonb(v_ids));
end;
$$;

revoke all on function public.join_region_groups(text, text, text, text) from public, anon;
grant execute on function public.join_region_groups(text, text, text, text) to authenticated;

-- Status für den einmaligen Nachtrag bestehender Nutzer (Client prüft, ob er
-- schon in Regions-Gruppen ist; sonst ermittelt er Land/Bundesland per Geocoder).
create or replace function public.get_my_region_status()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'country_code', p.country_code,
    'state', p.address_state,
    'has_groups', exists (
      select 1 from community_members m join communities c on c.id = m.community_id
      where m.user_id = p.id and c.region_key is not null)
  )
  from profiles p where p.id = (select auth.uid());
$$;

revoke all on function public.get_my_region_status() from public, anon;
grant execute on function public.get_my_region_status() to authenticated;
