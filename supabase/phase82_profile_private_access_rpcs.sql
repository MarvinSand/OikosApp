-- 20261018 profile_private_access_rpcs (additive, backward compatible)
-- Prepares the owner-only access path so sensitive profile columns can later be
-- revoked from the authenticated role (see 05_PENDING_profiles_column_revoke.sql).

-- Non-sensitive flag "has a location", so other users' clients no longer need raw coordinates.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_location boolean GENERATED ALWAYS AS (latitude IS NOT NULL AND longitude IS NOT NULL) STORED;

-- Full own profile row (incl. address, coordinates, birthday, YouVersion e-mail ...)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.* FROM public.profiles p WHERE p.id = (select auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated, service_role;

-- Birthdays of other users who opted in (show_birthday = true), optionally limited to given ids.
CREATE OR REPLACE FUNCTION public.get_visible_birthdays(p_ids uuid[] DEFAULT NULL)
RETURNS TABLE(id uuid, username text, full_name text, is_christian boolean, avatar_url text, birthday date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.full_name, p.is_christian, p.avatar_url, p.birthday
  FROM public.profiles p
  WHERE (select auth.uid()) IS NOT NULL
    AND p.id <> (select auth.uid())
    AND p.show_birthday = true
    AND p.birthday IS NOT NULL
    AND (p_ids IS NULL OR p.id = ANY (p_ids))
    AND NOT public.is_blocked_pair(p.id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_visible_birthdays(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_birthdays(uuid[]) TO authenticated, service_role;
