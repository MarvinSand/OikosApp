-- Phase 52: RLS-Fix für person_place_connections bei geteilten Maps
--
-- Problem: Beim Ansehen der Oikos-Map eines Geschwisters wurden die Orte
-- selbst zwar (dank is_public=true auf oikos_places) sichtbar, die
-- Verbindungslinien zwischen Personen und Orten aber nicht — die einzige
-- Policy auf person_place_connections erlaubt Lesen/Schreiben nur dem
-- Besitzer des Ortes. Analog zu phase18_fix_public_map_connections_rls.sql
-- (das dasselbe Problem für oikos_connections/oikos_people gelöst hat).
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

DROP POLICY IF EXISTS "Shared map place connections readable" ON public.person_place_connections;
CREATE POLICY "Shared map place connections readable"
  ON public.person_place_connections FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.oikos_places pl
      JOIN public.oikos_maps m ON m.id = pl.map_id
      WHERE pl.id = person_place_connections.place_id
        AND (
          m.user_id = auth.uid()
          OR m.visibility IN ('all_siblings', 'specific_include', 'specific_exclude', 'community')
        )
    )
  );

NOTIFY pgrst, 'reload schema';
