-- phase59_reminder_notifications.sql
-- Idempotent. Run in Supabase SQL Editor.
--
-- Drei periodische Erinnerungs-Notifications via pg_cron, exakt nach dem
-- Muster der bestehenden notify_on_*-Trigger (INSERT INTO notifications mit
-- data-jsonb, EXCEPTION WHEN OTHERS für Fehlertoleranz). Jede Funktion
-- vermeidet Spam über einen NOT-EXISTS-Cooldown-Check gegen die
-- notifications-Tabelle selbst (kein separates Tracking nötig).

create extension if not exists pg_cron;

-- ── 1. "Lange nicht gebetet" ─────────────────────────────────────────────
-- Für jede Oikos-Person mit offenem Anliegen: wenn der Map-Besitzer seit
-- ≥14 Tagen nicht mehr für sie gebetet hat (oder nie, bei ≥14 Tage altem
-- Anliegen), eine Erinnerung schicken. Cooldown: 14 Tage pro Person.
create or replace function public.remind_not_prayed_recently()
returns void
language plpgsql
security definer
as $function$
DECLARE
  rec RECORD;
  v_last_prayed TIMESTAMPTZ;
  v_days INT;
BEGIN
  FOR rec IN
    SELECT DISTINCT op.id AS person_id, op.name AS person_name, op.map_id, om.user_id AS owner_id
    FROM oikos_people op
    JOIN oikos_maps om ON om.id = op.map_id
    JOIN prayer_requests pr ON pr.person_id = op.id AND pr.is_answered = FALSE
  LOOP
    -- Verschachtelter Block: ein Fehler bei einer Person darf nicht die
    -- bereits eingefügten Erinnerungen der restlichen Personen zurückrollen
    -- (ein reines EXCEPTION am Funktionsende würde den GESAMTEN Lauf zurückrollen).
    BEGIN
      SELECT MAX(pl.created_at) INTO v_last_prayed
      FROM prayer_logs pl
      JOIN prayer_requests pr ON pr.id = pl.prayer_request_id
      WHERE pr.person_id = rec.person_id AND pl.user_id = rec.owner_id;

      IF v_last_prayed IS NOT NULL THEN
        v_days := ROUND(EXTRACT(EPOCH FROM (now() - v_last_prayed)) / 86400)::int;
      ELSE
        SELECT ROUND(EXTRACT(EPOCH FROM (now() - MIN(pr.created_at))) / 86400)::int INTO v_days
        FROM prayer_requests pr WHERE pr.person_id = rec.person_id AND pr.is_answered = FALSE;
      END IF;

      CONTINUE WHEN v_days IS NULL OR v_days < 14;

      CONTINUE WHEN EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = rec.owner_id AND n.type = 'prayer_reminder'
          AND n.data->>'person_id' = rec.person_id::text
          AND n.created_at > now() - interval '14 days'
      );

      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        rec.owner_id, 'prayer_reminder',
        'Schon eine Weile her ⏰',
        'Du hast seit ' || v_days || ' Tagen nicht mehr für ' || rec.person_name || ' gebetet',
        jsonb_build_object('map_id', rec.map_id, 'person_id', rec.person_id, 'days_since', v_days)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- diese Person/diesen User überspringen, Lauf fortsetzen
    END;
  END LOOP;
END;
$function$;

-- ── 2. "Offene Anliegen von Geschwistern" ────────────────────────────────
-- Zählt öffentliche Oikos-Anliegen + Geschwister-/öffentliche persönliche
-- Anliegen befreundeter Personen, für die der User noch nicht gebetet hat.
-- Sammel-Erinnerung, Cooldown: 3 Tage.
create or replace function public.remind_open_sibling_requests()
returns void
language plpgsql
security definer
as $function$
DECLARE
  rec RECORD;
  v_count INT;
BEGIN
  FOR rec IN
    SELECT DISTINCT u.id AS user_id
    FROM auth.users u
    WHERE EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted' AND (f.requester_id = u.id OR f.addressee_id = u.id)
    )
  LOOP
    BEGIN
      SELECT
        (SELECT count(*) FROM prayer_requests pr
          JOIN oikos_people op ON op.id = pr.person_id
          JOIN oikos_maps om ON om.id = op.map_id
          JOIN friendships f ON f.status = 'accepted'
            AND ((f.requester_id = om.user_id AND f.addressee_id = rec.user_id)
              OR (f.addressee_id = om.user_id AND f.requester_id = rec.user_id))
          WHERE pr.is_public = TRUE AND pr.is_answered = FALSE
            AND NOT EXISTS (SELECT 1 FROM prayer_logs pl WHERE pl.prayer_request_id = pr.id AND pl.user_id = rec.user_id))
        +
        (SELECT count(*) FROM personal_prayer_requests ppr
          JOIN friendships f ON f.status = 'accepted'
            AND ((f.requester_id = ppr.owner_id AND f.addressee_id = rec.user_id)
              OR (f.addressee_id = ppr.owner_id AND f.requester_id = rec.user_id))
          WHERE ppr.visibility IN ('public', 'siblings') AND ppr.is_answered = FALSE
            AND NOT EXISTS (SELECT 1 FROM personal_prayer_logs pl WHERE pl.request_id = ppr.id AND pl.user_id = rec.user_id))
      INTO v_count;

      CONTINUE WHEN v_count = 0;
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = rec.user_id AND n.type = 'sibling_requests_reminder'
          AND n.created_at > now() - interval '3 days'
      );

      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        rec.user_id, 'sibling_requests_reminder',
        'Noch offene Anliegen 📋',
        'Es gibt noch ' || v_count || ' Gebetsanliegen von Geschwistern, für die du noch nicht gebetet hast',
        jsonb_build_object('count', v_count)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$function$;

-- ── 3. "Wochenrückblick" ──────────────────────────────────────────────────
-- Sonntagabend: Anzahl gebeteter Anliegen (letzte 7 Tage) + Anzahl eigener
-- offener Anliegen (Oikos + persönlich). Cooldown: 6 Tage.
create or replace function public.weekly_digest()
returns void
language plpgsql
security definer
as $function$
DECLARE
  rec RECORD;
  v_prayed_count INT;
  v_open_count INT;
BEGIN
  FOR rec IN SELECT id AS user_id FROM profiles LOOP
    BEGIN
      SELECT
        (SELECT count(*) FROM prayer_logs WHERE user_id = rec.user_id AND created_at > now() - interval '7 days')
        + (SELECT count(*) FROM personal_prayer_logs WHERE user_id = rec.user_id AND created_at > now() - interval '7 days')
      INTO v_prayed_count;

      SELECT
        (SELECT count(*) FROM prayer_requests pr
          JOIN oikos_people op ON op.id = pr.person_id
          JOIN oikos_maps om ON om.id = op.map_id
          WHERE om.user_id = rec.user_id AND pr.is_answered = FALSE)
        + (SELECT count(*) FROM personal_prayer_requests WHERE owner_id = rec.user_id AND is_answered = FALSE)
      INTO v_open_count;

      CONTINUE WHEN v_prayed_count = 0 AND v_open_count = 0;
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = rec.user_id AND n.type = 'weekly_digest'
          AND n.created_at > now() - interval '6 days'
      );

      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        rec.user_id, 'weekly_digest',
        'Dein Wochenrückblick 📊',
        'Diese Woche hast du für ' || v_prayed_count || ' Anliegen gebetet, ' || v_open_count || ' sind noch offen',
        jsonb_build_object('prayed_count', v_prayed_count, 'open_count', v_open_count)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$function$;

-- ── Scheduling ────────────────────────────────────────────────────────────
-- cron.schedule() mit bereits vergebenem Job-Namen plant den Job neu
-- (idempotent), legt ihn also nicht doppelt an.
select cron.schedule('remind-not-prayed-recently', '0 6 * * *', $$select public.remind_not_prayed_recently();$$);
select cron.schedule('remind-open-sibling-requests', '0 7 */2 * *', $$select public.remind_open_sibling_requests();$$);
select cron.schedule('weekly-digest', '0 18 * * 0', $$select public.weekly_digest();$$);
