-- phase56_notify_friend_request.sql
-- Idempotent. Run in Supabase SQL Editor.
--
-- Bug: `friendships` had no INSERT trigger at all, so a friend request never
-- created a notification for the addressee - it only ever showed up inside
-- FriendsView's own pending-requests list, never in the notification tab.
-- Adds a trigger that creates a 'friend_request' notification carrying
-- friendship_id + requester_id, so the notification tab can render
-- Profil ansehen / Annehmen / Ablehnen actions directly.

create or replace function public.notify_on_friend_request()
returns trigger
language plpgsql
security definer
as $function$
DECLARE
  v_requester_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN RETURN NEW; END IF;

  SELECT full_name INTO v_requester_name FROM profiles WHERE id = NEW.requester_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.addressee_id,
    'friend_request',
    COALESCE(v_requester_name, 'Jemand') || ' möchte sich mit dir verbinden 👋',
    'Freundschaftsanfrage',
    jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.requester_id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Trigger-Fehler brechen niemals den Original-Insert ab
END;
$function$;

drop trigger if exists on_friendship_insert on friendships;
create trigger on_friendship_insert
  after insert on friendships
  for each row execute function notify_on_friend_request();
