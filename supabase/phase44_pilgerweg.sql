-- ============================================================
-- Phase 44: Jüngerschaftstab – Pilgerweg (Phase 1: Struktur & Design)
-- Datenmodell für Fork-Screen, Pfad-Screen, Stations-Detailansicht.
-- Idempotent – kann mehrfach ausgeführt werden.
-- ============================================================

-- ─── Profil-Tags ────────────────────────────────────────────
create table if not exists public.user_discipleship_profile (
  user_id                  uuid primary key references public.profiles(id) on delete cascade,
  glaubensstand            text default 'noch_nicht_glaeubig'
    check (glaubensstand in ('noch_nicht_glaeubig', 'neu_im_glauben', 'gefestigt', 'reif')),
  taufe                    text default 'ungetauft'
    check (taufe in ('getauft', 'ungetauft')),
  evangelisation_erfahrung text default 'keine'
    check (evangelisation_erfahrung in ('keine', 'wenig', 'erfahren')),
  path_choice              text default 'none'
    check (path_choice in ('none', 'schmaler_weg')),
  created_at               timestamptz default now(),
  updated_at                timestamptz default now()
);

-- ─── Stationen & Fortschritt ────────────────────────────────
create table if not exists public.stages (
  id          uuid primary key default gen_random_uuid(),
  order_index integer not null,
  name        text not null,
  slug        text not null unique
);

create table if not exists public.stations (
  id                uuid primary key default gen_random_uuid(),
  stage_id          uuid references public.stages(id) on delete cascade not null,
  order_index       integer not null default 0,
  type              text not null
    check (type in ('challenge', 'bible_plan', 'journal', 'milestone', 'mentor_match')),
  category          text not null,
  title             text not null,
  description       text,
  tags              text[] default '{}',
  min_glaubensstand text,
  created_at        timestamptz default now()
);

create table if not exists public.user_station_progress (
  user_id      uuid references public.profiles(id) on delete cascade not null,
  station_id   uuid references public.stations(id) on delete cascade not null,
  status       text not null default 'locked'
    check (status in ('locked', 'available', 'current', 'done')),
  completed_at timestamptz,
  primary key (user_id, station_id)
);

-- ─── Feature-Tabellen ───────────────────────────────────────
create table if not exists public.bible_plans (
  id         uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations(id) on delete cascade not null,
  days       jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.user_bible_progress (
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id uuid references public.bible_plans(id) on delete cascade not null,
  day     integer not null,
  done_at timestamptz default now(),
  primary key (user_id, plan_id, day)
);

create table if not exists public.journal_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.profiles(id) on delete cascade not null,
  station_id         uuid references public.stations(id) on delete cascade not null,
  content            text not null default '',
  shared_with_mentor boolean default false,
  created_at         timestamptz default now()
);

create table if not exists public.baptism_status (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  status       text not null default 'nicht_getauft'
    check (status in ('nicht_getauft', 'angefragt', 'geplant', 'getauft')),
  requested_at timestamptz
);

create table if not exists public.mentor_pool (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  status     text not null default 'sucht_mentor' check (status in ('sucht_mentor')),
  created_at timestamptz default now()
);

create table if not exists public.mentor_matches (
  id           uuid primary key default gen_random_uuid(),
  mentee_id    uuid references public.profiles(id) on delete cascade not null,
  mentor_id    uuid references public.profiles(id) on delete cascade not null,
  status       text not null default 'vorgeschlagen'
    check (status in ('vorgeschlagen', 'bestaetigt', 'abgeschlossen')),
  matched_at   timestamptz default now(),
  initiated_by text
);

create table if not exists public.accountability_pairs (
  id                  uuid primary key default gen_random_uuid(),
  user_a_id           uuid references public.profiles(id) on delete cascade not null,
  user_b_id           uuid references public.profiles(id) on delete cascade not null,
  status              text default 'aktiv',
  check_in_rhythmus   text,
  started_at          timestamptz default now()
);

create table if not exists public.resources (
  id       uuid primary key default gen_random_uuid(),
  title    text not null,
  type     text not null check (type in ('artikel', 'buch', 'podcast')),
  url      text,
  tags     text[] default '{}',
  stage_id uuid references public.stages(id) on delete set null
);

-- ─── Indizes ────────────────────────────────────────────────
create index if not exists stations_stage_idx on public.stations(stage_id);
create index if not exists stations_category_idx on public.stations(category);
create index if not exists user_station_progress_user_idx on public.user_station_progress(user_id);
create index if not exists user_bible_progress_user_idx on public.user_bible_progress(user_id);
create index if not exists journal_entries_user_idx on public.journal_entries(user_id);
create index if not exists journal_entries_station_idx on public.journal_entries(station_id);
create index if not exists mentor_matches_mentee_idx on public.mentor_matches(mentee_id);
create index if not exists mentor_matches_mentor_idx on public.mentor_matches(mentor_id);
create index if not exists accountability_pairs_a_idx on public.accountability_pairs(user_a_id);
create index if not exists accountability_pairs_b_idx on public.accountability_pairs(user_b_id);
create index if not exists resources_stage_idx on public.resources(stage_id);

-- ─── RLS aktivieren ─────────────────────────────────────────
alter table public.user_discipleship_profile enable row level security;
alter table public.stages                    enable row level security;
alter table public.stations                  enable row level security;
alter table public.user_station_progress     enable row level security;
alter table public.bible_plans                enable row level security;
alter table public.user_bible_progress        enable row level security;
alter table public.journal_entries            enable row level security;
alter table public.baptism_status             enable row level security;
alter table public.mentor_pool                enable row level security;
alter table public.mentor_matches             enable row level security;
alter table public.accountability_pairs       enable row level security;
alter table public.resources                  enable row level security;

-- ─── Policies: user_discipleship_profile ───────────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own discipleship profile' and tablename = 'user_discipleship_profile') then
    create policy "Own discipleship profile" on public.user_discipleship_profile for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Policies: stages / stations (Lesezugriff für alle) ────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read stages' and tablename = 'stages') then
    create policy "Read stages" on public.stages for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read stations' and tablename = 'stations') then
    create policy "Read stations" on public.stations for select using (auth.uid() is not null);
  end if;
end $$;

-- ─── Policies: user_station_progress ───────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own station progress' and tablename = 'user_station_progress') then
    create policy "Own station progress" on public.user_station_progress for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Policies: bible_plans (Lesezugriff für alle) ──────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read bible_plans' and tablename = 'bible_plans') then
    create policy "Read bible_plans" on public.bible_plans for select using (auth.uid() is not null);
  end if;
end $$;

-- ─── Policies: user_bible_progress ─────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own bible progress' and tablename = 'user_bible_progress') then
    create policy "Own bible progress" on public.user_bible_progress for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Policies: journal_entries (privat) ────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own journal entries' and tablename = 'journal_entries') then
    create policy "Own journal entries" on public.journal_entries for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Policies: baptism_status ───────────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own baptism status' and tablename = 'baptism_status') then
    create policy "Own baptism status" on public.baptism_status for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Policies: mentor_pool (Lesezugriff für alle, Schreibzugriff nur eigene Zeile) ──
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read mentor_pool' and tablename = 'mentor_pool') then
    create policy "Read mentor_pool" on public.mentor_pool for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own mentor_pool write' and tablename = 'mentor_pool') then
    create policy "Own mentor_pool write" on public.mentor_pool for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Policies: mentor_matches (eigene als Mentor oder Mentee) ──
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own mentor_matches' and tablename = 'mentor_matches') then
    create policy "Own mentor_matches" on public.mentor_matches for all
      using (auth.uid() = mentee_id or auth.uid() = mentor_id)
      with check (auth.uid() = mentee_id or auth.uid() = mentor_id);
  end if;
end $$;

-- ─── Policies: accountability_pairs (eigene als user_a oder user_b) ──
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own accountability_pairs' and tablename = 'accountability_pairs') then
    create policy "Own accountability_pairs" on public.accountability_pairs for all
      using (auth.uid() = user_a_id or auth.uid() = user_b_id)
      with check (auth.uid() = user_a_id or auth.uid() = user_b_id);
  end if;
end $$;

-- ─── Policies: resources (Lesezugriff für alle) ────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read resources' and tablename = 'resources') then
    create policy "Read resources" on public.resources for select using (auth.uid() is not null);
  end if;
end $$;

-- ─── Trigger: mentor_pool automatisch befüllen nach Fork-Entscheidung ──
create or replace function public.handle_path_choice_fork()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.path_choice = 'schmaler_weg' and (old.path_choice is null or old.path_choice <> 'schmaler_weg') then
    insert into public.mentor_pool (user_id, status)
    values (new.user_id, 'sucht_mentor')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_path_choice_fork on public.user_discipleship_profile;
create trigger trg_path_choice_fork
  after insert or update of path_choice on public.user_discipleship_profile
  for each row execute function public.handle_path_choice_fork();

-- ============================================================
-- Seed-Daten: 1 Beispiel-Weg mit 8 Platzhalter-Stationen
-- ============================================================

insert into public.stages (order_index, name, slug) values
  (1, 'Same des Glaubens',    'same-des-glaubens'),
  (2, 'Erste Schritte',       'erste-schritte'),
  (3, 'Verbindung',           'verbindung'),
  (4, 'Mission teilen',       'mission-teilen'),
  (5, 'Wachsen & Senden',     'wachsen-und-senden')
on conflict (slug) do nothing;

insert into public.stations (stage_id, order_index, type, category, title, description, tags, min_glaubensstand)
select s.id, v.order_index, v.type, v.category, v.title, v.description, v.tags, v.min_glaubensstand
from (values
  ('same-des-glaubens', 1, 'challenge',    'glaube',      'Same des Glaubens',        'Platzhalter-Beschreibung: Erste Challenge auf deinem Weg.', array['neu_im_glauben'], null::text),
  ('same-des-glaubens', 1, 'bible_plan',   'bibellese',   'Erste Bibellese',          'Platzhalter: Ein kurzer Einstiegs-Lesplan.', array[]::text[], null::text),
  ('erste-schritte',    1, 'journal',      'glaube',      'Mein Glaubensweg-Tagebuch','Platzhalter: Halte fest, was Gott dir zeigt.', array[]::text[], null::text),
  ('erste-schritte',    1, 'milestone',    'taufe',       'Taufe',                    'Platzhalter: Dein nächster sichtbarer Schritt.', array['ungetauft'], null::text),
  ('verbindung',        1, 'challenge',    'gemeinschaft','Verbindung suchen',        'Platzhalter: Baue eine echte Beziehung auf.', array[]::text[], null::text),
  ('verbindung',        1, 'bible_plan',   'bibellese',   'Gemeinsam lesen',          'Platzhalter: Ein Leseplan für zwei.', array[]::text[], null::text),
  ('mission-teilen',    1, 'challenge',    'mission',     'Mission teilen',           'Platzhalter: Erzähle jemandem von deinem Glauben.', array[]::text[], null::text),
  ('wachsen-und-senden',1, 'mentor_match', 'mentoring',   'Mentor finden',            'Platzhalter: Lass dich begleiten.', array[]::text[], null::text)
) as v(stage_slug, order_index, type, category, title, description, tags, min_glaubensstand)
join public.stages s on s.slug = v.stage_slug
where not exists (
  select 1 from public.stations st where st.stage_id = s.id and st.title = v.title
);

-- Platzhalter-Bibellesepläne für die beiden bible_plan-Stationen
insert into public.bible_plans (station_id, days)
select st.id, '[
  {"day": 1, "reference": "Platzhalter-Referenz Tag 1"},
  {"day": 2, "reference": "Platzhalter-Referenz Tag 2"},
  {"day": 3, "reference": "Platzhalter-Referenz Tag 3"}
]'::jsonb
from public.stations st
where st.type = 'bible_plan'
  and not exists (select 1 from public.bible_plans bp where bp.station_id = st.id);

-- Platzhalter-Ressourcen
insert into public.resources (title, type, url, tags, stage_id)
select v.title, v.type, v.url, v.tags, s.id
from (values
  ('Platzhalter-Artikel: Erste Schritte im Glauben', 'artikel', null::text, array['neu_im_glauben'], 'same-des-glaubens'),
  ('Platzhalter-Buch: Was bedeutet Nachfolge?',       'buch',    null::text, array[]::text[],         'erste-schritte'),
  ('Platzhalter-Podcast: Gemeinschaft leben',          'podcast', null::text, array[]::text[],         'verbindung'),
  ('Platzhalter-Artikel: Mutig glauben teilen',        'artikel', null::text, array[]::text[],         'mission-teilen')
) as v(title, type, url, tags, stage_slug)
join public.stages s on s.slug = v.stage_slug
where not exists (select 1 from public.resources r where r.title = v.title);
