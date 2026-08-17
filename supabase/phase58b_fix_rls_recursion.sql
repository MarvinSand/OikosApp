-- Phase 58b: Fix "infinite recursion detected in policy for relation
-- community_members" (42P17) introduced by phase58_community_admin.sql.
--
-- Ursache: Die neue INSERT-WITH-CHECK-Policy "Offener Beitritt" auf
-- community_members liest (via WITH CHECK) aus communities. Die SELECT-
-- Policies auf communities lasen ihrerseits direkt aus community_members
-- (EXISTS-Subquery). Damit wurde community_members' RLS mitten in der
-- eigenen INSERT-Prüfung erneut betreten -> Postgres bricht mit 42P17 ab,
-- auch wenn es keine echte Endlosschleife ist (Selbstbezug derselben
-- Relation reicht für den Fehler).
--
-- Fix: communities-SELECT-Policies über die bereits vorhandene
-- SECURITY-DEFINER-Funktion get_my_community_ids() lesen lassen (bypasst
-- RLS auf community_members) statt direkt aus community_members zu lesen.
-- Zusätzlich werden doppelte, aus früheren Phasen übrig gebliebene
-- Policies entfernt (waren Subsets der jetzt gültigen Policies).

-- communities: drei überlappende SELECT-Policies -> eine einzige, die
-- nicht mehr direkt auf community_members zugreift.
drop policy if exists "Community lesen" on public.communities;
drop policy if exists "Communities lesen (Mitglieder)" on public.communities;
drop policy if exists "public communities visible" on public.communities;

create policy "Communities lesen"
  on public.communities for select
  using (
    is_public = true
    or id in (select get_my_community_ids())
  );

-- community_members: alte, redundante Policies entfernen (die neuen
-- "(Admin)"-Varianten decken dieselben Fälle bereits ab).
drop policy if exists "Mitglied entfernen" on public.community_members;
drop policy if exists "Rolle ändern" on public.community_members;
