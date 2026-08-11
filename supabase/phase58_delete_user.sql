-- ════════════════════════════════════════════════════════════════════════
-- Phase 58: Konto wirklich löschen (Apple Guideline 5.1.1(v), Art. 17 DSGVO)
-- ════════════════════════════════════════════════════════════════════════
--
-- Das Frontend rief seit jeher `supabase.rpc('delete_user')` auf – die
-- Funktion existierte nie. `rpc()` wirft nicht, sondern liefert { error },
-- also lief der Aufruf still ins Leere und der Nutzer wurde nur ausgeloggt.
-- Das Konto blieb samt aller Daten bestehen.
--
-- Diese Migration ist idempotent und kann mehrfach ausgeführt werden.

-- ── 1. profiles.id → auth.users(id) muss CASCADE sein ───────────────────
-- Sonst blockiert der Constraint das Löschen in auth.users.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.profiles'::regclass
      AND c.confrelid = 'auth.users'::regclass
      AND c.confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
    EXECUTE format(
      'ALTER TABLE public.profiles ADD CONSTRAINT %I FOREIGN KEY (%I) '
      'REFERENCES auth.users(id) ON DELETE CASCADE',
      r.conname, r.column_name
    );
    RAISE NOTICE 'profiles.% → auth.users(id) auf ON DELETE CASCADE gesetzt', r.column_name;
  END LOOP;
END $$;

-- ── 2. Alle FKs auf profiles(id) erneut auf CASCADE ziehen ──────────────
-- Wiederholung von phase16_cascade_delete.sql, damit seither hinzugekommene
-- Tabellen (Feed, Communities, Gebete, Discipleship …) mit erfasst werden.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      c.conname            AS constraint_name,
      cl.relname           AS table_name,
      ns.nspname           AS schema_name,
      a.attname            AS column_name
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND c.confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.schema_name, r.table_name, r.constraint_name);
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) '
      'REFERENCES public.profiles(id) ON DELETE CASCADE',
      r.schema_name, r.table_name, r.constraint_name, r.column_name
    );
    RAISE NOTICE 'Cascade ergänzt: %.%(%)', r.schema_name, r.table_name, r.column_name;
  END LOOP;
END $$;

-- ── 3. Die Löschfunktion ────────────────────────────────────────────────
-- Bewusst OHNE Parameter: die Ziel-ID kommt ausschließlich aus auth.uid().
-- Ein Parameter würde bedeuten, dass jeder Angemeldete jeden löschen kann.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nicht angemeldet';
  end if;

  -- Storage zuerst: an storage.objects hängt kein FK auf profiles, die
  -- Dateien würden sonst als Waisen im Bucket zurückbleiben.
  --   avatars:      <user_id>/avatar.jpg
  --   feed-photos:  <user_id>/<ts>.jpg
  --   chat-photos:  <conversation_id>/<user_id>/<ts>.<ext>
  delete from storage.objects
   where bucket_id in ('avatars', 'feed-photos')
     and (storage.foldername(name))[1] = uid::text;

  delete from storage.objects
   where bucket_id = 'chat-photos'
     and (storage.foldername(name))[2] = uid::text;

  -- Der Rest hängt per ON DELETE CASCADE an profiles bzw. an auth.users.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;

comment on function public.delete_user() is
  'Löscht das Konto des aufrufenden Nutzers samt aller Daten und Dateien. '
  'Pflicht nach Apple Guideline 5.1.1(v) und Art. 17 DSGVO.';

-- ── 4. Kontrolle ────────────────────────────────────────────────────────
-- Nach dem Ausführen sollte diese Abfrage KEINE Zeile mehr liefern:
select
  cl.relname   as tabelle,
  a.attname    as spalte,
  c.confdeltype as on_delete
from pg_constraint c
join pg_class cl on cl.oid = c.conrelid
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
where c.contype = 'f'
  and c.confrelid = 'public.profiles'::regclass
  and c.confdeltype <> 'c';
