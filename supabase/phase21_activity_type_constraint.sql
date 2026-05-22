-- ============================================================
-- Phase 21: 'activity' als gültigen conversations.type zulassen
-- Bugfix zu phase20: create_activity_chat / join_activity_chat
-- scheiterten an conversations_type_check, weil 'activity'
-- nicht in der CHECK-Liste war (phase14 hatte nur direct/
-- community/discipleship erlaubt).
-- Einfach EINMAL im Supabase SQL Editor ausführen.
-- Ist idempotent (kann mehrfach ausgeführt werden).
-- ============================================================

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_type_check;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_type_check
  CHECK (type IN ('direct', 'community', 'discipleship', 'activity'));

-- Verifikation:
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'conversations_type_check';
