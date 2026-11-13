-- Phase 97: "infinite recursion detected in policy for relation community_members"
-- Die DELETE-/UPDATE-Policies fragten community_members in einer Unterabfrage auf
-- sich selbst ab → jedes Verlassen/jede Rollenänderung endete mit HTTP 500.
-- Jetzt über die SECURITY-DEFINER-Funktion is_community_admin(). Idempotent.
drop policy if exists "Mitglied entfernen (Admin oder selbst)" on public.community_members;
create policy "Mitglied entfernen (Admin oder selbst)" on public.community_members for delete
  using (user_id = (select auth.uid()) or public.is_community_admin(community_id));

drop policy if exists "Rolle ändern (Admin)" on public.community_members;
create policy "Rolle ändern (Admin)" on public.community_members for update
  using (public.is_community_admin(community_id));
