-- Phase 30: Gebets-Kategorie für personal_prayer_requests (Gebet-Paul feature)

alter table public.personal_prayer_requests
  add column if not exists category text default null;
