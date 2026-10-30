-- ============================================================
-- Phase 93: Likes + Kommentare unter Bibel-Notizen (wie Feed-Posts)
-- Sichtbar genau dann, wenn die Notiz sichtbar ist (RLS von bible_notes
-- greift in der Subquery). Idempotent.
-- ============================================================

create table if not exists public.bible_note_comments (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.bible_notes(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_bible_note_comments_note on public.bible_note_comments (note_id, created_at);
create index if not exists idx_bible_note_comments_author on public.bible_note_comments (author_id);
alter table public.bible_note_comments enable row level security;

drop policy if exists "Read bible note comments" on public.bible_note_comments;
create policy "Read bible note comments" on public.bible_note_comments for select to authenticated
  using (exists (select 1 from public.bible_notes n where n.id = bible_note_comments.note_id));
drop policy if exists "Insert own bible note comments" on public.bible_note_comments;
create policy "Insert own bible note comments" on public.bible_note_comments for insert to authenticated
  with check ((select auth.uid()) = author_id
    and exists (select 1 from public.bible_notes n where n.id = bible_note_comments.note_id));
drop policy if exists "Delete own bible note comments" on public.bible_note_comments;
create policy "Delete own bible note comments" on public.bible_note_comments for delete to authenticated
  using ((select auth.uid()) = author_id);
drop policy if exists "Hide blocked users" on public.bible_note_comments;
create policy "Hide blocked users" on public.bible_note_comments as restrictive for select to authenticated
  using (not public.is_blocked_pair(author_id));

create table if not exists public.bible_note_likes (
  note_id    uuid not null references public.bible_notes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);
create index if not exists idx_bible_note_likes_user on public.bible_note_likes (user_id);
alter table public.bible_note_likes enable row level security;

drop policy if exists "Read bible note likes" on public.bible_note_likes;
create policy "Read bible note likes" on public.bible_note_likes for select to authenticated
  using (exists (select 1 from public.bible_notes n where n.id = bible_note_likes.note_id));
drop policy if exists "Insert own bible note likes" on public.bible_note_likes;
create policy "Insert own bible note likes" on public.bible_note_likes for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.bible_notes n where n.id = bible_note_likes.note_id));
drop policy if exists "Delete own bible note likes" on public.bible_note_likes;
create policy "Delete own bible note likes" on public.bible_note_likes for delete to authenticated
  using ((select auth.uid()) = user_id);
