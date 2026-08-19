-- ============================================================
-- Phase 58c: "Mit YouVersion anmelden/registrieren" auf dem Login-Screen
-- (zusätzlich zum bisherigen "YouVersion mit meinem Oikos-Konto verknüpfen"
-- in Einstellungen/Bibel, das einen bereits eingeloggten Nutzer braucht).
-- ============================================================

-- user_id darf jetzt leer sein: beim Start des Sign-in/up-Flows ist noch
-- niemand bei Oikos eingeloggt. `mode` unterscheidet, welchen Zweig die
-- Edge Function beim Callback nimmt.
alter table public.youversion_oauth_state
  alter column user_id drop not null;
alter table public.youversion_oauth_state
  add column if not exists mode text not null default 'link' check (mode in ('link', 'signin'));
