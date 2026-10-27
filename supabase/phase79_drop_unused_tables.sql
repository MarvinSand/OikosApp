-- phase79: Aufräumen vor App-Store-Release (Okt. 2026)
-- Entfernt Tabellen/Funktionen, die von main weder im Client noch in
-- Edge Functions, RPCs, Views oder Policies verwendet werden (alter
-- Jüngerschafts-/Kurs-Stand, Testtabelle). Daten-Backup:
-- vor dem Drop als JSON exportiert (nicht im Repo, enthält Nutzerdaten).
-- Idempotent.

drop view if exists public.challenge_participants_public;

drop table if exists
  public._ddl_probe,
  public.accountability_pairs,
  public.baptism_status,
  public.challenge_participants,
  public.challenges,
  public.discipleship_calls,
  public.discipleship_station_progress,
  public.discipleship_testimonies,
  public.station_reflections,
  public.library_entries,
  public.discipleship_stations,
  public.journal_entries,
  public.user_bible_progress,
  public.bible_plans,
  public.user_station_progress,
  public.stage_certificates,
  public.resources,
  public.stations,
  public.stages,
  public.tools,
  public.lesson_answers,
  public.lesson_completions,
  public.lesson_questions,
  public.course_lessons,
  public.course_modules,
  public.weekly_impulses,
  public.mentor_matches,
  public.mentor_pool,
  public.user_discipleship_profile
  cascade;

drop function if exists public.handle_path_choice_fork();
drop function if exists public.create_activity_chat(uuid);
drop function if exists public.get_siblings_network(integer);
drop function if exists public.create_community(text, text, text);
