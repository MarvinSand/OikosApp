-- Phase 62: RLS-Performance – auth.uid() als InitPlan statt Per-Zeile-Aufruf
--
-- Supabase Performance Advisor meldete 152x "auth_rls_initplan": praktisch
-- jede RLS-Policy im Projekt rief auth.uid() direkt in USING/WITH CHECK auf.
-- Postgres wertet einen direkten Funktionsaufruf dort für JEDE geprüfte Zeile
-- neu aus, statt ihn einmal pro Query zu berechnen. Bei ~15-25 Supabase-
-- Abfragen pro Seitenaufbau (Home, WorldMap, Prayers, FriendsView, ...)
-- betraf das praktisch jede Tabelle, die die App beim Start oder beim
-- Navigieren anfasst (profiles, friendships, notifications, conversations,
-- messages, community_members, prayer_goals, personal_prayer_requests, ...)
-- und war ein Haupttreiber für die langsamen ersten Ladezeiten.
--
-- Fix: auth.uid() durch (select auth.uid()) ersetzen. Der SELECT-Wrapper
-- lässt Postgres den Wert als InitPlan cachen – einmal pro Query statt
-- einmal pro Zeile. Siehe:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Angewendet über alle Policies in public UND storage (Avatar-/Community-
-- Bild-Uploads), per dynamischem Loop statt manuell abgetippter Statements,
-- damit kein Policy-Text beim Übertragen verändert wird.
DO $$
DECLARE
  r RECORD;
  new_using text;
  new_check text;
  stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
      AND (qual NOT LIKE '%SELECT auth.uid()%' OR with_check NOT LIKE '%SELECT auth.uid()%')
  LOOP
    stmt := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF r.qual IS NOT NULL THEN
      new_using := replace(r.qual, 'auth.uid()', '(select auth.uid())');
      stmt := stmt || format(' USING (%s)', new_using);
    END IF;
    IF r.with_check IS NOT NULL THEN
      new_check := replace(r.with_check, 'auth.uid()', '(select auth.uid())');
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- Doppelte Policies aus früheren Migrationsphasen, die nie aufgeräumt
-- wurden: jede zusätzliche permissive Policy für dieselbe Aktion zwingt
-- Postgres, ALLE davon für jede Zeile auszuwerten (Advisor:
-- multiple_permissive_policies, 225 Fundstellen). Hier sind es exakte
-- funktionale Duplikate.
DROP POLICY IF EXISTS "select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "own prefs" ON public.notification_preferences;

-- profiles: "Profile öffentlich lesen" (qual = true) deckt bereits jeden
-- eingeloggten Leser ab, macht die engere "Alle eingeloggten..."-Policy für
-- SELECT komplett redundant.
DROP POLICY IF EXISTS "Alle eingeloggten Nutzer können Profile lesen" ON public.profiles;
