-- ════════════════════════════════════════════════════════════════════════
-- Phase 91: Gemeinden-Auswahl (Dropdown im Profil bearbeiten)
-- ════════════════════════════════════════════════════════════════════════
-- Gemeinden sind keine eigene Tabelle, sondern die verschiedenen
-- profiles.church_name-Werte (Gruppierung ohne Groß-/Kleinschreibung).
-- Eine neu eingetragene Gemeinde taucht dadurch automatisch in der Liste auf.
-- Nur Profile mit show_church <> false zählen (öffentlich eingetragen),
-- Blocks werden gefiltert. SECURITY DEFINER, weil profiles per RLS nicht
-- für alle lesbar ist. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

create index if not exists profiles_church_name_lower_idx
  on public.profiles (lower(btrim(church_name)))
  where church_name is not null;

create or replace function public.get_churches()
returns table(name text, member_count int, members jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select p.id, p.full_name, p.username, p.avatar_url, btrim(p.church_name) as church,
           lower(btrim(p.church_name)) as k
    from public.profiles p
    where p.church_name is not null and btrim(p.church_name) <> ''
      and p.show_church is not false
      and not public.is_blocked_pair(p.id)
  )
  select (array_agg(church order by church))[1] as name,
         count(*)::int as member_count,
         coalesce(jsonb_agg(jsonb_build_object('full_name', coalesce(full_name, username), 'avatar_url', avatar_url))
                  filter (where rn <= 3), '[]'::jsonb) as members
  from (select c.*, row_number() over (partition by k order by id) as rn from c) x
  group by k
  order by count(*) desc, 1
  limit 500
$$;

create or replace function public.get_church_members(p_name text)
returns table(id uuid, full_name text, username text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.avatar_url
  from public.profiles p
  where lower(btrim(p.church_name)) = lower(btrim(p_name))
    and p.show_church is not false
    and not public.is_blocked_pair(p.id)
  order by p.full_name
  limit 200
$$;

revoke all on function public.get_churches() from public, anon;
grant execute on function public.get_churches() to authenticated;
revoke all on function public.get_church_members(text) from public, anon;
grant execute on function public.get_church_members(text) to authenticated;
