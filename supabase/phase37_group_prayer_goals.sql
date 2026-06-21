-- ============================================================
-- Phase 37: Gruppengebete mit Zielen + Gebet des Tages
-- - prayer_goals: gemeinsame Gebetsziele (Stunden / Personen) mit Fortschritt
-- - prayer_goal_contributions: einzelne Beiträge (Minuten bzw. Teilnahme)
-- - daily_prayers / daily_prayer_logs: tägliches Gruppengebet
-- Idempotent – kann mehrfach ausgeführt werden.
-- ============================================================

-- ─── Gebetsziele ──────────────────────────────────────────────
create table if not exists public.prayer_goals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  icon text default '🙏',
  color text default '#5AC8FA',
  goal_type text not null default 'people' check (goal_type in ('hours', 'people')),
  target_value numeric not null check (target_value > 0),
  current_value numeric default 0,
  participant_count integer default 0,
  visibility text not null default 'public' check (visibility in ('public', 'community')),
  community_id uuid references public.communities(id) on delete cascade,
  is_featured boolean default false,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

-- ─── Policies: prayer_goals ───────────────────────────────────
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
      else round((select coalesce(sum(minutes), 0) from public.prayer_goal_contributions where goal_id = p_goal_id) / 60.0, 1)
    end,
    updated_at = now()
  where g.id = p_goal_id;
end;
$$;

grant execute on function public.contribute_to_prayer_goal(uuid, integer) to authenticated;

-- ─── Beispiel-Tagesgebet für heute (optional, nur falls keins existiert) ──
insert into public.daily_prayers (prayer_date, title, description, scripture_ref, scripture_text, icon)
select current_date,
  'Gebet für Deutschland',
  'Lasst uns heute gemeinsam für Erweckung und Frieden in unserem Land beten.',
  'Jeremia 29,7',
  'Suchet der Stadt Bestes … und betet für sie zum HERRN; denn wenn''s ihr wohlgeht, so geht''s euch auch wohl.',
  '🇩🇪'
on conflict (prayer_date) do nothing;
