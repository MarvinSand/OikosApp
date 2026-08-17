-- phase53_notifications_deep_links.sql
-- Idempotent. Run in Supabase SQL Editor.
--
-- 1) notifications.data now carries map_id/person_id/map_owner_id for
--    oikos_entry, prayer_shared and prayer_log notifications, so the
--    frontend can deep-link straight into the map + open the right person
--    instead of just dumping the user on "/" or "/prayers".
-- 2) Adds the missing DELETE policy on notifications (only SELECT/UPDATE
--    existed before), needed so users can delete their own notifications.
-- 3) Adds indexes used by the notification list query and the "delete read
--    notifications older than 1 month" cleanup query.

-- ─── RLS: allow deleting own notifications ─────────────────────────────
drop policy if exists "delete own notifications" on notifications;
create policy "delete own notifications"
  on notifications for delete
  using (user_id = auth.uid());

-- ─── Indexes ────────────────────────────────────────────────────────────
create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);

create index if not exists notifications_user_read_created_idx
  on notifications (user_id, is_read, created_at);

-- ─── notify_on_oikos_entry ──────────────────────────────────────────────
create or replace function public.notify_on_oikos_entry()
returns trigger
language plpgsql
security definer
as $function$
DECLARE
  v_map_owner_id UUID;
  v_owner_name   TEXT;
BEGIN
  SELECT om.user_id INTO v_map_owner_id
    FROM oikos_maps om WHERE om.id = NEW.map_id;

  IF v_map_owner_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO v_owner_name
    FROM profiles WHERE id = v_map_owner_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    np.user_id,
    'oikos_entry',
    COALESCE(v_owner_name, 'Jemand') || ' hat jemanden hinzugefügt 🗺',
    '„' || NEW.name || '" wurde zur OIKOS-Map hinzugefügt',
    jsonb_build_object('map_id', NEW.map_id, 'person_id', NEW.id, 'map_owner_id', v_map_owner_id)
  FROM notification_preferences np
  WHERE np.target_user_id = v_map_owner_id
    AND np.notify_oikos_entries = TRUE
    AND np.user_id <> v_map_owner_id;

  RETURN NEW;
END;
$function$;

-- ─── notify_on_prayer_request ───────────────────────────────────────────
create or replace function public.notify_on_prayer_request()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_map_owner_id  UUID;
  v_map_id        UUID;
  v_person_name   TEXT;
  v_owner_name    TEXT;
  v_adder_name    TEXT;
BEGIN
  SELECT om.user_id, om.id, op.name
    INTO v_map_owner_id, v_map_id, v_person_name
  FROM oikos_people op
  JOIN oikos_maps om ON om.id = op.map_id
  WHERE op.id = NEW.person_id;

  IF v_map_owner_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO v_adder_name FROM profiles WHERE id = NEW.owner_id;
  SELECT full_name INTO v_owner_name FROM profiles WHERE id = v_map_owner_id;

  -- Jemand anderes hat ein Anliegen auf DEINER Map hinzugefügt → dich direkt benachrichtigen
  IF v_map_owner_id <> NEW.owner_id THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_map_owner_id, 'prayer_shared',
      COALESCE(v_adder_name, 'Jemand') || ' hat ein Anliegen hinzugefügt 🙏',
      'Für ' || COALESCE(v_person_name, 'eine Person') || ': „' || COALESCE(NEW.title, '…') || '"',
      jsonb_build_object('map_id', v_map_id, 'person_id', NEW.person_id, 'map_owner_id', v_map_owner_id)
    );
  END IF;

  -- Follower mit notify_prayer_requests = TRUE benachrichtigen
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    np.user_id, 'prayer_shared',
    COALESCE(v_owner_name, 'Jemand') || ' hat ein neues Anliegen 🙏',
    'Für ' || COALESCE(v_person_name, 'eine Person') || ': „' || COALESCE(NEW.title, '…') || '"',
    jsonb_build_object('map_id', v_map_id, 'person_id', NEW.person_id, 'map_owner_id', v_map_owner_id)
  FROM notification_preferences np
  WHERE np.target_user_id = v_map_owner_id
    AND np.notify_prayer_requests = TRUE
    AND np.user_id <> v_map_owner_id
    AND np.user_id <> NEW.owner_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Trigger-Fehler brechen niemals den Original-Insert ab
END;
$function$;

-- ─── notify_on_prayer_log ────────────────────────────────────────────────
create or replace function public.notify_on_prayer_log()
returns trigger
language plpgsql
security definer
as $function$
DECLARE
  v_map_owner_id  UUID;
  v_map_id        UUID;
  v_person_id     UUID;
  v_person_name   TEXT;
  v_request_title TEXT;
  v_praying_name  TEXT;
BEGIN
  -- Map-Owner der beteten Person ermitteln
  SELECT om.user_id, om.id, op.id, op.name
    INTO v_map_owner_id, v_map_id, v_person_id, v_person_name
  FROM prayer_requests pr
  JOIN oikos_people op ON op.id = pr.person_id
  JOIN oikos_maps   om ON om.id = op.map_id
  WHERE pr.id = NEW.prayer_request_id;

  -- Nicht sich selbst notifizieren
  IF v_map_owner_id IS NULL OR v_map_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Namen des Betenden und Titel des Anliegens holen
  SELECT p.full_name INTO v_praying_name
    FROM profiles p WHERE p.id = NEW.user_id;

  SELECT pr.title INTO v_request_title
    FROM prayer_requests pr WHERE pr.id = NEW.prayer_request_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_map_owner_id,
    'prayer_log',
    COALESCE(v_praying_name, 'Jemand') || ' hat gebetet 🙏',
    'Für ' || COALESCE(v_person_name, 'eine Person')
      || ': „' || COALESCE(v_request_title, '…') || '"',
    jsonb_build_object('map_id', v_map_id, 'person_id', v_person_id, 'map_owner_id', v_map_owner_id)
  );

  RETURN NEW;
END;
$function$;
