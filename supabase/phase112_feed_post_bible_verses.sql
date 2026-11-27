-- Phase 112: Mehrere Bibelstellen pro Feed-Beitrag
-- feed_posts.bible_verses = jsonb-Array von { bibleId, book, chapter, verseStart,
-- verseEnd, referenceLabel }. Ein Zitat steht als Text direkt hinter dem
-- Stellennamen im Beitrag (body). Die alten Einzel-Spalten (bible_reference, …)
-- werden weiter mit der ersten Stelle befüllt (Kompatibilität/Teilen).
alter table public.feed_posts add column if not exists bible_verses jsonb;
