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
