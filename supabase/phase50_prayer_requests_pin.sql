-- Phase 50: Pin-Funktion für Gebetsanliegen
--
-- Ergänzt is_pinned auf prayer_requests, damit Anliegen oben angepinnt
-- werden können (gleiche Konvention wie is_pinned bei Chat-Nachrichten
-- und Community-Posts).
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
