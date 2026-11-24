-- ============================================================
-- Phase 97: Mitgliederliste öffentlicher Communities für Nicht-Mitglieder
-- ============================================================
-- Wer eine öffentliche Community per QR-Code/„Entdecken“ öffnet, sieht Bio und
-- Mitglieder, aber (noch) keinen Chat. RLS verbirgt Nicht-Mitgliedern die
-- community_members-Zeilen, daher SECURITY-DEFINER-RPC. Nur für öffentliche
-- oder eigene Communities; blockierte Nutzer werden ausgeblendet.
-- Idempotent.

create or replace function public.get_community_members_public(p_community_id uuid)
returns table (id uuid, user_id uuid, role text, joined_at timestamptz,
               username text, full_name text, avatar_url text, is_christian boolean, bio text)
language sql
stable
security definer
set search_path = public
as $$
  select cm.id, cm.user_id, cm.role, cm.joined_at,
         p.username, p.full_name, p.avatar_url, p.is_christian, p.bio
  from public.community_members cm
  join public.communities c on c.id = cm.community_id
  join public.profiles p on p.id = cm.user_id
  where cm.community_id = p_community_id
    and (c.is_public = true or cm.community_id in (select get_my_community_ids()))
    and not public.is_blocked_pair(cm.user_id)
  order by cm.joined_at
$$;

revoke all on function public.get_community_members_public(uuid) from public, anon;
grant execute on function public.get_community_members_public(uuid) to authenticated;
