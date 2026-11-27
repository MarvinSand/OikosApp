-- Phase 111: Bibelvers-Nachrichten mit strukturierter Stelle (Link in die Bibel)
-- messages.text = optionaler Begleittext zum Vers; die Spalten bible_* erlauben,
-- dass der Verslink im Chat exakt zur Stelle (mit Kontext) in der Bibel springt.
-- Ältere Vers-Nachrichten ohne diese Spalten werden über die Stellenangabe geparst.
alter table public.messages
  add column if not exists bible_id text,
  add column if not exists bible_book text,
  add column if not exists bible_chapter integer,
  add column if not exists bible_verse_start integer,
  add column if not exists bible_verse_end integer;
