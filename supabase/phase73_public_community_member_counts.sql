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

-- Avatar-Vorschau (max. p_per Mitglieder je Community) für öffentliche/eigene Communities.
-- Blockierte Nutzer werden ausgeblendet (is_blocked_pair).
create or replace function public.get_community_members_preview(p_ids uuid[], p_per int default 4)
returns table (community_id uuid, user_id uuid, avatar_url text, full_name text, username text)
language sql
stable
security definer
set search_path = public
as $$
  select r.community_id, r.user_id, p.avatar_url, p.full_name, p.username
  from (
    select cm.community_id, cm.user_id,
           row_number() over (partition by cm.community_id order by cm.joined_at) rn
    from public.community_members cm
    join public.communities c on c.id = cm.community_id
    where cm.community_id = any(p_ids)
      and (c.is_public = true or cm.community_id in (select get_my_community_ids()))
      and not public.is_blocked_pair(cm.user_id)
  ) r
  join public.profiles p on p.id = r.user_id
  where r.rn <= p_per
$$;

revoke all on function public.get_community_members_preview(uuid[], int) from public, anon;
grant execute on function public.get_community_members_preview(uuid[], int) to authenticated;
