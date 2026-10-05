-- Mitgliederzahlen für öffentliche Communities (Entdecken-Liste).
-- RLS auf community_members zeigt Nicht-Mitgliedern keine Zeilen → Client-Count wäre 0.
-- Nur Zahlen, keine Nutzerdaten; nur für öffentliche Communities.
create or replace function public.get_community_member_counts(p_ids uuid[])
returns table (community_id uuid, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, count(cm.id)
  from public.communities c
  left join public.community_members cm on cm.community_id = c.id
  where c.id = any(p_ids)
    and (c.is_public = true or c.id in (select get_my_community_ids()))
  group by c.id
$$;

revoke all on function public.get_community_member_counts(uuid[]) from public, anon;
grant execute on function public.get_community_member_counts(uuid[]) to authenticated;
