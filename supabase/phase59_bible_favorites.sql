-- ============================================================
-- Phase 59: Favoriten-Übersetzungen (Bibel)
-- Run this in the Supabase SQL Editor
-- ============================================================
-- YouVersion bietet 1400+ Übersetzungen (GET /v1/bibles?language_ranges[]=*,
-- paginiert über next_page_token). Damit Nutzer:innen aus dieser Menge
-- schnell ihre Übersetzungen wiederfinden, können sie einzelne Bibel-IDs
-- als Favorit markieren - hier persistiert statt in localStorage, damit es
-- geräteübergreifend funktioniert.

create table if not exists public.bible_favorite_versions (
  user_id    uuid references public.profiles(id) on delete cascade not null,
  bible_id   text not null,
  created_at timestamptz default now(),
  primary key (user_id, bible_id)
);

alter table public.bible_favorite_versions enable row level security;

drop policy if exists "Own favorite versions" on public.bible_favorite_versions;
create policy "Own favorite versions" on public.bible_favorite_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
