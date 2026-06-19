-- Phase 32: Standort-Freigabe (Ansicht & Datenschutz Einstellungen)

alter table public.profiles
  add column if not exists allow_location boolean default true;
