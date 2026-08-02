-- Phase 48: Kategorien für gespeicherte Feed-Posts (Bookmark-Sammlungen)
--
-- Hintergrund: Neben dem Filter im Feed gibt es jetzt ein Bookmark-Symbol,
-- über das man seine gespeicherten Posts sieht. Beim Speichern eines Posts
-- kann man ihn – wie bei Instagram – ohne Kategorie oder in eine
-- selbst angelegte Sammlung speichern.
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

create table if not exists public.feed_bookmark_collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table public.feed_bookmarks
  add column if not exists collection_id uuid references public.feed_bookmark_collections(id) on delete set null;

alter table public.feed_bookmark_collections enable row level security;

drop policy if exists "Own bookmark collections" on public.feed_bookmark_collections;

create policy "Own bookmark collections"
  on public.feed_bookmark_collections for all
  using (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
