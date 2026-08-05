-- Phase 52: Wiederkehrende Events auf der Weltkarte (täglich/wöchentlich/
-- monatlich/jährlich, flexibles Intervall, optionale Wochentage & Enddatum).
--
-- Es werden KEINE einzelnen Termine als eigene Zeilen materialisiert – die
-- Anker-Zeit steht weiterhin in starts_at/ends_at, der jeweils nächste
-- Termin wird im Frontend berechnet (src/lib/recurrence.js).

alter table public.world_map_activities
add column if not exists recurrence_freq text
  check (recurrence_freq in ('daily', 'weekly', 'monthly', 'yearly')),
add column if not exists recurrence_interval integer default 1,
add column if not exists recurrence_weekdays smallint[],
add column if not exists recurrence_end_date date;

comment on column public.world_map_activities.recurrence_freq is
  'null = einmaliges Event, sonst daily/weekly/monthly/yearly';
comment on column public.world_map_activities.recurrence_interval is
  'Schrittweite, z.B. 2 = alle 2 Wochen/Monate/...';
comment on column public.world_map_activities.recurrence_weekdays is
  'Nur bei weekly: Wochentage als 0=So..6=Sa; leer = Wochentag von starts_at';
comment on column public.world_map_activities.recurrence_end_date is
  'Optionales Enddatum der Serie; null = wiederholt sich unbegrenzt';
