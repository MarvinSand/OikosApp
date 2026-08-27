-- ============================================================
-- Phase 62: Bibelvers-Verknüpfung für Feed-Posts + Gebete
-- Run this in the Supabase SQL Editor
-- ============================================================
-- Ermöglicht, einen Feed-Post oder ein Gebet mit einer konkreten Bibelstelle
-- zu verknüpfen (strukturiert, nicht nur Freitext), damit ein Klick auf die
-- Referenz direkt an die exakte Stelle im Bibel-Reader (/bible) springen kann.
--
-- feed_posts.bible_reference / bible_verse existieren bereits (Freitext, aus
-- phase15_feed_places.sql) - hier kommen nur die strukturierten Felder dazu.
-- personal_prayer_requests hatte bisher GAR KEINE Bibel-Spalten.

alter table public.feed_posts
  add column if not exists bible_id          text,
  add column if not exists bible_book        text,
  add column if not exists bible_chapter     integer,
  add column if not exists bible_verse_start integer,
  add column if not exists bible_verse_end   integer;

alter table public.personal_prayer_requests
  add column if not exists bible_reference   text,
  add column if not exists bible_verse       text,
  add column if not exists bible_id          text,
  add column if not exists bible_book        text,
  add column if not exists bible_chapter     integer,
  add column if not exists bible_verse_start integer,
  add column if not exists bible_verse_end   integer;
