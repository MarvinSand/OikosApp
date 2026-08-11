-- ════════════════════════════════════════════════════════════════════════
-- Phase 61: Antworten auf Gebets-Kommentare (prayer_notes.reply_to_id)
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent.
--
-- Öffentliche Antworten auf einen Kommentar hängen jetzt direkt am
-- Eltern-Kommentar (reply_to_id). Private Antworten laufen weiterhin über
-- den normalen Chat (keine DB-Änderung nötig) und verweisen dort nur per
-- Text auf den zitierten Kommentar.
-- ════════════════════════════════════════════════════════════════════════

alter table public.prayer_notes
  add column if not exists reply_to_id uuid references public.prayer_notes(id) on delete set null;

create index if not exists prayer_notes_reply_to_idx on public.prayer_notes(reply_to_id);

NOTIFY pgrst, 'reload schema';
