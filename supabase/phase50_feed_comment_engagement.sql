-- Phase 50: Kommentare wie eigene Feed-Posts behandeln (Twitter-artig)
--
-- Hintergrund: Kommentare auf einen Feed-Post sollen jetzt genau wie eigene
-- Posts aussehen (gleiche Karte, gleiche Icon-Leiste: Kommentar/Repost/Like/
-- Bookmark/Teilen) und anklickbar sein, um einen eigenen Thread mit allen
-- Antworten auf diesen Kommentar zu öffnen (/feed/comment/:id). Dafür braucht
-- jeder Kommentar dieselbe Engagement-Infrastruktur wie ein Post.
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

create table if not exists public.feed_comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid references public.feed_comments(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

create table if not exists public.feed_comment_reposts (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid references public.feed_comments(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

-- Bookmark-Sammlungen (feed_bookmark_collections aus Phase 48) sind nutzerbezogen
-- und werden hier wiederverwendet, damit Post- und Kommentar-Bookmarks dieselben
-- Kategorien teilen.
create table if not exists public.feed_comment_bookmarks (
  id            uuid primary key default gen_random_uuid(),
  comment_id    uuid references public.feed_comments(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  collection_id uuid references public.feed_bookmark_collections(id) on delete set null,
  created_at    timestamptz default now(),
  unique(comment_id, user_id)
);

alter table public.feed_comments add column if not exists like_count     integer not null default 0;
alter table public.feed_comments add column if not exists repost_count   integer not null default 0;
alter table public.feed_comments add column if not exists bookmark_count integer not null default 0;

alter table public.feed_comment_likes     enable row level security;
alter table public.feed_comment_reposts   enable row level security;
alter table public.feed_comment_bookmarks enable row level security;

drop policy if exists "Auth read feed comment likes"   on public.feed_comment_likes;
drop policy if exists "Own feed comment likes"          on public.feed_comment_likes;
drop policy if exists "Auth read feed comment reposts"  on public.feed_comment_reposts;
drop policy if exists "Own feed comment reposts"        on public.feed_comment_reposts;
drop policy if exists "Own feed comment bookmarks"      on public.feed_comment_bookmarks;

create policy "Auth read feed comment likes"
  on public.feed_comment_likes for select
  using (auth.uid() is not null);
create policy "Own feed comment likes"
  on public.feed_comment_likes for all
  using (auth.uid() = user_id);

create policy "Auth read feed comment reposts"
  on public.feed_comment_reposts for select
  using (auth.uid() is not null);
create policy "Own feed comment reposts"
  on public.feed_comment_reposts for all
  using (auth.uid() = user_id);

-- Bookmarks bleiben privat, wie bei Posts (Phase 47/49): nur Ersteller sieht sie,
-- die Anzahl wird per Trigger unten öffentlich mitgezählt.
create policy "Own feed comment bookmarks"
  on public.feed_comment_bookmarks for all
  using (auth.uid() = user_id);

-- Zähl-Trigger für like_count / repost_count / bookmark_count auf feed_comments.
create or replace function public.feed_comment_engagement_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  col text;
  delta int;
begin
  if (tg_op = 'INSERT') then
    target_id := new.comment_id;
    delta := 1;
  else
    target_id := old.comment_id;
    delta := -1;
  end if;

  if (tg_table_name = 'feed_comment_likes') then
    col := 'like_count';
  elsif (tg_table_name = 'feed_comment_reposts') then
    col := 'repost_count';
  else
    col := 'bookmark_count';
  end if;

  if (delta = 1) then
    execute format('update public.feed_comments set %I = %I + 1 where id = $1', col, col) using target_id;
  else
    execute format('update public.feed_comments set %I = greatest(%I - 1, 0) where id = $1', col, col) using target_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_feed_comment_likes_count     on public.feed_comment_likes;
drop trigger if exists trg_feed_comment_reposts_count   on public.feed_comment_reposts;
drop trigger if exists trg_feed_comment_bookmarks_count on public.feed_comment_bookmarks;

create trigger trg_feed_comment_likes_count
  after insert or delete on public.feed_comment_likes
  for each row execute function public.feed_comment_engagement_count_trigger();

create trigger trg_feed_comment_reposts_count
  after insert or delete on public.feed_comment_reposts
  for each row execute function public.feed_comment_engagement_count_trigger();

create trigger trg_feed_comment_bookmarks_count
  after insert or delete on public.feed_comment_bookmarks
  for each row execute function public.feed_comment_engagement_count_trigger();

NOTIFY pgrst, 'reload schema';
