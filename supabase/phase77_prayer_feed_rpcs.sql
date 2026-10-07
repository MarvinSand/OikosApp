-- Gebete-Feed: Request-Ketten zusammenfassen. Beide Funktionen laufen als
-- SECURITY INVOKER, damit die bestehenden RLS-Policies unverändert gelten.
-- Idempotent.

-- Eigene Oikos-Anliegen (Maps -> Personen -> Anliegen) in EINEM Request
-- statt drei hintereinander. Liefert dieselbe Zeilenform wie select('*').
create or replace function public.get_own_oikos_prayers(p_status text default 'open', p_limit int default 100)
returns setof public.prayer_requests
language sql
stable
security invoker
set search_path = public
as $$
  select pr.*
  from public.prayer_requests pr
  join public.oikos_people op on op.id = pr.person_id
  join public.oikos_maps m on m.id = op.map_id
  where m.user_id = (select auth.uid())
    and (
      p_status = 'all'
      or (p_status = 'answered' and pr.is_answered = true)
      or (p_status not in ('all', 'answered') and pr.is_answered = false)
    )
  order by pr.created_at desc
  limit greatest(coalesce(p_limit, 100), 1)
$$;

-- Herkunft/Autor-Kontext für Gebete (Person -> Map -> Besitzer, Community-
-- Namen, Autoren-Profile) in EINEM Request statt einer 3-stufigen Kette.
create or replace function public.get_prayer_context(
  p_person_ids uuid[], p_community_ids uuid[], p_owner_ids uuid[]
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with people as (
    select id, name, map_id from public.oikos_people
    where id = any(coalesce(p_person_ids, '{}'::uuid[]))
  ),
  maps as (
    select id, name, user_id from public.oikos_maps
    where id in (select map_id from people)
  ),
  comm as (
    select id, name from public.communities
    where id = any(coalesce(p_community_ids, '{}'::uuid[]))
  ),
  profs as (
    select id, username, full_name, gender, is_christian, avatar_url from public.profiles
    where id = any(coalesce(p_owner_ids, '{}'::uuid[]))
       or id in (select user_id from maps)
  )
  select jsonb_build_object(
    'people',      coalesce((select jsonb_agg(to_jsonb(people)) from people), '[]'::jsonb),
    'maps',        coalesce((select jsonb_agg(to_jsonb(maps))   from maps),   '[]'::jsonb),
    'communities', coalesce((select jsonb_agg(to_jsonb(comm))   from comm),   '[]'::jsonb),
    'profiles',    coalesce((select jsonb_agg(to_jsonb(profs))  from profs),  '[]'::jsonb)
  )
$$;

revoke all on function public.get_own_oikos_prayers(text, int) from public, anon;
grant execute on function public.get_own_oikos_prayers(text, int) to authenticated;
revoke all on function public.get_prayer_context(uuid[], uuid[], uuid[]) from public, anon;
grant execute on function public.get_prayer_context(uuid[], uuid[], uuid[]) to authenticated;

-- Gebets-Logs + Kommentare samt Profilen in EINEM Request (vorher: 4 parallele
-- Queries, danach eine abhängige Profil-Query = 2 Round-Trips).
create or replace function public.get_prayer_engagement(p_oikos_ids uuid[], p_personal_ids uuid[])
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'oikosLogs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'prayer_request_id', l.prayer_request_id, 'user_id', l.user_id, 'created_at', l.created_at,
        'profiles', case when p.id is null then null else jsonb_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name, 'is_christian', p.is_christian, 'avatar_url', p.avatar_url) end
      ) order by l.created_at desc)
      from public.prayer_logs l left join public.profiles p on p.id = l.user_id
      where l.prayer_request_id = any(coalesce(p_oikos_ids, '{}'::uuid[]))
    ), '[]'::jsonb),
    'personalLogs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'request_id', l.request_id, 'user_id', l.user_id, 'created_at', l.created_at,
        'profiles', case when p.id is null then null else jsonb_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name, 'is_christian', p.is_christian, 'avatar_url', p.avatar_url) end
      ) order by l.created_at desc)
      from public.personal_prayer_logs l left join public.profiles p on p.id = l.user_id
      where l.request_id = any(coalesce(p_personal_ids, '{}'::uuid[]))
    ), '[]'::jsonb),
    'oikosNotes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'prayer_request_id', n.prayer_request_id, 'text', n.text, 'is_public', n.is_public,
        'author_id', n.author_id, 'created_at', n.created_at, 'reply_to_id', n.reply_to_id,
        'profiles', case when p.id is null then null else jsonb_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name, 'is_christian', p.is_christian, 'avatar_url', p.avatar_url) end
      ) order by n.created_at desc)
      from public.prayer_notes n left join public.profiles p on p.id = n.author_id
      where n.prayer_request_id = any(coalesce(p_oikos_ids, '{}'::uuid[]))
    ), '[]'::jsonb),
    'personalNotes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'request_id', n.request_id, 'text', n.text, 'is_public', n.is_public,
        'author_id', n.author_id, 'created_at', n.created_at, 'reply_to_id', n.reply_to_id,
        'profiles', case when p.id is null then null else jsonb_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name, 'is_christian', p.is_christian, 'avatar_url', p.avatar_url) end
      ) order by n.created_at desc)
      from public.prayer_notes n left join public.profiles p on p.id = n.author_id
      where n.request_id = any(coalesce(p_personal_ids, '{}'::uuid[]))
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.get_prayer_engagement(uuid[], uuid[]) from public, anon;
grant execute on function public.get_prayer_engagement(uuid[], uuid[]) to authenticated;

-- Öffentliche Communities inkl. Beitrittsmodus/Avatar + Mitgliederzahl in
-- EINEM Request (Community-Tab; get_public_communities aus phase76 liefert
-- diese Spalten nicht). SECURITY DEFINER, weil RLS Nicht-Mitgliedern die
-- Mitgliederzeilen verbirgt.
create or replace function public.get_public_communities_full(p_limit int default 20)
returns table (id uuid, name text, description text, is_public boolean, join_mode text, avatar_url text, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.description, c.is_public, c.join_mode, c.avatar_url,
         (select count(*) from public.community_members cm where cm.community_id = c.id)
  from public.communities c
  where c.is_public = true
  order by c.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
$$;
revoke all on function public.get_public_communities_full(int) from public, anon;
grant execute on function public.get_public_communities_full(int) to authenticated;
