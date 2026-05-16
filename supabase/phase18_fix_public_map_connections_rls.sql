-- ============================================================
-- Phase 18: RLS-Fix für oikos_connections und oikos_people
-- Erlaubt das Lesen von Verbindungen und Personen bei
-- geteilten (nicht-privaten) Maps.
--
-- Problem: Besucher einer öffentlich geteilten Map konnten
-- zwar die Personen-Knoten sehen, aber nicht die oikos_connections
-- lesen → sekundäre Personen erschienen ohne Verbindungslinien.
--
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── oikos_connections ─────────────────────────────────────────

-- Erlaube Lesen für nicht-private Maps (Besucher & Besitzer)
DROP POLICY IF EXISTS "Shared map connections readable" ON public.oikos_connections;
CREATE POLICY "Shared map connections readable"
  ON public.oikos_connections FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.oikos_maps m
      WHERE m.id = oikos_connections.map_id
        AND (
          m.user_id = auth.uid()
          OR m.visibility IN ('all_siblings', 'specific_include', 'specific_exclude', 'community')
        )
    )
  );

-- ── oikos_people ──────────────────────────────────────────────

-- Erlaube Lesen für nicht-private Maps (Besucher & Besitzer)
-- (Safety-Net falls diese Policy fehlt oder zu restriktiv ist)
DROP POLICY IF EXISTS "Shared map people readable" ON public.oikos_people;
CREATE POLICY "Shared map people readable"
  ON public.oikos_people FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.oikos_maps m
      WHERE m.id = oikos_people.map_id
        AND (
          m.user_id = auth.uid()
          OR m.visibility IN ('all_siblings', 'specific_include', 'specific_exclude', 'community')
        )
    )
  );
