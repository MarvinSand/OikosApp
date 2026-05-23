-- ============================================================
-- Phase 23: Fehlende Basis-Profil-Spalten city + country
-- Idempotent – kann mehrfach ausgeführt werden.
-- ============================================================

alter table public.profiles
  add column if not exists city    text,
  add column if not exists country text;
