-- ============================================================
-- Phase 86: Kommentare unter Bekenntnissen
-- Sichtbar ist ein Kommentar genau dann, wenn das Bekenntnis sichtbar ist
-- (die RLS von `creeds` greift in der Subquery). Idempotent.
-- ============================================================

create table if not exists public.creed_comments (
  id         uuid primary key default gen_random_uuid(),
  creed_id   uuid not null references public.creeds(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_creed_comments_creed_id  on public.creed_comments (creed_id, created_at);
create index if not exists idx_creed_comments_author_id on public.creed_comments (author_id);

alter table public.creed_comments enable row level security;

drop policy if exists "Read creed comments" on public.creed_comments;
create policy "Read creed comments" on public.creed_comments
  for select to authenticated
  using (exists (select 1 from public.creeds c where c.id = creed_comments.creed_id));

drop policy if exists "Insert own creed comments" on public.creed_comments;
create policy "Insert own creed comments" on public.creed_comments
  for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (select 1 from public.creeds c where c.id = creed_comments.creed_id)
  );

drop policy if exists "Delete own creed comments" on public.creed_comments;
create policy "Delete own creed comments" on public.creed_comments
  for delete to authenticated
  using ((select auth.uid()) = author_id);

-- App-Store-Richtlinie 1.2: Inhalte blockierter Nutzer ausblenden
drop policy if exists "Hide blocked users" on public.creed_comments;
create policy "Hide blocked users" on public.creed_comments
  as restrictive for select to authenticated
  using (not public.is_blocked_pair(author_id));

-- Nachtrag: Autor-FK auf profiles (nötig fürs Profil-Embed), Antworten + Likes
alter table public.creed_comments drop constraint if exists creed_comments_author_id_fkey;
alter table public.creed_comments add constraint creed_comments_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete cascade;
alter table public.creed_comments add column if not exists parent_id uuid references public.creed_comments(id) on delete cascade;
create index if not exists idx_creed_comments_parent_id on public.creed_comments (parent_id);

create table if not exists public.creed_comment_likes (
  comment_id uuid not null references public.creed_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists idx_creed_comment_likes_user_id on public.creed_comment_likes (user_id);
alter table public.creed_comment_likes enable row level security;
drop policy if exists "Read creed comment likes" on public.creed_comment_likes;
create policy "Read creed comment likes" on public.creed_comment_likes for select to authenticated
  using (exists (select 1 from public.creed_comments c where c.id = creed_comment_likes.comment_id));
drop policy if exists "Insert own creed comment likes" on public.creed_comment_likes;
create policy "Insert own creed comment likes" on public.creed_comment_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own creed comment likes" on public.creed_comment_likes;
create policy "Delete own creed comment likes" on public.creed_comment_likes for delete to authenticated
  using ((select auth.uid()) = user_id);
