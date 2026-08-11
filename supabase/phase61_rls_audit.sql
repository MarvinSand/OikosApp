-- ════════════════════════════════════════════════════════════════════════
-- Phase 61: RLS-Audit vor dem Store-Release
-- ════════════════════════════════════════════════════════════════════════
--
-- Von den 42 Tabellen, die in den Migrationen angelegt werden, hat nur ein
-- Teil ein ausdrückliches `enable row level security`. Das Kernschema
-- (profiles, messages, conversations, friendships, communities …) wurde
-- außerdem im Dashboard angelegt und ist im Repo gar nicht abgebildet –
-- aus den Dateien allein lässt sich der Zustand also nicht beurteilen.
--
-- Ohne RLS ist eine Tabelle für jeden mit dem anon-Key vollständig lesbar.
-- Der anon-Key steckt in jedem ausgelieferten Frontend, ist also öffentlich.
-- Für eine App, die Gebetsanliegen über namentlich genannte Dritte samt
-- ungefährem Standort speichert, wäre das ein gravierendes Datenleck –
-- und ein Verstoß gegen die Datenschutzangaben beider Stores.
--
-- Dieses Skript ist zweistufig und kann gefahrlos mehrfach laufen.

-- ════════════════════════════════════════════════════════════════════════
-- SCHRITT 1 – Diagnose (nur lesend)
-- ════════════════════════════════════════════════════════════════════════
-- Zuerst ausführen und das Ergebnis ansehen. Jede Zeile mit
-- rls_aktiv = false ist eine offene Tabelle.

select
  c.relname                                as tabelle,
  c.relrowsecurity                         as rls_aktiv,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as anzahl_policies,
  case
    when c.relrowsecurity then 'ok'
    when (select count(*) from pg_policies p
           where p.schemaname = 'public' and p.tablename = c.relname) > 0
      then 'GEFAHR: Policies vorhanden, aber wirkungslos – Schritt 2 aktiviert RLS'
    else 'GEFAHR: offen und ohne Policies – Policies von Hand ergänzen!'
  end                                      as bewertung
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relrowsecurity, c.relname;

-- ════════════════════════════════════════════════════════════════════════
-- SCHRITT 2 – RLS dort aktivieren, wo bereits Policies liegen
-- ════════════════════════════════════════════════════════════════════════
-- Bewusst nur für Tabellen, die schon Policies haben: dort war die
-- Absicht offensichtlich, RLS zu nutzen – die Policies liegen bloß
-- schlafend herum, weil das `enable`-Statement fehlt. Das Aktivieren
-- ändert das Verhalten der App also nicht, es setzt nur durch, was
-- ohnehin gemeint war.
--
-- Tabellen OHNE Policies werden absichtlich NICHT angefasst: dort würde
-- ein `enable` sofort jeden Zugriff sperren und die App lahmlegen. Die
-- müssen einzeln durchgesehen und mit passenden Policies versehen werden.

do $$
declare
  r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relrowsecurity = false
       and exists (
         select 1 from pg_policies p
          where p.schemaname = 'public' and p.tablename = c.relname
       )
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    raise notice 'RLS aktiviert: %', r.relname;
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- SCHRITT 3 – Was danach noch offen ist
-- ════════════════════════════════════════════════════════════════════════
-- Diese Abfrage listet die Tabellen, die weder RLS noch Policies haben.
-- Jede davon muss vor der Store-Einreichung von Hand bewertet werden:
-- entweder Policies ergänzen oder – wenn die Tabelle wirklich öffentlich
-- sein soll (z. B. reine Inhaltstabellen wie weekly_impulses) – bewusst
-- so belassen und hier dokumentieren.

select c.relname as tabelle_ohne_schutz
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
  and not exists (
    select 1 from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
  )
order by c.relname;

-- Vorrangig zu prüfen, weil personenbezogen und teils über Dritte:
--   prayer_requests, personal_prayer_requests  – Anliegen über Dritte
--   oikos_places, person_place_connections     – Orte samt Koordinaten
--   profiles                                   – Geburtstag, Gemeinde, Wohnort
--   messages, conversation_members             – private Chats
--   mentor_notes                               – Notizen über Begleitete
--   content_reports, blocked_users             – seit phase59 abgesichert
