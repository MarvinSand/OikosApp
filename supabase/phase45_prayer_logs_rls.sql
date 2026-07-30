-- Phase 45: RLS für prayer_logs nachziehen
--
-- Problem: prayer_logs (Gebets-Log für Anliegen einer Oikos-Person) hat in
-- keiner eingecheckten Migration eine RLS-Policy erhalten. Ohne eine
-- SELECT-Policy, die auch fremde Logs sichtbar macht, würden neue
-- Aggregat-Statistiken (z.B. "wie oft haben ALLE zusammen gebetet") nur die
-- eigenen Gebete zählen.
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

alter table public.prayer_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Read prayer_logs' and tablename = 'prayer_logs') then
    create policy "Read prayer_logs" on public.prayer_logs for select
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Insert own prayer_logs' and tablename = 'prayer_logs') then
    create policy "Insert own prayer_logs" on public.prayer_logs for insert
      with check (user_id = auth.uid());
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
