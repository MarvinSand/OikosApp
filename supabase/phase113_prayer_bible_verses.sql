-- Phase 113: Mehrere Bibelstellen pro Gebet (wie Feed-Beiträge, phase112)
-- personal_prayer_requests.bible_verses = jsonb-Array { bibleId, book, chapter,
-- verseStart, verseEnd, referenceLabel }; Zitate stehen im Gebetstext hinter dem Namen.
alter table public.personal_prayer_requests add column if not exists bible_verses jsonb;
