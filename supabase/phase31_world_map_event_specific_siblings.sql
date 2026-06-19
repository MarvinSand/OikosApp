-- ============================================================
-- Phase 31: Weltkarte-Events – Sichtbarkeit "Ausgewählte Geschwister"
-- Einmal im Supabase SQL Editor ausführen. Idempotent.
-- ============================================================

-- 1) Spalte für ausgewählte Nutzer
alter table public.world_map_activities
  add column if not exists visibility_user_ids uuid[] default '{}';

-- 2) Check-Constraint um 'specific' erweitern
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.world_map_activities'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%visibility_mode%';
  if cname is not null then
    execute format('alter table public.world_map_activities drop constraint %I', cname);
  end if;
end $$;

alter table public.world_map_activities
  add constraint world_map_activities_visibility_mode_check
  check (visibility_mode in ('public', 'siblings', 'communities', 'specific'));

-- 3) Lese-Policy: nur ausgewählte Geschwister
DROP POLICY IF EXISTS "wm specific readable" ON public.world_map_activities;
CREATE POLICY "wm specific readable"
  ON public.world_map_activities FOR SELECT
  USING (
    visibility_mode = 'specific'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = ANY (visibility_user_ids)
  );
