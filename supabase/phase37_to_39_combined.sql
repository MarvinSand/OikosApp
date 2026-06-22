-- ============================================================================
-- KOMBINIERT: Alle Migrationen NACH phase26_36_combined.sql
--   • Phase 37+38: Gruppengebete mit Zielen + Gebet des Tages
--   • Phase 39:    Sichtbarkeit für Gebete & Ziele + Bugfixes Erstellen
--
-- Einmal komplett im Supabase SQL-Editor ausführen.
-- Idempotent – kann gefahrlos mehrfach ausgeführt werden.
-- Reihenfolge ist wichtig: Phase 37/38 legt prayer_goals an, Phase 39 erweitert es.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 37 + 38: Gruppengebete mit Zielen + Gebet des Tages
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Gebetsziele ──────────────────────────────────────────────
create table if not exists public.prayer_goals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  icon text default '🙏',
  color text default '#5AC8FA',
  goal_type text not null default 'people' check (goal_type in ('hours', 'people', 'days')),
  target_value numeric not null check (target_value > 0),
  current_value numeric default 0,
  participant_count integer default 0,
  visibility text not null default 'public' check (visibility in ('public', 'community')),
  community_id uuid references public.communities(id) on delete cascade,
  prayer_request_id uuid references public.prayer_requests(id) on delete set null,
  personal_prayer_request_id uuid references public.personal_prayer_requests(id) on delete set null,
  is_featured boolean default false,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Nachträgliche Anpassungen für bereits migrierte DBs ───────
alter table public.prayer_goals
  drop constraint if exists prayer_goals_goal_type_check;
alter table public.prayer_goals
  add constraint prayer_goals_goal_type_check
  check (goal_type in ('hours', 'people', 'days'));

alter table public.prayer_goals
  add column if not exists prayer_request_id uuid
    references public.prayer_requests(id) on delete set null;
alter table public.prayer_goals
  add column if not exists personal_prayer_request_id uuid
    references public.personal_prayer_requests(id) on delete set null;

-- ─── Beiträge zu Zielen ───────────────────────────────────────
create table if not exists public.prayer_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.prayer_goals(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  minutes integer default 0,
  created_at timestamptz default now()
);

-- ─── Gebet des Tages ──────────────────────────────────────────
create table if not exists public.daily_prayers (
  id uuid primary key default gen_random_uuid(),
  prayer_date date not null unique,
  title text not null,
  description text,
  scripture_ref text,
  scripture_text text,
  icon text default '🕊️',
  goal_id uuid references public.prayer_goals(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.daily_prayer_logs (
  id uuid primary key default gen_random_uuid(),
  daily_prayer_id uuid references public.daily_prayers(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (daily_prayer_id, user_id)
);

-- ─── Indizes ──────────────────────────────────────────────────
create index if not exists prayer_goals_visibility_idx on public.prayer_goals(visibility);
create index if not exists prayer_goals_community_idx on public.prayer_goals(community_id);
create index if not exists prayer_goals_created_by_idx on public.prayer_goals(created_by);
create index if not exists prayer_goal_contributions_goal_idx on public.prayer_goal_contributions(goal_id);
create index if not exists daily_prayer_logs_daily_idx on public.daily_prayer_logs(daily_prayer_id);

-- ─── RLS aktivieren ───────────────────────────────────────────
alter table public.prayer_goals enable row level security;
alter table public.prayer_goal_contributions enable row level security;
alter table public.daily_prayers enable row level security;
alter table public.daily_prayer_logs enable row level security;

-- ─── Policies: prayer_goals (wird in Phase 39 erweitert) ───────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read prayer_goals' and tablename = 'prayer_goals') then
    create policy "Read prayer_goals" on public.prayer_goals for select using (
      created_by = auth.uid()
      or (visibility = 'public' and auth.uid() is not null)
      or (visibility = 'community' and exists (
        select 1 from public.community_members cm
        where cm.community_id = prayer_goals.community_id and cm.user_id = auth.uid()
      ))
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own prayer_goals write' and tablename = 'prayer_goals') then
    create policy "Own prayer_goals write" on public.prayer_goals for all
      using (created_by = auth.uid()) with check (created_by = auth.uid());
  end if;
end $$;

-- ─── Policies: prayer_goal_contributions ──────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read goal contributions' and tablename = 'prayer_goal_contributions') then
    create policy "Read goal contributions" on public.prayer_goal_contributions for select
      using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Insert own contributions' and tablename = 'prayer_goal_contributions') then
    create policy "Insert own contributions" on public.prayer_goal_contributions for insert
      with check (user_id = auth.uid());
  end if;
end $$;

-- ─── Policies: daily_prayers ──────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read daily_prayers' and tablename = 'daily_prayers') then
    create policy "Read daily_prayers" on public.daily_prayers for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read daily_prayer_logs' and tablename = 'daily_prayer_logs') then
    create policy "Read daily_prayer_logs" on public.daily_prayer_logs for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Insert own daily log' and tablename = 'daily_prayer_logs') then
    create policy "Insert own daily log" on public.daily_prayer_logs for insert with check (user_id = auth.uid());
  end if;
end $$;

-- ─── RPC: Beitrag zu einem Ziel (hält Zähler konsistent) ──────
create or replace function public.contribute_to_prayer_goal(p_goal_id uuid, p_minutes integer default 0)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_type text;
  v_uid uuid := auth.uid();
  v_already boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select goal_type into v_type from public.prayer_goals where id = p_goal_id;
  if v_type is null then raise exception 'goal not found'; end if;

  if v_type = 'people' then
    select exists (
      select 1 from public.prayer_goal_contributions
      where goal_id = p_goal_id and user_id = v_uid
    ) into v_already;
    if not v_already then
      insert into public.prayer_goal_contributions (goal_id, user_id, minutes)
      values (p_goal_id, v_uid, 0);
    end if;
  else
    insert into public.prayer_goal_contributions (goal_id, user_id, minutes)
    values (p_goal_id, v_uid, greatest(0, coalesce(p_minutes, 0)));
  end if;

  update public.prayer_goals g set
    participant_count = (select count(distinct user_id) from public.prayer_goal_contributions where goal_id = p_goal_id),
    current_value = case
      when g.goal_type = 'people'
        then (select count(distinct user_id) from public.prayer_goal_contributions where goal_id = p_goal_id)
      when g.goal_type = 'days'
        then (select count(distinct (created_at at time zone 'UTC')::date) from public.prayer_goal_contributions where goal_id = p_goal_id)
      else round((select coalesce(sum(minutes), 0) from public.prayer_goal_contributions where goal_id = p_goal_id) / 60.0, 1)
    end,
    updated_at = now()
  where g.id = p_goal_id;
end;
$$;

grant execute on function public.contribute_to_prayer_goal(uuid, integer) to authenticated;

-- ─── Beispiel-Tagesgebet für heute (optional) ─────────────────
insert into public.daily_prayers (prayer_date, title, description, scripture_ref, scripture_text, icon)
select current_date,
  'Gebet für Deutschland',
  'Lasst uns heute gemeinsam für Erweckung und Frieden in unserem Land beten.',
  'Jeremia 29,7',
  'Suchet der Stadt Bestes … und betet für sie zum HERRN; denn wenn''s ihr wohlgeht, so geht''s euch auch wohl.',
  '🇩🇪'
on conflict (prayer_date) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 39: Sichtbarkeit für Gebete & Ziele + Bugfix Erstellen
-- Behebt:
--  1) "Fehler beim Teilen" – personal_prayer_requests fehlten Sichtbarkeits-Spalten.
--  2) Gebetsziele: neue Sichtbarkeiten "siblings" / "specific".
--  3) Safety-Net: RLS-Policies für prayer_requests (Personen-Anliegen bleiben erhalten).
-- ════════════════════════════════════════════════════════════════════════════

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
