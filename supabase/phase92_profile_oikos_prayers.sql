-- Phase 92: Oikos-Gebete im Profil mit Person/Map-Kontext (SECURITY INVOKER →
-- RLS entscheidet, was der Betrachter sehen darf; unsichtbare Person/Map → Zeile entfällt).
create or replace function public.get_profile_oikos_prayers(p_target uuid)
returns table(
  id uuid, title text, description text, is_answered boolean, is_public boolean,
  created_at timestamptz, person_id uuid, person_name text, map_id uuid, map_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select pr.id, pr.title, pr.description, pr.is_answered, pr.is_public, pr.created_at,
         pr.person_id, op.name, m.id, m.name
  from public.prayer_requests pr
  join public.oikos_people op on op.id = pr.person_id
  join public.oikos_maps m on m.id = op.map_id
  where pr.owner_id = p_target
    and (p_target = (select auth.uid()) or pr.is_public is true)
    and not public.is_blocked_pair(p_target)
  order by pr.created_at desc
  limit 200
$$;
revoke all on function public.get_profile_oikos_prayers(uuid) from public, anon;
grant execute on function public.get_profile_oikos_prayers(uuid) to authenticated;
