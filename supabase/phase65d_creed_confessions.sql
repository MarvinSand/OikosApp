-- ============================================================
-- Phase 65d: Jüngerschafts-Tab – Bekenntnis-Zähler ("wie oft bekannt")
-- ============================================================
-- Ein Abhak-Feld pro Bekenntnis (eigene, offizielle und übernommene
-- öffentliche), das zählt, wie oft der Nutzer dieses Bekenntnis
-- bekannt hat. Reiner Client-Zähler pro Nutzer/Bekenntnis - kein
-- Tages-Limit, jeder Tap erhöht den Zähler um 1.

create table if not exists public.creed_confessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete cascade not null,
  creed_id          uuid references public.creeds(id) on delete cascade not null,
  count             integer not null default 0,
  last_confessed_at timestamptz,
  created_at        timestamptz default now(),
  unique(user_id, creed_id)
);

alter table public.creed_confessions enable row level security;

drop policy if exists "Own creed confessions" on public.creed_confessions;
create policy "Own creed confessions" on public.creed_confessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists creed_confessions_user_idx on public.creed_confessions (user_id);
