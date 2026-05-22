-- ============================================================
-- OIKOS APP – Jüngerschaft Migration (Phase 13 + 14)
-- Einmal ausführen im Supabase SQL Editor
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- STUFEN-COMMUNITIES
-- ════════════════════════════════════════════════════════════

-- Eine Community kann einer Stufe zugewiesen werden.
-- Admins setzen discipleship_stage = 1/2/3 auf einer Community.
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS discipleship_stage integer
    CHECK (discipleship_stage BETWEEN 1 AND 3);


-- ════════════════════════════════════════════════════════════
-- PHASE 13: Grundstruktur
-- ════════════════════════════════════════════════════════════

-- 1. Discipleship-Stufe auf profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discipleship_stage integer DEFAULT 0
    CHECK (discipleship_stage BETWEEN 0 AND 3);
-- 0 = noch nicht gestartet (wird beim ersten Besuch auto. auf 1 gesetzt)
-- 1 = Identität entdecken
-- 2 = Jüngerschaft leben
-- 3 = Leiter befähigen

-- 2. 1zu1 Begleitungs-Verbindungen
CREATE TABLE IF NOT EXISTS public.discipleship_pairs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mentee_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT now(),
  is_active  boolean DEFAULT true,
  UNIQUE(mentor_id, mentee_id)
);

-- 3. Impulse/Inhalte pro Stufe
CREATE TABLE IF NOT EXISTS public.discipleship_content (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage      integer NOT NULL CHECK (stage BETWEEN 1 AND 3),
  title      text NOT NULL,
  body       text NOT NULL,
  type       text DEFAULT 'impulse' CHECK (type IN ('impulse', 'challenge', 'resource')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. Abgeschlossene Inhalte pro Nutzer
CREATE TABLE IF NOT EXISTS public.discipleship_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_id   uuid REFERENCES public.discipleship_content(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- RLS Phase 13
ALTER TABLE public.discipleship_pairs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_content  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own pairs"        ON public.discipleship_pairs;
DROP POLICY IF EXISTS "All read content" ON public.discipleship_content;
DROP POLICY IF EXISTS "Own progress"     ON public.discipleship_progress;

CREATE POLICY "Own pairs"
  ON public.discipleship_pairs FOR ALL
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "All read content"
  ON public.discipleship_content FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Own progress"
  ON public.discipleship_progress FOR ALL
  USING (auth.uid() = user_id);

-- Initiale Impulse
INSERT INTO public.discipleship_content (stage, title, body, type, sort_order) VALUES
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
ON CONFLICT DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- PHASE 14: Kurse, Chat, Zeugnisse, Zertifikate
-- ════════════════════════════════════════════════════════════

-- 1. conversations-Typ um 'discipleship' erweitern
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_type_check
  CHECK (type IN ('direct', 'community', 'discipleship'));

-- 2. Stufen-Chat (eine Konversation pro Stufe)
CREATE TABLE IF NOT EXISTS public.discipleship_stage_chats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage           integer NOT NULL CHECK (stage BETWEEN 1 AND 3),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(stage)
);

-- 3. Kurs-Module
CREATE TABLE IF NOT EXISTS public.course_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage       integer NOT NULL CHECK (stage BETWEEN 1 AND 3),
  title       text NOT NULL,
  description text,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 4. Lektionen
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        uuid REFERENCES public.course_modules(id) ON DELETE CASCADE NOT NULL,
  title            text NOT NULL,
  content_text     text,
  video_url        text,
  video_thumbnail  text,
  duration_minutes integer,
  sort_order       integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- 5. Abschlussfragen
CREATE TABLE IF NOT EXISTS public.lesson_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  question       text NOT NULL,
  type           text DEFAULT 'open' CHECK (type IN ('open', 'multiple_choice', 'reflection')),
  options        jsonb,
  correct_option integer,
  sort_order     integer DEFAULT 0
);

-- 6. Nutzer-Antworten
CREATE TABLE IF NOT EXISTS public.lesson_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id     uuid REFERENCES public.lesson_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text     text,
  selected_option integer,
  is_correct      boolean,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 7. Abgeschlossene Lektionen
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id    uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 8. Wöchentliche Impulse
CREATE TABLE IF NOT EXISTS public.weekly_impulses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage           integer NOT NULL CHECK (stage BETWEEN 1 AND 3),
  title           text NOT NULL,
  body            text NOT NULL,
  bible_verse     text,
  bible_reference text,
  week_number     integer NOT NULL,
  year            integer NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(stage, week_number, year)
);

-- 9. Zeugnisse
CREATE TABLE IF NOT EXISTS public.discipleship_testimonies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage      integer NOT NULL CHECK (stage BETWEEN 1 AND 3),
  title      text NOT NULL,
  body       text NOT NULL,
  is_public  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 10. Zeugnis-Reaktionen
CREATE TABLE IF NOT EXISTS public.testimony_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id uuid REFERENCES public.discipleship_testimonies(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type         text DEFAULT 'prayer' CHECK (type IN ('prayer', 'heart')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(testimony_id, user_id, type)
);

-- 11. Mentor-Notizen (privat)
CREATE TABLE IF NOT EXISTS public.mentor_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mentee_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  note       text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. Stufen-Zertifikate
CREATE TABLE IF NOT EXISTS public.stage_certificates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage        integer NOT NULL CHECK (stage BETWEEN 1 AND 3),
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stage)
);

-- 13. Call-Termine
CREATE TABLE IF NOT EXISTS public.discipleship_calls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage        integer NOT NULL CHECK (stage BETWEEN 1 AND 3),
  title        text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  link         text,
  description  text,
  created_at   timestamptz DEFAULT now()
);

-- RLS Phase 14
ALTER TABLE public.discipleship_stage_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_impulses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimony_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_certificates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_calls       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read stage chats"  ON public.discipleship_stage_chats;
DROP POLICY IF EXISTS "Auth insert stage chats" ON public.discipleship_stage_chats;
DROP POLICY IF EXISTS "Auth read modules"       ON public.course_modules;
DROP POLICY IF EXISTS "Auth read lessons"       ON public.course_lessons;
DROP POLICY IF EXISTS "Auth read questions"     ON public.lesson_questions;
DROP POLICY IF EXISTS "Auth read impulses"      ON public.weekly_impulses;
DROP POLICY IF EXISTS "Auth read calls"         ON public.discipleship_calls;
DROP POLICY IF EXISTS "Auth read reactions"     ON public.testimony_reactions;
DROP POLICY IF EXISTS "Own answers"             ON public.lesson_answers;
DROP POLICY IF EXISTS "Own completions"         ON public.lesson_completions;
DROP POLICY IF EXISTS "Own certificates"        ON public.stage_certificates;
DROP POLICY IF EXISTS "Own reactions"           ON public.testimony_reactions;
DROP POLICY IF EXISTS "Own testimonies"         ON public.discipleship_testimonies;
DROP POLICY IF EXISTS "Public testimonies"      ON public.discipleship_testimonies;
DROP POLICY IF EXISTS "Mentor notes"            ON public.mentor_notes;

CREATE POLICY "Auth read stage chats"   ON public.discipleship_stage_chats FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert stage chats" ON public.discipleship_stage_chats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read modules"       ON public.course_modules           FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read lessons"       ON public.course_lessons           FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read questions"     ON public.lesson_questions         FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read impulses"      ON public.weekly_impulses          FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read calls"         ON public.discipleship_calls       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read reactions"     ON public.testimony_reactions      FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Own answers"             ON public.lesson_answers           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own completions"         ON public.lesson_completions       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own certificates"        ON public.stage_certificates       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own reactions"           ON public.testimony_reactions      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own testimonies"         ON public.discipleship_testimonies FOR ALL   USING (auth.uid() = user_id);
CREATE POLICY "Public testimonies"      ON public.discipleship_testimonies FOR SELECT USING (auth.uid() IS NOT NULL AND is_public = true);
CREATE POLICY "Mentor notes"            ON public.mentor_notes             FOR ALL   USING (auth.uid() = mentor_id);

-- Kursstruktur: Module
INSERT INTO public.course_modules (stage, title, description, sort_order) VALUES
  (1, 'Modul 1: Wer bin ich?',                'Deine Identität als Kind Gottes entdecken',           1),
  (1, 'Modul 2: Freiheit durch Gnade',        'Gnade verstehen und im Alltag leben',                 2),
  (1, 'Modul 3: Der Weg ist frei',            'Was Christus für dich getan hat',                     3),
  (2, 'Modul 1: Jüngerschaft verstehen',      'Was es bedeutet ein Jünger zu sein',                  1),
  (2, 'Modul 2: Beziehungen gestalten',       'Echte Gemeinschaft leben',                            2),
  (2, 'Modul 3: Das Evangelium weitergeben',  'Natürlich und authentisch von Jesus erzählen',        3),
  (3, 'Modul 1: Leiterschaft verstehen',      'Was bedeutet es andere zu führen?',                   1),
  (3, 'Modul 2: Gruppen leiten',              'Praktische Werkzeuge für Gruppenleiter',               2),
  (3, 'Modul 3: Multiplikation',              'Wie Bewegung entsteht und wächst',                    3)
ON CONFLICT DO NOTHING;

-- Platzhalter-Lektionen (3 pro Modul)
DO $$
DECLARE
  mod RECORD;
  titles TEXT[] := ARRAY['Lektion 1: Einführung', 'Lektion 2: Vertiefung', 'Lektion 3: Reflexion'];
  i INT;
BEGIN
  FOR mod IN SELECT id FROM public.course_modules ORDER BY stage, sort_order LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO public.course_lessons (module_id, title, sort_order)
      VALUES (mod.id, titles[i], i)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Platzhalter-Frage pro Lektion
DO $$
DECLARE
  les RECORD;
BEGIN
  FOR les IN SELECT id FROM public.course_lessons LOOP
    INSERT INTO public.lesson_questions (lesson_id, question, type, sort_order)
    VALUES (
      les.id,
      'Was hat dich in dieser Lektion besonders angesprochen? Wie möchtest du es in deinen Alltag integrieren?',
      'reflection', 1
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Wochenimpuls-Platzhalter (aktuelle Woche, alle 3 Stufen)
INSERT INTO public.weekly_impulses (stage, title, body, bible_verse, bible_reference, week_number, year)
SELECT
  s.stage,
  'Impuls folgt in Kürze',
  'Der Impuls für diese Woche wird bald hier erscheinen.',
  '', '',
  EXTRACT(WEEK FROM NOW())::integer,
  EXTRACT(YEAR FROM NOW())::integer
FROM (VALUES (1),(2),(3)) AS s(stage)
ON CONFLICT DO NOTHING;
