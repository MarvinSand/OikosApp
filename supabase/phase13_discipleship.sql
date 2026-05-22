-- ============================================================
-- Phase 13: Jüngerschaftspfad – Supabase Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Discipleship stage on profiles
alter table public.profiles
  add column if not exists discipleship_stage integer default 0
    check (discipleship_stage between 0 and 3);
-- 0 = noch nicht gestartet (auto-advanced to 1 on first visit)
-- 1 = Identität entdecken
-- 2 = Jüngerschaft leben
-- 3 = Leiter befähigen

-- 2. 1zu1 Begleitungs-Verbindungen
create table if not exists public.discipleship_pairs (
  id          uuid primary key default gen_random_uuid(),
  mentor_id   uuid references public.profiles(id) on delete cascade not null,
  mentee_id   uuid references public.profiles(id) on delete cascade not null,
  started_at  timestamptz default now(),
  is_active   boolean default true,
  unique(mentor_id, mentee_id)
);

-- 3. Impulse/Inhalte pro Stufe
create table if not exists public.discipleship_content (
  id         uuid primary key default gen_random_uuid(),
  stage      integer not null check (stage between 1 and 3),
  title      text not null,
  body       text not null,
  type       text default 'impulse' check (type in ('impulse', 'challenge', 'resource')),
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 4. Abgeschlossene Inhalte pro Nutzer
create table if not exists public.discipleship_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  content_id   uuid references public.discipleship_content(id) on delete cascade not null,
  completed_at timestamptz default now(),
  unique(user_id, content_id)
);

-- 5. RLS
alter table public.discipleship_pairs     enable row level security;
alter table public.discipleship_content   enable row level security;
alter table public.discipleship_progress  enable row level security;

-- Pairs: read/write own rows (as mentor or mentee)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'discipleship_pairs' and policyname = 'Own pairs'
  ) then
    create policy "Own pairs"
      on public.discipleship_pairs for all
      using (auth.uid() = mentor_id or auth.uid() = mentee_id);
  end if;
end $$;

-- Content: authenticated users can read
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'discipleship_content' and policyname = 'All read content'
  ) then
    create policy "All read content"
      on public.discipleship_content for select
      using (auth.uid() is not null);
  end if;
end $$;

-- Progress: own rows only
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'discipleship_progress' and policyname = 'Own progress'
  ) then
    create policy "Own progress"
      on public.discipleship_progress for all
      using (auth.uid() = user_id);
  end if;
end $$;

-- 6. Initiale Inhalte
insert into public.discipleship_content (stage, title, body, type, sort_order) values
  (1, 'Du bist ein Kind Gottes',
   'Johannes 1,12: „Allen aber, die ihn aufnahmen und an seinen Namen glaubten, gab er das Recht, Kinder Gottes zu werden." Was bedeutet es für deinen Alltag, ein Kind Gottes zu sein?',
   'impulse', 10),

  (1, 'Deine neue Identität',
   'In Christus bist du eine neue Schöpfung. 2. Korinther 5,17. Was hat sich in dir verändert seit du Jesus nachfolgst? Schreibe drei Dinge auf.',
   'impulse', 20),

  (1, 'Freiheit statt Leistung',
   'Epheser 2,8-9: Wir werden durch Gnade gerettet, nicht durch Werke. Wo neigst du dazu, deine Identität an Leistung zu knüpfen? Bringe das im Gebet vor Gott.',
   'impulse', 30),

  (1, 'Geliebt ohne Bedingung',
   'Römer 8,38-39: Nichts kann uns von der Liebe Gottes trennen. Welche Situation in deinem Leben fällt dir ein, wo du diese Wahrheit besonders brauchst?',
   'impulse', 40),

  (1, 'Beten als Gespräch',
   'Gebet ist kein Pflichtprogramm, sondern Beziehung. Nimm dir diese Woche täglich 5 Minuten bewusst Zeit – nicht als To-do, sondern als Gespräch mit deinem Vater.',
   'impulse', 50),

  (1, 'Gemeinschaft braucht Offenheit',
   'Jakobus 5,16: „Bekennt einer dem anderen eure Sünden." Gibt es jemanden in deinem Leben, dem du wirklich offen sein kannst? Wenn nicht – wie könntest du das ändern?',
   'impulse', 60),

  (1, 'Wachstum braucht Zeit',
   'Jüngerschaft ist kein Sprint. Welche Frucht siehst du in deinem Leben, die vor einem Jahr noch nicht da war? Danke Gott dafür.',
   'impulse', 70),

  (2, 'Erstes Treffen mit deinem Begleiter',
   'Setzt euch zusammen und erzählt euch wo ihr gerade steht – im Glauben, im Alltag, in euren Fragen. Kein Programm, nur echte Begegnung.',
   'challenge', 10),

  (2, 'Gebetsanliegen teilen',
   'Teile deinem Begleiter diese Woche ein echtes, persönliches Gebetsanliegen mit – etwas das dir wirklich am Herzen liegt.',
   'challenge', 20),

  (2, 'Gemeinsam einen Abschnitt lesen',
   'Lest zusammen einen Bibelabschnitt eurer Wahl und tauscht euch aus: Was spricht euch an? Was stellt ihr in Frage?',
   'challenge', 30),

  (3, 'Meine Gruppe kartieren',
   'Schreibe auf: Wer gehört zu meiner Gruppe? Wer wächst gerade? Wer könnte bald Verantwortung übernehmen? Bringe das vor Gott.',
   'impulse', 10)

on conflict do nothing;
