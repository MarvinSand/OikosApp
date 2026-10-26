-- E-Mail-Bestätigung bei der Registrierung per 6-stelligem Code.
--
-- Bisher hat der Trigger trg_auto_confirm_email jede neue E-Mail-Adresse sofort
-- als bestätigt markiert. Dann gibt es nie einen Code/Link. Die Funktion wird zum
-- No-Op: ob eine Bestätigung nötig ist, steuert jetzt allein die Supabase-
-- Einstellung "Confirm email" (Authentication → Sign In / Providers → Email).
--
-- Reihenfolge beim Einschalten:
--   1. Eigenen SMTP-Server einrichten (Authentication → Emails → SMTP Settings)
--   2. Vorlage "Confirm signup" mit dem Code {{ .Token }} anpassen
--   3. "Confirm email" einschalten
-- Der Trigger selbst bleibt bestehen (idempotent), tut aber nichts mehr.

CREATE OR REPLACE FUNCTION public.auto_confirm_email_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;
