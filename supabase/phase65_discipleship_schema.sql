-- ============================================================
-- Phase 65: Jüngerschafts-Tab – Schema (Weg, Werkzeuge, Bibliothek,
-- Bekenntnis, Challenges)
-- Run this in the Supabase SQL Editor. NICHT automatisch ausgeführt –
-- erst zur Review vorgelegt (siehe Master-Prompt).
-- ============================================================
-- Ersetzt NICHT die alten, nie verdrahteten Tabellen aus Phase 13/14
-- (discipleship_pairs/discipleship_content/discipleship_progress/
-- course_modules/course_lessons/...) – die bleiben unangetastet liegen,
-- werden aber von diesem neuen Modell nicht mehr verwendet.
--
-- Konventionen aus CLAUDE.md:
--  - (select auth.uid()) statt nacktem auth.uid() in RLS (InitPlan-Perf.)
--  - kein select('*') im Client, alle FKs mit ON DELETE CASCADE
--  - Index auf jede neue FK-Spalte, die im Client gefiltert wird

-- ─── 1. Stationen ──────────────────────────────────────────────────────
create table if not exists public.discipleship_stations (
  id               uuid primary key default gen_random_uuid(),
  order_index      integer not null unique,
  slug             text not null unique,
  title            text not null,
  bible_reference  text not null,
  bible_book       text not null,
  bible_chapter    integer not null,
  bible_verse_start integer not null,
  bible_verse_end   integer not null,
  content_head     jsonb not null default '{}'::jsonb,
  content_heart    jsonb not null default '{}'::jsonb,
  content_hand     jsonb not null default '{}'::jsonb,
  extra_content    jsonb,
  created_at       timestamptz default now()
);

-- ─── 2. Fortschritt pro Nutzer ─────────────────────────────────────────
-- Heißt bewusst NICHT "user_station_progress": dieser Name existiert in der
-- DB bereits (0 Zeilen, kein Code im Repo nutzt es) als Teil eines anderen,
-- nirgends im Repo dokumentierten Jüngerschafts-Anlaufs (stages/stations/
-- user_discipleship_profile/bible_plans/...), dessen station_id auf
-- public.stations statt public.discipleship_stations zeigt. "create table
-- if not exists" hätte dort still nichts getan und Schreibzugriffe wären an
-- einem falschen Fremdschlüssel gescheitert.
create table if not exists public.discipleship_station_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  station_id   uuid references public.discipleship_stations(id) on delete cascade not null,
  status       text not null default 'active' check (status in ('active', 'completed')),
  completed_at timestamptz,
  created_at   timestamptz default now(),
  unique(user_id, station_id)
);

-- ─── 3. Reflexionsantworten (Herz-Abschnitt) ───────────────────────────
create table if not exists public.station_reflections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  station_id uuid references public.discipleship_stations(id) on delete cascade not null,
  prompt_key text not null,
  body       text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, station_id, prompt_key)
);

-- ─── 4. Challenges ──────────────────────────────────────────────────────
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  station_id  uuid references public.discipleship_stations(id) on delete cascade,
  created_by  uuid references public.profiles(id) on delete cascade,
  is_official boolean not null default false,
  type        text not null check (type in ('personal', 'social')),
  title       text not null,
  description text not null default '',
  goal_type   text not null check (goal_type in ('days', 'count', 'once')),
  goal_value  integer,
  created_at  timestamptz default now()
);

-- ─── 5. Teilnahme an Challenges ─────────────────────────────────────────
create table if not exists public.challenge_participants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  challenge_id   uuid references public.challenges(id) on delete cascade not null,
  status         text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  progress_value integer not null default 0,
  reflection     text,
  started_at     timestamptz default now(),
  completed_at   timestamptz,
  unique(user_id, challenge_id)
);

-- ─── 6. Werkzeuge ───────────────────────────────────────────────────────
create table if not exists public.tools (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text not null default '',
  image_path  text,
  steps       jsonb not null default '[]'::jsonb,
  order_index integer not null default 0
);

-- ─── 7. Bibliothek ──────────────────────────────────────────────────────
create table if not exists public.library_entries (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('bibelstudium', 'verssammlung', 'artikel')),
  title           text not null,
  bible_reference text,
  tags            text[] not null default '{}',
  body            jsonb not null default '{}'::jsonb,
  station_id      uuid references public.discipleship_stations(id) on delete set null,
  created_at      timestamptz default now()
);

-- ─── 8. Bekenntnisse ────────────────────────────────────────────────────
create table if not exists public.creeds (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  title           text not null,
  visibility      text not null default 'private' check (visibility in ('private', 'public')),
  source_creed_id uuid references public.creeds(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.creed_lines (
  id              uuid primary key default gen_random_uuid(),
  creed_id        uuid references public.creeds(id) on delete cascade not null,
  order_index     integer not null default 0,
  body            text not null,
  bible_reference text
);

-- ─── 9. Content-Reports (Apple-Anforderung, wiederverwendbar) ──────────
create table if not exists public.content_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.profiles(id) on delete cascade not null,
  content_type text not null,
  content_id   uuid not null,
  reason       text not null default '',
  created_at   timestamptz default now()
);

-- ─── 10. Bibeltext-Cache für die Stationen (Server-Cache, kein
--         erneuter API-Call bei Cache-Treffer) ────────────────────────
create table if not exists public.bible_verses_cache (
  id          uuid primary key default gen_random_uuid(),
  bible_id    text not null,
  book        text not null,
  chapter     integer not null,
  verse_start integer,
  verse_end   integer,
  html        text not null,
  created_at  timestamptz default now(),
  unique(bible_id, book, chapter, verse_start, verse_end)
);

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table public.discipleship_stations   enable row level security;
alter table public.discipleship_station_progress   enable row level security;
alter table public.station_reflections     enable row level security;
alter table public.challenges              enable row level security;
alter table public.challenge_participants  enable row level security;
alter table public.tools                   enable row level security;
alter table public.library_entries         enable row level security;
alter table public.creeds                  enable row level security;
alter table public.creed_lines             enable row level security;
alter table public.content_reports         enable row level security;
alter table public.bible_verses_cache      enable row level security;

drop policy if exists "Read stations" on public.discipleship_stations;
create policy "Read stations" on public.discipleship_stations
  for select using ((select auth.uid()) is not null);

drop policy if exists "Own station progress" on public.discipleship_station_progress;
create policy "Own station progress" on public.discipleship_station_progress
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own reflections" on public.station_reflections;
create policy "Own reflections" on public.station_reflections
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Read challenges" on public.challenges;
create policy "Read challenges" on public.challenges
  for select using (is_official = true or (select auth.uid()) is not null);

drop policy if exists "Create own challenges" on public.challenges;
create policy "Create own challenges" on public.challenges
  for insert with check (created_by = (select auth.uid()) and is_official = false);

drop policy if exists "Change own challenges" on public.challenges;
create policy "Change own challenges" on public.challenges
  for update using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

drop policy if exists "Delete own challenges" on public.challenges;
create policy "Delete own challenges" on public.challenges
  for delete using (created_by = (select auth.uid()));

drop policy if exists "Own challenge participation" on public.challenge_participants;
create policy "Own challenge participation" on public.challenge_participants
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Andere aktive Teilnehmer derselben Challenge sind sichtbar, aber nur für
-- Nutzer, die selbst an dieser Challenge teilnehmen (nicht für alle).
drop policy if exists "Co-participants of active challenges" on public.challenge_participants;
create policy "Co-participants of active challenges" on public.challenge_participants
  for select using (
    status = 'active'
    and exists (
      select 1 from public.challenge_participants cp
      where cp.challenge_id = challenge_participants.challenge_id
        and cp.user_id = (select auth.uid())
    )
  );

drop policy if exists "Read tools" on public.tools;
create policy "Read tools" on public.tools
  for select using ((select auth.uid()) is not null);

drop policy if exists "Read library" on public.library_entries;
create policy "Read library" on public.library_entries
  for select using ((select auth.uid()) is not null);

drop policy if exists "Own creeds" on public.creeds;
create policy "Own creeds" on public.creeds
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Read public creeds" on public.creeds;
create policy "Read public creeds" on public.creeds
  for select using (visibility = 'public' or user_id is null);

drop policy if exists "Read creed lines" on public.creed_lines;
create policy "Read creed lines" on public.creed_lines
  for select using (
    exists (
      select 1 from public.creeds c
      where c.id = creed_lines.creed_id
        and (c.user_id = (select auth.uid()) or c.visibility = 'public' or c.user_id is null)
    )
  );

drop policy if exists "Write own creed lines" on public.creed_lines;
create policy "Write own creed lines" on public.creed_lines
  for all using (
    exists (select 1 from public.creeds c where c.id = creed_lines.creed_id and c.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.creeds c where c.id = creed_lines.creed_id and c.user_id = (select auth.uid()))
  );

drop policy if exists "Insert own reports" on public.content_reports;
create policy "Insert own reports" on public.content_reports
  for insert with check (reporter_id = (select auth.uid()));

drop policy if exists "Read bible cache" on public.bible_verses_cache;
create policy "Read bible cache" on public.bible_verses_cache
  for select using ((select auth.uid()) is not null);

drop policy if exists "Write bible cache" on public.bible_verses_cache;
create policy "Write bible cache" on public.bible_verses_cache
  for insert with check ((select auth.uid()) is not null);

-- Schmale, nach außen sichtbare Sicht auf Challenge-Teilnehmer (nur
-- user_id/status) – die App fragt für Teilnehmerlisten diese View ab statt
-- der Basistabelle, die Sichtbarkeitslogik selbst steckt in der RLS-Policy
-- der Basistabelle oben.
create or replace view public.challenge_participants_public
  with (security_invoker = true) as
  select id, challenge_id, user_id, status
  from public.challenge_participants;

-- ─── Indizes ─────────────────────────────────────────────────────────────
create index if not exists discipleship_station_progress_user_idx on public.discipleship_station_progress (user_id);
create index if not exists station_reflections_user_idx on public.station_reflections (user_id, station_id);
create index if not exists challenge_participants_challenge_status_idx on public.challenge_participants (challenge_id, status);
create index if not exists challenge_participants_user_idx on public.challenge_participants (user_id);
create index if not exists creeds_visibility_idx on public.creeds (visibility);
create index if not exists creed_lines_creed_idx on public.creed_lines (creed_id);
create index if not exists library_entries_tags_idx on public.library_entries using gin (tags);
create index if not exists bible_verses_cache_lookup_idx on public.bible_verses_cache (bible_id, book, chapter);
create index if not exists challenges_station_idx on public.challenges (station_id);
