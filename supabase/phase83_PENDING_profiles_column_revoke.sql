-- 20261018 profiles_column_revoke  *** PENDING – apply ONLY after the client PR is merged AND deployed ***
-- (the currently deployed client still does select('*') on profiles and reads other
--  users' latitude/longitude/birthday directly; this would break it).
-- Pre-check before applying: grep the deployed code for from('profiles').select('*') – must be 0 hits.
REVOKE SELECT ON public.profiles FROM authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles'
    AND column_name NOT IN ('address_full','address_street','address_district','latitude','longitude',
                            'birthday','youversion_email','youversion_yvp_id','push_subscription');
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', cols);
END $$;
-- Owner access to these columns goes through public.get_my_profile();
-- other users' coarse location only through get_world_map_users(); birthdays through get_visible_birthdays().
