-- Phase 47: Feed-Engagement (Views, Reposts, Bookmarks)
--
-- Hintergrund: Der For-You-Feed bekommt eine Twitter-artige Icon-Leiste
-- (Kommentar, Repost, Like, Aufrufe, Bookmark, Teilen). Like nutzt die
-- bestehende feed_reactions-Tabelle (type = 'heart'). Für Repost, Bookmark
-- und Aufrufe fehlen bislang Spalten/Tabellen — die legt diese Migration an.
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

alter table public.feed_posts
  add column if not exists view_count integer not null default 0;

create table if not exists public.feed_reposts (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.feed_posts(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

create table if not exists public.feed_bookmarks (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.feed_posts(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.feed_reposts   enable row level security;
alter table public.feed_bookmarks enable row level security;

drop policy if exists "Auth read feed reposts" on public.feed_reposts;
drop policy if exists "Own feed reposts"       on public.feed_reposts;
drop policy if exists "Own feed bookmarks"     on public.feed_bookmarks;

create policy "Auth read feed reposts"
  on public.feed_reposts for select
  using (auth.uid() is not null);

create policy "Own feed reposts"
  on public.feed_reposts for all
  using (auth.uid() = user_id);

-- Bookmarks sind privat: nur der Ersteller sieht/verwaltet seine eigenen.
create policy "Own feed bookmarks"
  on public.feed_bookmarks for all
  using (auth.uid() = user_id);

-- Aufrufe zählen: atomarer Increment, jede*r Eingeloggte darf zählen.
create or replace function public.increment_feed_post_view(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.feed_posts set view_count = view_count + 1 where id = p_post_id;
$$;

grant execute on function public.increment_feed_post_view(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';
