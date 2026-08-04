-- phase54_notification_prefs_storyline_column.sql
-- Idempotent. Run in Supabase SQL Editor.
--
-- Bug: useNotificationPrefs.js selects/upserts `notify_storyline_entries` on
-- notification_preferences, but the column was never migrated into the DB.
-- Per CLAUDE.md: a nonexistent column in a supabase select()/update()/upsert()
-- payload fails the WHOLE query. Effect: the notification-prefs load() in
-- useNotificationPrefs.js silently errored on every call (SELECT included
-- this column unconditionally), so the toggles shown in FriendsView.jsx's
-- friend-profile sheet always reset to DEFAULT_PREFS instead of the user's
-- actually saved values.

alter table notification_preferences
  add column if not exists notify_storyline_entries boolean default false;
