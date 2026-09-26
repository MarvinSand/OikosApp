-- Phase 73: Ersteller eines Gebetsziels in der my_prayer_goals-View
-- mitliefern, damit die Karte auf Home zeigen kann, wer und wann ein
-- Gebetsziel gepostet hat, ohne eine zusätzliche Anfrage.
-- Idempotent: kann mehrfach ausgeführt werden.

-- CREATE OR REPLACE VIEW kann Spalten nicht neu einfügen/umsortieren
-- (Postgres-Fehler 42P16 "cannot change name of view column"), deshalb hier
-- droppen und neu anlegen. Keine abhängigen Objekte (geprüft via pg_depend).
drop view if exists public.my_prayer_goals;

create view public.my_prayer_goals
with (security_invoker = true) as
select
  g.*,
  jsonb_build_object(
    'id', p.id, 'full_name', p.full_name, 'username', p.username,
    'avatar_url', p.avatar_url, 'is_christian', p.is_christian, 'gender', p.gender
  ) as author,
  case
    when g.created_by = auth.uid() then 'mine'
    when g.visibility = 'public' then 'public'
    when g.visibility = 'community' then 'community'
    else 'shared'
  end as bucket
from public.prayer_goals g
left join public.profiles p on p.id = g.created_by;

grant select on public.my_prayer_goals to authenticated;
