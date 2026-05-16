-- Phase 17: Weltkarte – Christen & Aktivitäten

-- Standort-Koordinaten für Weltkarte (separat von Profil-Text)
alter table public.profiles
add column if not exists latitude float,
add column if not exists longitude float,
add column if not exists show_on_world_map boolean default false,
add column if not exists world_map_last_updated timestamptz;

-- Aktivitäten auf der Weltkarte
create table if not exists public.world_map_activities (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  activity_type text not null,
  activity_emoji text default '📍',
  latitude float not null,
  longitude float not null,
  location_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_participants integer,
  is_public boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- Aktivitäts-Teilnehmer
create table if not exists public.activity_participants (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.world_map_activities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(activity_id, user_id)
);

-- RLS
alter table public.world_map_activities enable row level security;
alter table public.activity_participants enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'world_map_activities' and policyname = 'Public activities readable'
  ) then
    create policy "Public activities readable"
      on public.world_map_activities for select
      using (is_public = true and auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'world_map_activities' and policyname = 'Own activities'
  ) then
    create policy "Own activities"
      on public.world_map_activities for all
      using (auth.uid() = author_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'activity_participants' and policyname = 'Auth manage participation'
  ) then
    create policy "Auth manage participation"
      on public.activity_participants for all
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'activity_participants' and policyname = 'Auth read participants'
  ) then
    create policy "Auth read participants"
      on public.activity_participants for select
      using (auth.uid() is not null);
  end if;
end $$;
