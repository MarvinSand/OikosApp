-- ════════════════════════════════════════════════════════════════════════
-- Phase 39: Sichtbarkeit für Gebete & Ziele + Bugfix Erstellen
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent (mehrfach ausführbar).
--
-- Behebt:
--  1) "Fehler beim Teilen" – personal_prayer_requests fehlten Sichtbarkeits-Spalten,
--     wodurch jedes Insert fehlschlug.
--  2) Gebetsziele: neue Sichtbarkeiten "siblings" / "specific" (CHECK + Spalte + RLS).
--  3) Safety-Net: RLS-Policies für prayer_requests (Personen-Anliegen bleiben erhalten).
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1) personal_prayer_requests: Sichtbarkeits-Spalten ───────────────────
alter table public.personal_prayer_requests
  add column if not exists visibility text default 'private',
  add column if not exists visibility_user_ids uuid[] default '{}',
  add column if not exists visibility_community_id uuid references public.communities(id) on delete set null;

-- ─── 2) prayer_goals: neue Sichtbarkeiten ─────────────────────────────────
alter table public.prayer_goals
  add column if not exists visibility_user_ids uuid[] default '{}';

-- bestehenden visibility-CHECK dynamisch entfernen und erweitern
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.prayer_goals'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%visibility%';
  if cname is not null then
    execute format('alter table public.prayer_goals drop constraint %I', cname);
  end if;
end $$;

alter table public.prayer_goals
  add constraint prayer_goals_visibility_check
  check (visibility in ('public', 'community', 'siblings', 'specific'));

create index if not exists prayer_goals_visibility_user_ids_idx
  on public.prayer_goals using gin (visibility_user_ids);

-- Lese-Policy neu setzen (inkl. siblings/specific)
drop policy if exists "Read prayer_goals" on public.prayer_goals;
create policy "Read prayer_goals" on public.prayer_goals for select using (
  created_by = auth.uid()
  or (visibility = 'public' and auth.uid() is not null)
  or (visibility = 'community' and exists (
    select 1 from public.community_members cm
    where cm.community_id = prayer_goals.community_id and cm.user_id = auth.uid()
  ))
  or (visibility = 'siblings' and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = prayer_goals.created_by and f.addressee_id = auth.uid())
        or (f.addressee_id = prayer_goals.created_by and f.requester_id = auth.uid()))
  ))
  or (visibility = 'specific' and auth.uid() = any (prayer_goals.visibility_user_ids))
);

-- ─── 3) prayer_requests: RLS-Safety-Net (Personen-Anliegen) ───────────────
alter table public.prayer_requests enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read prayer_requests' and tablename = 'prayer_requests') then
    create policy "Read prayer_requests" on public.prayer_requests for select
      using (owner_id = auth.uid() or is_public = true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own prayer_requests write' and tablename = 'prayer_requests') then
    create policy "Own prayer_requests write" on public.prayer_requests for all
      using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
end $$;
