-- Phase 17b: Adress-Autocomplete & Standort-Präzision

alter table public.profiles
add column if not exists address_full text,
add column if not exists address_street text,
add column if not exists address_district text,
add column if not exists location_precision text default 'city'
  check (location_precision in ('exact', 'district', 'city'));
