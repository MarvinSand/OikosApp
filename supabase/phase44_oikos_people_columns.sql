-- Phase 44: Fehlende oikos_people-Spalten nachziehen
--
-- Problem: Das Frontend schreibt Spalten, die nie als Migration eingecheckt
-- wurden (Basis-Schema entstand außerhalb des Repos). Dadurch schlägt z.B.
-- das Speichern der Generationen-Overlay-Einstellungen komplett fehl:
-- "Einstellung konnte nicht gespeichert werden".
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

-- Generationen-Overlay (Oikos-Map einer verknüpften Person einblenden)
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS overlay_map_ids uuid[] DEFAULT '{}';
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS overlay_show_christian boolean DEFAULT true;
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS overlay_show_non_christian boolean DEFAULT true;

-- Defensiv: weitere vom Frontend genutzte Spalten, die in keiner
-- eingecheckten Migration stehen (no-op, falls bereits vorhanden)
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS is_secondary boolean DEFAULT false;
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS circle_color text;
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS name_color text;
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS center_line_color text;
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS pos_x double precision;
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS pos_y double precision;
ALTER TABLE oikos_people ADD COLUMN IF NOT EXISTS linked_user_id uuid;

-- Schema-Cache von PostgREST auffrischen, damit die neuen Spalten sofort
-- ohne Neustart sichtbar sind
NOTIFY pgrst, 'reload schema';
