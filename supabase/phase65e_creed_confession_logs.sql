-- ============================================================
-- Phase 65e: Jüngerschafts-Tab – Bekenntnis-Verlauf (einzelne Zeitpunkte)
-- ============================================================
-- Ergänzt creed_confessions (phase65d, laufender Zähler) um eine
-- Log-Tabelle mit einer Zeile pro Abhaken - für das kleine Dropdown
-- hinter dem Abhak-Kästchen, das anzeigt, wann genau bekannt wurde.

create table if not exists public.creed_confession_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  creed_id     uuid references public.creeds(id) on delete cascade not null,
  confessed_at timestamptz not null default now()
);

alter table public.creed_confession_logs enable row level security;

drop policy if exists "Own confession logs" on public.creed_confession_logs;
create policy "Own confession logs" on public.creed_confession_logs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists creed_confession_logs_lookup_idx
  on public.creed_confession_logs (user_id, creed_id, confessed_at desc);
