-- ============================================================
-- Phase 69: Benachrichtigung bei neuer Direktnachricht
-- ============================================================
-- Bisher gab es für neue Chat-Nachrichten überhaupt keinen Trigger – weder
-- In-App-Benachrichtigung noch (dadurch auch) Push. Bewusst nur für
-- `type = 'direct'`-Konversationen (1:1), nicht für Community-/Activity-Chats:
-- dort würde jede Nachricht an alle Mitglieder gleichzeitig eine Flut von
-- Benachrichtigungen auslösen.
--
-- Gleiche Struktur wie notify_on_friend_request: Exception-safe, damit ein
-- Fehler hier nie das eigentliche Senden der Nachricht blockiert.
-- Idempotent – kann mehrfach ausgeführt werden.

create or replace function public.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_conversation_type TEXT;
  v_sender_name TEXT;
  v_preview TEXT;
  v_recipient RECORD;
BEGIN
  IF NEW.is_deleted THEN RETURN NEW; END IF;

  SELECT type INTO v_conversation_type
    FROM public.conversations WHERE id = NEW.conversation_id;

  IF v_conversation_type IS DISTINCT FROM 'direct' THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, username, 'Jemand') INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  -- Kurzvorschau statt des vollen Texts; Bilder/Gebete etc. haben keinen
  -- brauchbaren `text` – dafür einen sprechenden Platzhalter zeigen.
  v_preview := CASE
    WHEN NEW.text IS NOT NULL AND length(trim(NEW.text)) > 0
      THEN left(trim(NEW.text), 120)
    WHEN NEW.image_path IS NOT NULL THEN '📷 Foto'
    WHEN NEW.personal_prayer_request_id IS NOT NULL OR NEW.prayer_request_id IS NOT NULL
      THEN '🙏 Gebetsanliegen geteilt'
    WHEN NEW.bible_verse_reference IS NOT NULL THEN '📖 ' || NEW.bible_verse_reference
    ELSE 'Neue Nachricht'
  END;

  -- Alle anderen Mitglieder der Konversation benachrichtigen (bei 1:1 ist
  -- das genau eine Person, Gruppen-DMs gibt es bei type='direct' nicht).
  FOR v_recipient IN
    SELECT user_id FROM public.conversation_members
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_recipient.user_id,
      'message',
      v_sender_name,
      v_preview,
      -- `url`: send-push (APNs) liest nur dieses Feld für das Sprungziel beim
      -- Tap; resolveDestination() in NotificationsPage.jsx liest stattdessen
      -- conversation_id direkt. Beides gesetzt, damit In-App-Liste und Push
      -- konsistent zum selben Chat springen.
      jsonb_build_object(
        'conversation_id', NEW.conversation_id, 'message_id', NEW.id, 'sender_id', NEW.sender_id,
        'url', '/chat/' || NEW.conversation_id
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

drop trigger if exists on_direct_message_insert on public.messages;
create trigger on_direct_message_insert
  after insert on public.messages
  for each row execute function public.notify_on_direct_message();
