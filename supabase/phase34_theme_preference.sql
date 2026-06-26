-- Phase 34: Persist the user's theme preference (light/dark) in their account
-- so it survives re-login and syncs across devices.
-- Idempotent: safe to run multiple times.

alter table public.profiles
  add column if not exists theme_preference text default null;
