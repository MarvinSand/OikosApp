-- 20261018_security_hardening_phase1 (backward compatible with currently deployed client)

-- 1) anon (not logged in) gets no direct table access at all. The app only calls
--    rpc/is_username_available before login (Auth.jsx + keep-warm cron).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- 2) profiles: readable only by logged-in users
DROP POLICY IF EXISTS "Profile öffentlich lesen" ON public.profiles;
CREATE POLICY "Profile für eingeloggte Nutzer lesbar" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Nutzer sieht nur eigenes Profil" ON public.profiles;
CREATE POLICY "Nutzer verwaltet eigenes Profil" ON public.profiles FOR ALL TO authenticated
  USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- 3) notifications: no more WITH CHECK (true). Client may only create
--    (a) notifications for itself (birthday reminders, App.jsx) and
--    (b) 'prayer_shared' for accepted, non-blocked friends (usePersonalPrayer.js).
--    DB triggers that create notifications are SECURITY DEFINER and bypass RLS.
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  user_id = (select auth.uid())
  OR (
    type = 'prayer_shared'
    AND (data->>'requester_id') = (select auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = (select auth.uid()) AND f.addressee_id = notifications.user_id)
          OR (f.addressee_id = (select auth.uid()) AND f.requester_id = notifications.user_id))
    )
    AND NOT public.is_blocked_pair(user_id)
  )
);

-- 4) conversations / conversation_members: no more joining arbitrary conversations.
--    Direct + activity chats are created by SECURITY DEFINER RPCs
--    (start_direct_chat, join_activity_chat). Client only inserts community
--    conversations and (up)serts its own membership row.
CREATE OR REPLACE FUNCTION public.can_self_join_conversation(p_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members m
                 WHERE m.conversation_id = p_conversation_id AND m.user_id = (select auth.uid()))
      OR EXISTS (SELECT 1 FROM public.conversations c
                 JOIN public.community_members cm ON cm.community_id = c.community_id
                 WHERE c.id = p_conversation_id AND c.type = 'community'
                   AND cm.user_id = (select auth.uid()));
$$;
REVOKE EXECUTE ON FUNCTION public.can_self_join_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_self_join_conversation(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "authenticated can insert conversation_members" ON public.conversation_members;
CREATE POLICY "join own membership if allowed" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) AND public.can_self_join_conversation(conversation_id));

DROP POLICY IF EXISTS "authenticated can insert conversations" ON public.conversations;
CREATE POLICY "members can create community conversation" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (type = 'community' AND community_id IS NOT NULL AND public.is_community_member(community_id));

-- 5) personal_prayer_logs: only own logs or logs of requests the user may see (RLS of personal_prayer_requests applies)
DROP POLICY IF EXISTS "Gebete sind öffentlich sichtbar" ON public.personal_prayer_logs;
CREATE POLICY "Gebete sichtbar wenn Anliegen sichtbar" ON public.personal_prayer_logs FOR SELECT TO authenticated USING (
  user_id = (select auth.uid())
  OR EXISTS (SELECT 1 FROM public.personal_prayer_requests r WHERE r.id = personal_prayer_logs.request_id)
);

-- 6) bible_verses_cache: no client writes (stored HTML -> cache poisoning / XSS risk). Reads stay.
DROP POLICY IF EXISTS "Write bible cache" ON public.bible_verses_cache;

-- 7) Function EXECUTE: nothing for anon/PUBLIC except is_username_available
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prokind = 'f'
             AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

--    Trigger functions, cron jobs and internal helpers are not meant to be called via /rpc by users
REVOKE EXECUTE ON FUNCTION public.auto_confirm_email_on_signup() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_prayer_request() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_request() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_path_choice_fork() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_prayer_request_visibility() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_create_siblings_map() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_friendship_sync_siblings() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.feed_bookmarks_count_trigger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.feed_comment_engagement_count_trigger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_prayer_log() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_feed_post() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_email_dispatch() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_push_dispatch() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_direct_message() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_oikos_entry() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.remind_not_prayed_recently() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.remind_open_sibling_requests() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.weekly_digest() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._friend_ids(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._sync_siblings_for(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_siblings_map(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_map_visible_to(uuid,uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_activity_chat(uuid) FROM authenticated;

-- 8) Fixed search_path for all functions that had none
ALTER FUNCTION public.is_community_member(uuid) SET search_path = public;
ALTER FUNCTION public.is_event_accessible(uuid) SET search_path = public;
ALTER FUNCTION public.create_community(text,text,text,boolean) SET search_path = public;
ALTER FUNCTION public.auto_confirm_email_on_signup() SET search_path = public;
ALTER FUNCTION public.notify_on_friend_request() SET search_path = public;
ALTER FUNCTION public.create_activity_chat(uuid) SET search_path = public;
ALTER FUNCTION public.join_activity(uuid) SET search_path = public;
ALTER FUNCTION public.leave_activity(uuid) SET search_path = public;
ALTER FUNCTION public.join_activity_chat(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_my_community_ids() SET search_path = public;
ALTER FUNCTION public.create_community(text,text,text) SET search_path = public;
ALTER FUNCTION public.remind_not_prayed_recently() SET search_path = public;
ALTER FUNCTION public.remind_open_sibling_requests() SET search_path = public;
ALTER FUNCTION public.weekly_digest() SET search_path = public;
ALTER FUNCTION public.sync_prayer_request_visibility() SET search_path = public;
ALTER FUNCTION public.delete_user() SET search_path = public;
ALTER FUNCTION public.notify_on_prayer_log() SET search_path = public;
ALTER FUNCTION public.notify_on_feed_post() SET search_path = public;
ALTER FUNCTION public.notify_email_dispatch() SET search_path = public;

-- 9) Remove exact-duplicate permissive policies (identical expressions already covered by an ALL policy)
DROP POLICY IF EXISTS "Insert own prayer_requests" ON public.prayer_requests;   -- covered by "Owner manages prayer_requests" (ALL, owner_id = uid)
DROP POLICY IF EXISTS "Delete own prayer_requests" ON public.prayer_requests;   -- same
DROP POLICY IF EXISTS "Insert own prayer_logs" ON public.prayer_logs;           -- covered by "Auth users manage own logs" (ALL, user_id = uid)
DROP POLICY IF EXISTS "Read prayer_logs" ON public.prayer_logs;                 -- identical to "Auth users read all logs"
DROP POLICY IF EXISTS ep_insert ON public.event_participants;                   -- covered by "members manage own participation" (ALL, user_id = uid)
DROP POLICY IF EXISTS ep_update ON public.event_participants;
DROP POLICY IF EXISTS ep_delete ON public.event_participants;
