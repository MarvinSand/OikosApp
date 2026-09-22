-- ============================================================
-- Phase 66: RLS-InitPlan-Nachzügler (community_questions, bible_saved_colors)
-- ============================================================
-- Beide Tabellen kamen nach phase62_rls_performance_initplan.sql dazu und
-- rufen auth.uid() noch nackt auf. Postgres wertet den Aufruf dort pro
-- geprüfter Zeile neu aus, statt ihn einmal pro Query zu cachen (InitPlan).
-- Siehe CLAUDE.md: jede Policy mit (select auth.uid()) schreiben.
-- Idempotent – kann mehrfach ausgeführt werden.

drop policy if exists "Own saved colors" on public.bible_saved_colors;
create policy "Own saved colors" on public.bible_saved_colors
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Fragen lesen" on public.community_questions;
create policy "Fragen lesen" on public.community_questions
  for select
  using (
    asked_by = (select auth.uid())
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = community_questions.community_id
        and cm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Frage stellen" on public.community_questions;
create policy "Frage stellen" on public.community_questions
  for insert
  with check (
    asked_by = (select auth.uid())
    and exists (
      select 1 from public.communities c
      where c.id = community_questions.community_id
        and c.community_type = 'gemeinde'
        and c.is_public = true
    )
  );

drop policy if exists "Frage beantworten" on public.community_questions;
create policy "Frage beantworten" on public.community_questions
  for update
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = community_questions.community_id
        and cm.user_id = (select auth.uid())
    )
  );
