-- ============================================================
-- Phase 16: ON DELETE CASCADE für alle profiles.id Referenzen
-- Stellt sicher dass beim Löschen eines Users alle seine Daten
-- automatisch mitgelöscht werden.
--
-- Führe dieses Script im Supabase SQL Editor aus.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  col_name TEXT;
  fk_sql TEXT;
BEGIN
  -- Iteriere über alle FK-Constraints die auf profiles(id) zeigen
  -- und bei denen confdeltype NICHT 'c' (CASCADE) ist
  FOR r IN
    SELECT
      c.conname                          AS constraint_name,
      c.conrelid::regclass               AS table_name,
      c.confupdtype,
      c.confdeltype,
      a.attname                          AS column_name,
      ns.nspname                         AS schema_name
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid
      AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND c.confdeltype != 'c'   -- 'c' = CASCADE, 'a' = NO ACTION, 'r' = RESTRICT
  LOOP
    RAISE NOTICE 'Fixing: %.% (constraint: %)',
      r.schema_name, r.table_name, r.constraint_name;

    -- Alten Constraint droppen
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      r.schema_name,
      r.table_name::text,
      r.constraint_name
    );

    -- Neuen Constraint mit ON DELETE CASCADE hinzufügen
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE CASCADE',
      r.schema_name,
      r.table_name::text,
      r.constraint_name,
      r.column_name
    );
  END LOOP;

  RAISE NOTICE 'Fertig: Alle profiles.id FK-Constraints haben jetzt ON DELETE CASCADE.';
END $$;

-- ── Zur Kontrolle: Zeige alle FK-Constraints auf profiles.id ──
SELECT
  c.conname                    AS constraint_name,
  c.conrelid::regclass         AS table_name,
  a.attname                    AS column_name,
  CASE c.confdeltype
    WHEN 'c' THEN 'CASCADE ✓'
    WHEN 'a' THEN 'NO ACTION ✗'
    WHEN 'r' THEN 'RESTRICT ✗'
    WHEN 'n' THEN 'SET NULL ✗'
    WHEN 'd' THEN 'SET DEFAULT ✗'
    ELSE c.confdeltype
  END                          AS on_delete
FROM pg_constraint c
JOIN pg_attribute a
  ON a.attrelid = c.conrelid
  AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND c.confrelid = 'public.profiles'::regclass
ORDER BY table_name, column_name;
