-- Phase 25: Geführter Gebetsmodus, Updates & Erhörte Gebete

-- Gebets-Sessions (Tracking)
create table if not exists public.prayer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  list_id uuid references public.prayer_lists(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  prayers_count integer default 0,
  duration_seconds integer default 0,
  created_at timestamptz default now()
);

-- Updates zu Gebetsanliegen
create table if not exists public.prayer_updates (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid references public.prayer_requests(id) on delete cascade,
  personal_prayer_request_id uuid references public.personal_prayer_requests(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  update_type text default 'update' check (
    update_type in ('update', 'answered', 'new_situation', 'encouragement', 'praise')
  ),
  is_public boolean default true,
  created_at timestamptz default now(),
  constraint one_request_type_update check (
    (prayer_request_id is null) != (personal_prayer_request_id is null)
  )
);

-- Erhörte-Gebete-Felder an bestehende Tabellen
alter table public.prayer_requests
  add column if not exists answered_at timestamptz,
  add column if not exists answered_note text,
  add column if not exists share_as_testimony boolean default false;

alter table public.personal_prayer_requests
  add column if not exists answered_at timestamptz,
  add column if not exists answered_note text,
  add column if not exists share_as_testimony boolean default false;

-- RLS
alter table public.prayer_sessions enable row level security;
alter table public.prayer_updates enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own sessions' and tablename = 'prayer_sessions') then
    create policy "Own sessions" on public.prayer_sessions for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Own updates' and tablename = 'prayer_updates') then
    create policy "Own updates" on public.prayer_updates for all using (auth.uid() = author_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Public updates readable' and tablename = 'prayer_updates') then
    create policy "Public updates readable" on public.prayer_updates for select
      using (is_public = true and auth.uid() is not null);
  end if;
end $$;
