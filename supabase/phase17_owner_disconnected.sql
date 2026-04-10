-- ============================================================
-- Phase 17: owner_disconnected Spalte für oikos_people
-- Speichert ob der Map-Besitzer aus den Verbindungen entfernt wurde.
-- ============================================================

ALTER TABLE public.oikos_people
  ADD COLUMN IF NOT EXISTS owner_disconnected boolean NOT NULL DEFAULT false;
