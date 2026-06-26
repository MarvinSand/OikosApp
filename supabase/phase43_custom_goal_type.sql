-- ════════════════════════════════════════════════════════════════════════
-- Phase 43: Individueller Gebetsziel-Typ ('custom') erlauben
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent.
-- Ermöglicht frei geschriebene Ziele (goal_type = 'custom').
-- ════════════════════════════════════════════════════════════════════════

alter table public.prayer_goals
  drop constraint if exists prayer_goals_goal_type_check;

alter table public.prayer_goals
  add constraint prayer_goals_goal_type_check
  check (goal_type in ('hours', 'people', 'days', 'custom'));
