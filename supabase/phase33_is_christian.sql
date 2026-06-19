-- Phase 33: is_christian flag on profiles
alter table public.profiles
  add column if not exists is_christian boolean default null;
