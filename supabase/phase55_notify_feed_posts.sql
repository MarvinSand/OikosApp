-- phase55_notify_feed_posts.sql
-- Idempotent. Run in Supabase SQL Editor.
--
-- Adds "Neue Feed-Beiträge" as an opt-in notification preference (2nd in the
-- list in UserProfile.jsx's notification-bell sheet) + a DB trigger that
-- creates the notification when the followed person posts in the feed.
-- Respects visibility: skips users who are excluded, and for
-- visibility_mode = 'specific_include' only notifies users on the allow-list.

alter table notification_preferences
  add column if not exists notify_feed_posts boolean default false;

create or replace function public.notify_on_feed_post()
returns trigger
language plpgsql
security definer
as $function$
DECLARE
  v_author_name TEXT;
BEGIN
  SELECT full_name INTO v_author_name FROM profiles WHERE id = NEW.author_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    np.user_id,
    'feed_post',
    COALESCE(v_author_name, 'Jemand') || ' hat etwas im Feed geteilt 📝',
    left(COALESCE(NEW.title, NEW.body), 140),
    jsonb_build_object('post_id', NEW.id, 'author_id', NEW.author_id)
  FROM notification_preferences np
  WHERE np.target_user_id = NEW.author_id
    AND np.notify_feed_posts = TRUE
    AND np.user_id <> NEW.author_id
    AND NOT (np.user_id = ANY(COALESCE(NEW.excluded_user_ids, ARRAY[]::uuid[])))
    AND (
      NEW.visibility_mode IS DISTINCT FROM 'specific_include'
      OR np.user_id = ANY(COALESCE(NEW.visibility_user_ids, ARRAY[]::uuid[]))
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Trigger-Fehler brechen niemals den Original-Insert ab
END;
$function$;

drop trigger if exists on_feed_post_insert on feed_posts;
create trigger on_feed_post_insert
  after insert on feed_posts
  for each row execute function notify_on_feed_post();
