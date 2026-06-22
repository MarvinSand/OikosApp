-- ════════════════════════════════════════════════════════════════════════
-- Phase 41: prayer_requests RLS härten (Map-Anliegen lassen sich nicht speichern)
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent (mehrfach ausführbar).
--
-- Behebt:
--  In der Oikos-Map wird ein neu erstelltes Gebetsanliegen für eine Person kurz
--  angezeigt und verschwindet dann wieder. Ursache: RLS ist auf prayer_requests
--  aktiviert, aber die INSERT-Berechtigung greift nicht zuverlässig (die
--  bestehende "for all"-Policy deckte INSERT nicht in jedem DB-Stand ab).
--  → Insert wird abgelehnt, der optimistische Eintrag wird wieder entfernt.
--
--  Hier werden die Policies sauber als getrennte SELECT/INSERT/UPDATE/DELETE
--  neu gesetzt. personal_prayer_requests (Feed) ist davon unberührt.
-- ════════════════════════════════════════════════════════════════════════

alter table public.prayer_requests enable row level security;

-- Alte (kombinierte / evtl. unvollständige) Policies entfernen
drop policy if exists "Own prayer_requests write" on public.prayer_requests;
drop policy if exists "Read prayer_requests" on public.prayer_requests;
drop policy if exists "Insert own prayer_requests" on public.prayer_requests;
drop policy if exists "Update own prayer_requests" on public.prayer_requests;
drop policy if exists "Delete own prayer_requests" on public.prayer_requests;

-- Lesen: eigene Anliegen oder öffentliche
create policy "Read prayer_requests" on public.prayer_requests for select
  using (owner_id = auth.uid() or is_public = true);

-- Einfügen: nur als eigener Owner
create policy "Insert own prayer_requests" on public.prayer_requests for insert
  with check (owner_id = auth.uid());

-- Ändern: nur eigene
create policy "Update own prayer_requests" on public.prayer_requests for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Löschen: nur eigene
create policy "Delete own prayer_requests" on public.prayer_requests for delete
  using (owner_id = auth.uid());
