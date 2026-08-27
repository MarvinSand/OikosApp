-- ============================================================
-- Phase 63: Gespeicherte Highlight-Farben (Bibel)
-- Run this in the Supabase SQL Editor
-- ============================================================
-- Zusätzlich zu den 5 Presets (im Code, HIGHLIGHT_COLORS) können Nutzer:innen
-- eine per <input type="color"> gewählte Farbe speichern, damit sie beim
-- nächsten Markieren direkt in der Leiste auswählbar ist. Presets werden
-- weiterhin per Namen in bible_highlights.color gehalten - hier landen nur
-- Hex-Werte ('#rrggbb').

create table if not exists public.bible_saved_colors (
  user_id    uuid references public.profiles(id) on delete cascade not null,
  color      text not null,
  created_at timestamptz default now(),
  primary key (user_id, color)
);

alter table public.bible_saved_colors enable row level security;

drop policy if exists "Own saved colors" on public.bible_saved_colors;
create policy "Own saved colors" on public.bible_saved_colors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
