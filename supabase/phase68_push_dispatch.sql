-- ============================================================
-- Phase 68: Native Push – Trigger auf notifications
-- ============================================================
-- Gleiche Mechanik wie notify_email_dispatch: sobald eine Benachrichtigung
-- angelegt wird, ruft der Trigger die Edge Function `send-push` auf, die sie
-- an APNs weiterreicht. Das Secret liegt im Vault, damit es nicht in der
-- Funktionsdefinition steht.
--
-- Wichtig: Der Trigger darf das Insert NIE scheitern lassen – die In-App-
-- Benachrichtigung ist die Hauptsache, der Push nur die Zustellung. Deshalb
-- schluckt der EXCEPTION-Block alles.
--
-- Voraussetzung: im Vault muss `push_webhook_secret` liegen (gleicher Wert wie
-- das Function-Secret PUSH_WEBHOOK_SECRET).
-- Idempotent – kann mehrfach ausgeführt werden.

create or replace function public.notify_push_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_secret TEXT;
  v_has_device BOOLEAN;
BEGIN
  -- Ohne registriertes Gerät ist der HTTP-Call reine Verschwendung.
  SELECT EXISTS (
    SELECT 1 FROM public.device_tokens WHERE user_id = NEW.user_id
  ) INTO v_has_device;

  IF NOT v_has_device THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';

  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://mnmjkmfdggscwfpoygwb.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Webhook-Secret', v_secret),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

drop trigger if exists on_notification_push_dispatch on public.notifications;
create trigger on_notification_push_dispatch
  after insert on public.notifications
  for each row execute function public.notify_push_dispatch();
