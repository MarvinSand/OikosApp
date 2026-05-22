-- ============================================================
-- Phase 22: Fehlende Profil-Spalten hinzufügen
-- birthday, show_birthday, gender, church_name
-- Idempotent – kann mehrfach ausgeführt werden.
-- ============================================================

alter table public.profiles
  add column if not exists birthday        date,
  add column if not exists show_birthday   boolean default true,
  add column if not exists gender          text,
  add column if not exists church_name     text;

-- Optional: constraint auf gender-Werte
do $$ begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'profiles_gender_check'
  ) then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender in ('brother', 'sister'));
  end if;
end $$;
