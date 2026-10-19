-- phase84: cheap person counts for profile map cards.
-- Replaces fetching every oikos_people row (with heavy per-row RLS) just to count them.
-- Only counts maps visible to the caller (same rules as is_map_visible_to / "Maps lesen").
create or replace function public.get_map_person_counts(p_map_ids uuid[])
returns table(map_id uuid, person_count integer)
language sql stable security definer set search_path = public
as $$
  select p.map_id, count(*)::int
  from public.oikos_people p
  where p.map_id = any(p_map_ids)
    and public.is_map_visible_to(p.map_id, (select auth.uid()))
  group by p.map_id;
$$;
revoke all on function public.get_map_person_counts(uuid[]) from public, anon;
grant execute on function public.get_map_person_counts(uuid[]) to authenticated, service_role;
