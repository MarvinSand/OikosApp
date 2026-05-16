-- ============================================================
-- Phase 16b: Bereits verifizierte User in profiles nachziehen
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Alle Profile auf email_verified = true setzen,
-- deren auth.users-Eintrag bereits eine email_confirmed_at hat
UPDATE public.profiles p
SET email_verified = true
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL;
