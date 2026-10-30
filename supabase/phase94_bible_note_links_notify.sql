-- ============================================================
-- Phase 94: Verknüpfte Verse an Bibel-Notizen + Benachrichtigung bei Kommentar
-- Idempotent.
-- ============================================================

-- Verknüpfte Bibelstellen: Array von VerseAttachments
-- ({bibleId, book, chapter, verseStart, verseEnd, referenceLabel, verseText})
alter table public.bible_notes
  add column if not exists linked_verses jsonb not null default '[]'::jsonb;

-- Neuer Benachrichtigungstyp (bestehende Liste + 'bible_note_comment')
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = ANY (ARRAY[
    'oikos_entry', 'prayer_log', 'prayer_shared', 'community_invite',
    'connection_request', 'connection_accepted', 'friend_request',
    'friend_accepted', 'community_event', 'birthday', 'feed_post',
    'prayer_reminder', 'sibling_requests_reminder', 'weekly_digest',
    'bible_note_comment'
  ]::text[]));

create or replace function public.notify_on_bible_note_comment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_note public.bible_notes%ROWTYPE;
  v_name text;
BEGIN
  SELECT * INTO v_note FROM public.bible_notes WHERE id = NEW.note_id;
  IF v_note.id IS NULL OR v_note.user_id = NEW.author_id THEN RETURN NEW; END IF;
  IF public.is_blocked_pair(v_note.user_id) THEN RETURN NEW; END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.author_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_note.user_id,
    'bible_note_comment',
    COALESCE(v_name, 'Jemand') || ' hat deine Notiz kommentiert 💬',
    left(NEW.body, 140),
    jsonb_build_object(
      'note_id', v_note.id, 'comment_id', NEW.id, 'author_id', NEW.author_id,
      'bible_id', v_note.bible_id, 'book', v_note.book, 'chapter', v_note.chapter,
      'verse_start', v_note.verse_start, 'verse_end', v_note.verse_end
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Trigger-Fehler brechen nie den Original-Insert ab
END;
$function$;

drop trigger if exists on_bible_note_comment_insert on public.bible_note_comments;
create trigger on_bible_note_comment_insert
  after insert on public.bible_note_comments
  for each row execute function public.notify_on_bible_note_comment();
