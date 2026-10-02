-- Phase 64: Home-Dashboard von 28+ Requests auf eine Handvoll bringen
--
-- Home lud beim ersten Rendern u.a.: 7 Requests für prayer_goals (2
-- Vorab-Queries für Community-/Freundschafts-IDs + 5 parallele
-- visibility-Queries), bis zu 9 für conversations (nur um ein
-- hasUnread-Badge zu berechnen!), 3 für TopPrayerToday (Logs+Notes dann
-- Kandidaten) und 6 für die Profil-Vervollständigung (useProfile +
-- useFriendships). In Summe die 28+ Requests, die den ersten Seitenaufbau
-- dominiert haben. Diese Migration verlagert die Visibility-/Ranking-Logik
-- serverseitig, wo sie ohnehin schon als RLS-Policy bzw. SQL-Ausdruck
-- existiert, statt sie clientseitig über mehrere Queries nachzubauen.

-- ─────────────────────────────────────────────────────────────
-- 1) prayer_goals: eine View statt 5 visibility-Queries
-- ─────────────────────────────────────────────────────────────
-- security_invoker sorgt dafür, dass die bestehende RLS-Policy
-- "Read prayer_goals" weiterhin pro abfragendem User greift – die View
-- fügt nur ein `bucket`-Label hinzu, filtert aber nicht selbst.
create or replace view public.my_prayer_goals
with (security_invoker = true) as
select
  g.*,
  case
    when g.created_by = auth.uid() then 'mine'
    when g.visibility = 'public' then 'public'
    when g.visibility = 'community' then 'community'
    else 'shared'
  end as bucket
from public.prayer_goals g;

grant select on public.my_prayer_goals to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2) conversations: eine RPC mit JOINs statt 3 Konversations- + 3
--    Folge-Queries (Nachrichten, Gegenüber, Mitgliedschaften)
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_my_conversations()
returns table (
  id uuid,
  type text,
  community_id uuid,
  activity_id uuid,
  last_read_at timestamptz,
  last_message jsonb,
  other_user jsonb,
  community jsonb,
  activity jsonb,
  unread boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with my_membership as (
    select conversation_id, last_read_at
    from conversation_members
    where user_id = auth.uid()
  ),
  base as (
    select c.id, c.type, c.community_id, c.activity_id, mm.last_read_at
    from conversations c
    left join my_membership mm on mm.conversation_id = c.id
    where c.id in (select conversation_id from my_membership)
       or (c.type = 'community' and c.community_id in (select get_my_community_ids()))
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
$$;

grant execute on function public.get_my_conversations() to authenticated;

-- Home braucht für das Chat-Badge nur ein Bit, keine Nachrichteninhalte,
-- Profile oder Community-Namen. Eigene, sehr leichte RPC statt der vollen
-- Konversationsliste.
create or replace function public.has_unread_conversations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Wiederverwendet get_my_conversations(), statt die Mitgliedschafts-/
  -- Community-Logik ein zweites Mal (mit Abweichungsrisiko) nachzubauen.
  select coalesce(bool_or(unread), false) from public.get_my_conversations();
$$;

grant execute on function public.has_unread_conversations() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3) TopPrayerToday: Ranking + Kandidatenauswahl serverseitig statt
--    2 parallele Queries + eine dritte, von deren Ergebnis abhängige
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_top_prayer_today()
returns table (
  request jsonb,
  interactions int
)
language sql
stable
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.get_top_prayer_today() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4) Profil-Vervollständigung: eine RPC statt useProfile (4 Queries) +
--    useFriendships (2 Queries)
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_profile_completion_status()
returns table (
  has_bio boolean,
  has_avatar boolean,
  has_location boolean,
  people_count int,
  has_friend_or_pending_sent boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(length(trim(p.bio_text)), 0) > 0,
    p.avatar_url is not null,
    p.latitude is not null and p.longitude is not null,
    (select count(*)::int from oikos_people where user_id = auth.uid()),
    exists (
      select 1 from friendships f
      where (f.status = 'accepted' and (f.requester_id = auth.uid() or f.addressee_id = auth.uid()))
         or (f.status = 'pending' and f.requester_id = auth.uid())
    )
  from profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.get_profile_completion_status() to authenticated;
