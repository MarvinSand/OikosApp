-- phase60_fix_notification_type_constraint.sql
-- Idempotent. Run in Supabase SQL Editor.
--
-- KRITISCHER FUND (siehe CLAUDE.md-Lektion zu fehlenden Spalten - hier
-- dieselbe Klasse von Bug, nur ein Check-Constraint statt einer fehlenden
-- Spalte): notifications.type hat einen CHECK-Constraint auf eine feste
-- Werteliste, die 'feed_post', 'prayer_reminder', 'sibling_requests_reminder'
-- und 'weekly_digest' nie enthielt. Jeder INSERT mit einem dieser Typen ist
-- am Constraint gescheitert - und weil JEDER notify_on_*-Trigger und die
-- neuen Reminder-Funktionen defensiv mit `EXCEPTION WHEN OTHERS THEN RETURN`
-- geschrieben sind, wurde der Fehler lautlos verschluckt. Effekt: seit der
-- Einführung von Feed-Post-Benachrichtigungen (phase55) wurde nie auch nur
-- eine einzige davon tatsächlich erstellt.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type = ANY (ARRAY[
    'oikos_entry', 'prayer_log', 'prayer_shared', 'community_invite',
    'connection_request', 'connection_accepted', 'friend_request',
    'friend_accepted', 'community_event', 'birthday', 'feed_post',
    'prayer_reminder', 'sibling_requests_reminder', 'weekly_digest'
  ]::text[]));
