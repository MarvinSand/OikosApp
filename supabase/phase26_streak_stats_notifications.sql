-- Phase 26: Streak, Statistiken & Kontext-Erinnerungen

-- Benachrichtigungs-Präferenzen in profiles
alter table public.profiles
  add column if not exists prayer_reminder_times text[] default '{}',
  add column if not exists prayer_reminder_types jsonb default '{
    "long_not_prayed": true,
    "birthday": true,
    "answered_anniversary": true,
    "streak_reminder": true,
    "daily_morning": false
  }'::jsonb,
  add column if not exists push_subscription jsonb;

-- Freeze Days in user_prayer_stats
alter table public.user_prayer_stats
  add column if not exists freeze_days_remaining integer default 1,
  add column if not exists freeze_days_used integer default 0,
  add column if not exists last_freeze_reset date;
