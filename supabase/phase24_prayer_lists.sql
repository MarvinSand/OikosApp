-- Phase 24: Gebetslisten-System Fundament

-- Eigene Gebetslisten
create table if not exists public.prayer_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  icon text default '🙏',
  color text default '#7A9E7E',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Anliegen in Listen
create table if not exists public.prayer_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.prayer_lists(id) on delete cascade not null,
  prayer_request_id uuid references public.prayer_requests(id) on delete cascade,
  personal_prayer_request_id uuid references public.personal_prayer_requests(id) on delete cascade,
  added_at timestamptz default now(),
  sort_order integer default 0,
  constraint one_request_type check (
    (prayer_request_id is null) != (personal_prayer_request_id is null)
  )
);

-- Kategorien
create table if not exists public.prayer_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  emoji text not null,
  color text,
  is_system boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Gebets-Statistiken
create table if not exists public.user_prayer_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_prayer_date date,
  total_prayers integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS aktivieren
alter table public.prayer_lists enable row level security;
alter table public.prayer_list_items enable row level security;
alter table public.prayer_categories enable row level security;
alter table public.user_prayer_stats enable row level security;

-- RLS Policies
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own prayer_lists' and tablename = 'prayer_lists') then
    create policy "Own prayer_lists" on public.prayer_lists for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own prayer_list_items' and tablename = 'prayer_list_items') then
    create policy "Own prayer_list_items" on public.prayer_list_items for all
      using (auth.uid() in (select user_id from public.prayer_lists where id = prayer_list_items.list_id));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read system categories' and tablename = 'prayer_categories') then
    create policy "Read system categories" on public.prayer_categories for select
      using (is_system = true or auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own categories' and tablename = 'prayer_categories') then
    create policy "Own categories" on public.prayer_categories for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own stats' and tablename = 'user_prayer_stats') then
    create policy "Own stats" on public.user_prayer_stats for all using (auth.uid() = user_id);
  end if;
end $$;

-- Basis-Kategorien
insert into public.prayer_categories (name, emoji, color, is_system, sort_order) values
('Heilung',           '🏥', '#E8A0A0', true, 1),
('Beruf',             '💼', '#A0B8E8', true, 2),
('Familie',           '👨‍👩‍👧', '#A0E8B8', true, 3),
('Mission',           '🌍', '#7A9E7E', true, 4),
('Geistlicher Kampf', '🛡️', '#C8A0E8', true, 5),
('Beziehungen',       '💔', '#E8C8A0', true, 6),
('Dankbarkeit',       '🙏', '#D4A853', true, 7),
('Sonstiges',         '➕', '#8A8A8A', true, 8)
on conflict do nothing;

-- Felder an prayer_requests ergänzen
alter table public.prayer_requests
  add column if not exists category_id uuid references public.prayer_categories(id) on delete set null,
  add column if not exists recurrence_type text default 'none'
    check (recurrence_type in ('daily', 'weekly', 'monthly', 'as_needed', 'once', 'none')),
  add column if not exists next_due_date date;

-- Felder an personal_prayer_requests ergänzen
alter table public.personal_prayer_requests
  add column if not exists category_id uuid references public.prayer_categories(id) on delete set null,
  add column if not exists recurrence_type text default 'none'
    check (recurrence_type in ('daily', 'weekly', 'monthly', 'as_needed', 'once', 'none')),
  add column if not exists next_due_date date;

-- Stats für bestehende Nutzer anlegen
insert into public.user_prayer_stats (user_id)
select id from public.profiles
on conflict do nothing;
