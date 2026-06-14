-- Phase 27: Profile Redesign – Visibility Toggles & Bio
-- Adds per-field visibility flags and a separate bio_text column.

alter table public.profiles
  add column if not exists show_city boolean default true,
  add column if not exists show_church boolean default true,
  add column if not exists bio_text text,
  add column if not exists show_bio boolean default true;

-- Backfill existing rows so toggles default to public
update public.profiles set show_city = true where show_city is null;
update public.profiles set show_church = true where show_church is null;
update public.profiles set show_bio = true where show_bio is null;
