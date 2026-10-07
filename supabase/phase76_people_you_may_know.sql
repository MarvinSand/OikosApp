-- "Neue Geschwister, die du kennen könntest" auf Home lud bisher als
-- Wasserfall aus bis zu 6 nacheinander laufenden Requests (Freundschaften ->
-- Profile -> Freunde von Freunden -> Verbinder-Profile -> Kandidaten-Profile
-- -> Auffüll-Profile). Diese RPC liefert dieselbe Liste in einem Request.
-- Idempotent.

create or replace function public.get_people_you_may_know(p_limit int default 10)
returns table (
  id uuid, username text, full_name text, is_christian boolean,
  avatar_url text, city text, mutual_count int, mutual_people jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select (select auth.uid()) as uid),
  my_friends as (
    select case when f.requester_id = me.uid then f.addressee_id else f.requester_id end as fid
    from friendships f, me
    where f.status = 'accepted' and (f.requester_id = me.uid or f.addressee_id = me.uid)
  ),
  connected as (
    select case when f.requester_id = me.uid then f.addressee_id else f.requester_id end as cid
    from friendships f, me
    where f.status <> 'declined' and (f.requester_id = me.uid or f.addressee_id = me.uid)
  ),
  fof as (
    select
      case when f.requester_id in (select fid from my_friends) then f.addressee_id else f.requester_id end as candidate,
      case when f.requester_id in (select fid from my_friends) then f.requester_id else f.addressee_id end as connector
    from friendships f
    where f.status = 'accepted'
      and (f.requester_id in (select fid from my_friends) or f.addressee_id in (select fid from my_friends))
  ),
  mutual as (
    select candidate, count(distinct connector)::int as cnt, array_agg(distinct connector) as connectors
    from fof, me
    where candidate <> me.uid
      and candidate not in (select cid from connected)
      and not public.is_blocked_pair(candidate)
    group by candidate
  ),
  ranked as (
    select m.candidate as pid, m.cnt, m.connectors, 0 as grp, null::timestamptz as created_at
    from mutual m
    union all
    select p.id, 0, null, 1, p.created_at
    from profiles p, me
    where p.id <> me.uid
      and p.id not in (select cid from connected)
      and p.id not in (select candidate from mutual)
      and not public.is_blocked_pair(p.id)
  ),
  picked as (
    select * from ranked
    order by grp, cnt desc, created_at desc nulls last
    limit greatest(coalesce(p_limit, 10), 1)
  )
  select
    p.id, p.username, p.full_name, p.is_christian, p.avatar_url, p.city,
    pk.cnt,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'username', c.username, 'full_name', c.full_name, 'avatar_url', c.avatar_url))
      from profiles c where c.id = any(pk.connectors)
    ), '[]'::jsonb)
  from picked pk
  join profiles p on p.id = pk.pid
  order by pk.grp, pk.cnt desc, pk.created_at desc nulls last;
$$;

revoke all on function public.get_people_you_may_know(int) from public, anon;
grant execute on function public.get_people_you_may_know(int) to authenticated;

-- "Entdecken" auf Home: öffentliche Communities inkl. Mitgliederzahl in
-- einem Request (vorher Liste + get_community_member_counts nacheinander).
-- SECURITY DEFINER, weil RLS Nicht-Mitgliedern die Mitgliederzeilen verbirgt.
create or replace function public.get_public_communities(p_limit int default 20)
returns table (id uuid, name text, description text, is_public boolean, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.description, c.is_public,
         (select count(*) from public.community_members cm where cm.community_id = c.id)
  from public.communities c
  where c.is_public = true
  order by c.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
$$;

revoke all on function public.get_public_communities(int) from public, anon;
grant execute on function public.get_public_communities(int) to authenticated;
