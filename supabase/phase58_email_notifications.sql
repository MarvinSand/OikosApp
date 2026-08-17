-- phase58_email_notifications.sql
-- Idempotent. Run in Supabase SQL Editor.
--
-- Neue globale (nicht pro-Person) Einstellung: welche Benachrichtigungsarten
-- zusätzlich per E-Mail geschickt werden. Der eigentliche Versand läuft über
-- eine neue Edge Function `send-notification-email` (Resend-HTTP-API), die
-- per pg_net asynchron aus einem AFTER-INSERT-Trigger auf `notifications`
-- angestoßen wird - exakt wie alle bestehenden notify_on_*-Trigger, nur dass
-- diese Funktion zusätzlich eine HTTP-Anfrage feuert statt (nur) eine Zeile
-- einzufügen.
--
-- WICHTIG (siehe Absprache mit dem Nutzer): der tatsächliche Versand
-- funktioniert erst, sobald im Supabase Dashboard unter
-- Edge Functions → send-notification-email → Secrets zwei Werte gesetzt sind:
--   RESEND_API_KEY    = <dein Resend API-Key>
--   WEBHOOK_SECRET     = <derselbe Wert wie unten in vault.create_secret>
-- Bis dahin wird die Einstellung zwar gespeichert, der pg_net-Call schlägt
-- aber fehl (401) - das bricht laut Trigger-Fehlerbehandlung nie den
-- eigentlichen Notification-Insert.

-- ── 1. Speicherung der Präferenz ────────────────────────────────────────
alter table public.profiles
  add column if not exists email_notification_types jsonb not null default '[]'::jsonb;

-- ── 2. pg_net für asynchrone HTTP-Calls aus Triggern ────────────────────
create extension if not exists pg_net;

-- ── 3. Shared Secret in Vault ablegen (Edge Function prüft denselben Wert
--       über den Header X-Webhook-Secret, da die Function ohne User-JWT vom
--       DB-Trigger aus aufgerufen wird) ──────────────────────────────────
select vault.create_secret(
  '61439ecdbe6ef13a99ac76851a3441668d75803ca64a6bb3',
  'notification_email_webhook_secret',
  'Shared secret zwischen notify_email_dispatch()-Trigger und der send-notification-email Edge Function'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'notification_email_webhook_secret'
);

-- ── 4. Trigger-Funktion: prüft E-Mail-Präferenz des Empfängers, feuert
--       bei Treffer asynchron einen HTTP-Call an die Edge Function ────────
create or replace function public.notify_email_dispatch()
returns trigger
language plpgsql
security definer
as $function$
DECLARE
  v_wants_email BOOLEAN;
  v_secret TEXT;
BEGIN
  SELECT (NEW.type IN (SELECT jsonb_array_elements_text(email_notification_types)))
    INTO v_wants_email
  FROM public.profiles WHERE id = NEW.user_id;

  IF NOT COALESCE(v_wants_email, FALSE) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'notification_email_webhook_secret';

  PERFORM net.http_post(
    url := 'https://mnmjkmfdggscwfpoygwb.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Webhook-Secret', v_secret),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Trigger-Fehler brechen niemals den Original-Insert ab
END;
$function$;

drop trigger if exists on_notification_email_dispatch on public.notifications;
create trigger on_notification_email_dispatch
  after insert on public.notifications
  for each row execute function public.notify_email_dispatch();
