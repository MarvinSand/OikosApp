-- ════════════════════════════════════════════════════════════════════════
-- Phase 42: Sicherheitsnetz – alle Spalten für personal_prayer_requests
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent (mehrfach ausführbar).
--
-- Hintergrund: Fehlt eine Spalte aus dem insert()-Payload in der DB, schlägt
-- das GESAMTE Insert fehl ("Could not find the 'X' column ... in the schema
-- cache") -> das Gebet wird nicht gepostet. Diese Migration stellt sicher,
-- dass alle von createRequest() genutzten Spalten existieren.
-- ════════════════════════════════════════════════════════════════════════

alter table public.personal_prayer_requests
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists category text default null,
  add column if not exists visibility text default 'private',
  add column if not exists visibility_user_ids uuid[] default '{}',
  add column if not exists visibility_community_id uuid references public.communities(id) on delete set null,
  add column if not exists is_answered boolean default false;
