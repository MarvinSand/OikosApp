-- ════════════════════════════════════════════════════════════════════════
-- Phase 64: Gemeinden/Hausgemeinden als Community mit Kartenanzeige
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent (mehrfach ausführbar).
--
-- Enthält:
--  1. communities: community_type ('group' | 'gemeinde'), address,
--     latitude/longitude, meeting_info – damit eine Community wahlweise als
--     Hausgemeinde/Gemeinde auf der Weltkarte erscheinen kann.
--  2. community_questions – private Fragen von Nicht-Mitgliedern an eine
--     Gemeinde. Sichtbar für Fragesteller + alle Mitglieder (nicht nur
--     Admins), analog zum Beitrittsanfragen-Muster aus phase58, aber ohne
--     Security-Definer-RPC: jedes Mitglied darf direkt per UPDATE antworten.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. communities: Typ + Standort ───────────────────────────────────────
alter table public.communities
  add column if not exists community_type text not null default 'group',
  add column if not exists address text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists meeting_info text;

alter table public.communities
  drop constraint if exists communities_community_type_check;
alter table public.communities
  add constraint communities_community_type_check
  check (community_type = any (array['group', 'gemeinde']));

-- ── 2. Fragen an die Gemeinde ────────────────────────────────────────────
create table if not exists public.community_questions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  asked_by uuid references public.profiles(id) on delete cascade not null,
  question text not null,
  answer text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  status text not null default 'open' check (status = any (array['open', 'answered'])),
  created_at timestamptz default now()
);

create index if not exists community_questions_community_idx
  on public.community_questions(community_id);

alter table public.community_questions enable row level security;

-- Frage stellen: jeder eingeloggte Nutzer, nur bei öffentlichen Gemeinden.
drop policy if exists "Frage stellen" on public.community_questions;
create policy "Frage stellen" on public.community_questions for insert
  with check (
    asked_by = auth.uid()
    and exists (
      select 1 from public.communities c
      where c.id = community_questions.community_id
        and c.community_type = 'gemeinde' and c.is_public = true
    )
  );

-- Lesen: Fragesteller selbst oder Mitglied der Gemeinde.
drop policy if exists "Fragen lesen" on public.community_questions;
create policy "Fragen lesen" on public.community_questions for select
  using (
    asked_by = auth.uid()
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = community_questions.community_id and cm.user_id = auth.uid()
    )
  );

-- Beantworten: jedes Mitglied der Gemeinde (nicht nur Admins).
drop policy if exists "Frage beantworten" on public.community_questions;
create policy "Frage beantworten" on public.community_questions for update
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = community_questions.community_id and cm.user_id = auth.uid()
    )
  );
