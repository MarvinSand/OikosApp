-- ============================================================
-- Phase 58: Bibel-Integration (YouVersion Platform API)
-- Run this in the Supabase SQL Editor
-- ============================================================
-- Kontext: YouVersion hat im April 2026 die "YouVersion Platform" geöffnet
-- (developers.youversion.com) – freie Bibeltext-API + "Login mit YouVersion"
-- per OAuth 2.0/PKCE, über das ein Nutzer seine Highlights/Notizen/Lesezeichen
-- freigeben kann (Scopes u.a. "bibles", "highlights"). Der App-Key
-- (X-YVP-App-Key) authentifiziert die App, echte User-Zugriffstoken kommen
-- zusätzlich per OAuth. Beides bleibt serverseitig in Edge Functions –
-- niemals im Frontend-Bundle (siehe supabase/functions/youversion-*).

-- 1. Verbindungsstatus + YouVersion-User-ID auf dem Profil (unkritisch, darf
--    wie andere Profilfelder gelesen werden)
alter table public.profiles
  add column if not exists youversion_connected boolean default false;
alter table public.profiles
  add column if not exists youversion_yvp_id text;

-- 2. OAuth-Tokens: NUR von Edge Functions (service_role) lesbar/schreibbar.
--    Es gibt bewusst keine RLS-Policy für authenticated/anon – damit ist die
--    Tabelle für normale Client-Queries komplett unsichtbar.
create table if not exists public.user_youversion_tokens (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  yvp_id        text not null,
  access_token  text not null,
  refresh_token text,
  scope         text,
  expires_at    timestamptz not null,
  updated_at    timestamptz default now()
);
alter table public.user_youversion_tokens enable row level security;

-- 2b. Kurzlebiger PKCE-State für den OAuth-Handshake (Edge Function
--     schreibt/liest das, RLS bewusst ohne Policies -> nur service_role).
--     Alte Zeilen (>10 Min) räumt die Edge Function beim nächsten Start auf.
create table if not exists public.youversion_oauth_state (
  state         text primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  code_verifier text not null,
  created_at    timestamptz default now()
);
alter table public.youversion_oauth_state enable row level security;

-- 3. Vereinheitlichter lokaler Cache für Highlights/Notizen/Lesezeichen.
--    source = 'oikos'      -> in der App selbst erstellt
--    source = 'youversion' -> aus der YouVersion-App synchronisiert
--    youversion_id dient dem Dedupe beim Re-Sync.
create table if not exists public.bible_highlights (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  bible_id       text not null default 'de-elb',
  book           text not null,
  chapter        integer not null,
  verse_start    integer not null,
  verse_end      integer,
  reference_label text not null,
  color          text default 'yellow',
  source         text not null default 'oikos' check (source in ('oikos', 'youversion')),
  youversion_id  text,
  created_at     timestamptz default now(),
  unique(user_id, source, youversion_id)
);

create table if not exists public.bible_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  bible_id       text not null default 'de-elb',
  book           text not null,
  chapter        integer not null,
  verse_start    integer not null,
  verse_end      integer,
  reference_label text not null,
  note           text not null,
  source         text not null default 'oikos' check (source in ('oikos', 'youversion')),
  youversion_id  text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(user_id, source, youversion_id)
);

create table if not exists public.bible_bookmarks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  bible_id       text not null default 'de-elb',
  book           text not null,
  chapter        integer not null,
  verse         integer,
  reference_label text not null,
  source         text not null default 'oikos' check (source in ('oikos', 'youversion')),
  youversion_id  text,
  created_at     timestamptz default now(),
  unique(user_id, source, youversion_id)
);

-- 4. Letzte Leseposition (für "weiterlesen")
create table if not exists public.bible_reading_progress (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  bible_id    text not null default 'de-elb',
  book        text not null,
  chapter     integer not null,
  updated_at  timestamptz default now()
);

-- 5. Verknüpfung: Bible-Study-Inhalte im Jüngerschaftsbereich referenzieren
--    Bibelstellen strukturiert (statt nur als Freitext wie bisher
--    course_lessons.content_text). Optional nutzbar, bricht nichts Bestehendes.
alter table public.course_lessons
  add column if not exists bible_reference text,
  add column if not exists bible_book text,
  add column if not exists bible_chapter integer,
  add column if not exists bible_verse_start integer,
  add column if not exists bible_verse_end integer;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.bible_highlights        enable row level security;
alter table public.bible_notes             enable row level security;
alter table public.bible_bookmarks         enable row level security;
alter table public.bible_reading_progress  enable row level security;

drop policy if exists "Own highlights" on public.bible_highlights;
drop policy if exists "Own notes"      on public.bible_notes;
drop policy if exists "Own bookmarks"  on public.bible_bookmarks;
drop policy if exists "Own progress"   on public.bible_reading_progress;

create policy "Own highlights" on public.bible_highlights       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own notes"      on public.bible_notes            for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own bookmarks"  on public.bible_bookmarks        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own progress"   on public.bible_reading_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists bible_highlights_lookup on public.bible_highlights (user_id, book, chapter);
create index if not exists bible_notes_lookup      on public.bible_notes      (user_id, book, chapter);
create index if not exists bible_bookmarks_lookup  on public.bible_bookmarks  (user_id, book, chapter);
