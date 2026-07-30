-- Phase 45: Benutzernamen müssen eindeutig sein (case-insensitive).
-- Idempotent: kann mehrfach ausgeführt werden.

-- 1) Eindeutigkeit auf DB-Ebene als Sicherheitsnetz (ignoriert NULL/leere Werte).
--    Hinweis: schlägt fehl, falls bereits doppelte Benutzernamen existieren –
--    in dem Fall vorher bereinigen.
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and length(trim(username)) > 0;

-- 2) RPC zur Verfügbarkeitsprüfung. SECURITY DEFINER, damit auch nicht
--    eingeloggte Nutzer (Registrierung) prüfen können, ohne dass RLS andere
--    Profile lesbar macht.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
