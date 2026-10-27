-- phase90_moderation: app admins, extended reports, soft-hide, moderation chat, audit log
-- Single migration (Nano/free tier). Idempotent where practical.

-- ─── 1. app_admins ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_app_admin(p_uid uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins a
    WHERE a.user_id = COALESCE(p_uid, (SELECT auth.uid()))
  );
$$;

REVOKE ALL ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "app_admins_select" ON public.app_admins;
CREATE POLICY "app_admins_select" ON public.app_admins
  FOR SELECT TO authenticated
  USING (public.is_app_admin() OR user_id = (SELECT auth.uid()));

-- No direct INSERT/UPDATE/DELETE for clients — only via RPCs.

CREATE OR REPLACE FUNCTION public.is_community_admin(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = p_community_id
      AND cm.user_id = (SELECT auth.uid())
      AND cm.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_community_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_community_admin(uuid) TO authenticated;

-- Bootstrap first admin (before grant RPC; seed bypasses RPC).
-- Marvin Sand / marvinsand / marvinsand0607@gmail.com
INSERT INTO public.app_admins (user_id, granted_by)
VALUES ('6ca74d3e-8ab6-45e8-92d4-2f42198d64a8', NULL)
ON CONFLICT (user_id) DO NOTHING;

-- ─── 2. moderation_actions (append-only audit) ───────────────
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  content_type text,
  content_id uuid,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_admins_read_moderation_actions" ON public.moderation_actions;
CREATE POLICY "app_admins_read_moderation_actions" ON public.moderation_actions
  FOR SELECT TO authenticated
  USING (public.is_app_admin());

-- No client writes; SECURITY DEFINER RPCs insert.

CREATE INDEX IF NOT EXISTS moderation_actions_created_at_idx ON public.moderation_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_content_idx ON public.moderation_actions (content_type, content_id);

-- ─── 3. user_bans (simple) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_bans (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_admins_read_bans" ON public.user_bans;
CREATE POLICY "app_admins_read_bans" ON public.user_bans
  FOR SELECT TO authenticated
  USING (public.is_app_admin() OR user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.is_user_banned(p_uid uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans b
    WHERE b.user_id = COALESCE(p_uid, (SELECT auth.uid()))
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;

-- ─── 4. Extend content_reports ───────────────────────────────
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS target_author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS action_taken text;

DO $$ BEGIN
  ALTER TABLE public.content_reports
    ADD CONSTRAINT content_reports_status_check
    CHECK (status = ANY (ARRAY['open','resolved','dismissed']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS content_reports_status_idx ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_community_idx ON public.content_reports (community_id) WHERE community_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_reports_content_idx ON public.content_reports (content_type, content_id);

CREATE OR REPLACE FUNCTION public.trg_fill_content_report_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.target_author_id IS NULL THEN
    IF NEW.content_type = 'feed_post' THEN
      SELECT author_id INTO NEW.target_author_id FROM public.feed_posts WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'feed_comment' THEN
      SELECT author_id INTO NEW.target_author_id FROM public.feed_comments WHERE id = NEW.content_id;
    ELSIF NEW.content_type IN ('personal_prayer_request', 'prayer_request') THEN
      SELECT owner_id INTO NEW.target_author_id FROM public.personal_prayer_requests WHERE id = NEW.content_id;
      IF NEW.target_author_id IS NULL THEN
        SELECT owner_id INTO NEW.target_author_id FROM public.prayer_requests WHERE id = NEW.content_id;
      END IF;
    ELSIF NEW.content_type = 'community_post' THEN
      SELECT author_id, community_id INTO NEW.target_author_id, NEW.community_id
      FROM public.community_posts WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'community_event' THEN
      SELECT created_by, community_id INTO NEW.target_author_id, NEW.community_id
      FROM public.community_events WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'user' THEN
      NEW.target_author_id := NEW.content_id;
    END IF;
  END IF;

  IF NEW.community_id IS NULL THEN
    IF NEW.content_type = 'community_post' THEN
      SELECT community_id INTO NEW.community_id FROM public.community_posts WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'community_event' THEN
      SELECT community_id INTO NEW.community_id FROM public.community_events WHERE id = NEW.content_id;
    END IF;
  END IF;

  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_content_report_meta ON public.content_reports;
CREATE TRIGGER trg_fill_content_report_meta
  BEFORE INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_fill_content_report_meta();

-- RLS: keep insert own; add select/update for reporters, app admins, community admins
DROP POLICY IF EXISTS "Reporters read own reports" ON public.content_reports;
CREATE POLICY "Reporters read own reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "App admins read all reports" ON public.content_reports;
CREATE POLICY "App admins read all reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Community admins read community reports" ON public.content_reports;
CREATE POLICY "Community admins read community reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (
    community_id IS NOT NULL
    AND public.is_community_admin(community_id)
  );

DROP POLICY IF EXISTS "App admins update reports" ON public.content_reports;
CREATE POLICY "App admins update reports" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Community admins update community reports" ON public.content_reports;
CREATE POLICY "Community admins update community reports" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (community_id IS NOT NULL AND public.is_community_admin(community_id))
  WITH CHECK (community_id IS NOT NULL AND public.is_community_admin(community_id));

-- ─── 5. Soft-hide / soft-delete columns ──────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'feed_posts','feed_comments','personal_prayer_requests','community_posts','community_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS moderation_hidden_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS moderation_deleted_at timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS moderation_deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL', t);
  END LOOP;
END $$;

-- Restrictive SELECT: hidden → author + app admins; deleted → app admins only
DROP POLICY IF EXISTS "moderation_hidden_feed_posts" ON public.feed_posts;
CREATE POLICY "moderation_hidden_feed_posts" ON public.feed_posts
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (moderation_deleted_at IS NULL OR public.is_app_admin())
    AND (
      moderation_hidden_at IS NULL
      OR author_id = (SELECT auth.uid())
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "moderation_hidden_feed_comments" ON public.feed_comments;
CREATE POLICY "moderation_hidden_feed_comments" ON public.feed_comments
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (moderation_deleted_at IS NULL OR public.is_app_admin())
    AND (
      moderation_hidden_at IS NULL
      OR author_id = (SELECT auth.uid())
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "moderation_hidden_personal_prayers" ON public.personal_prayer_requests;
CREATE POLICY "moderation_hidden_personal_prayers" ON public.personal_prayer_requests
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (moderation_deleted_at IS NULL OR public.is_app_admin())
    AND (
      moderation_hidden_at IS NULL
      OR owner_id = (SELECT auth.uid())
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "moderation_hidden_community_posts" ON public.community_posts;
CREATE POLICY "moderation_hidden_community_posts" ON public.community_posts
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (moderation_deleted_at IS NULL OR public.is_app_admin() OR public.is_community_admin(community_id))
    AND (
      moderation_hidden_at IS NULL
      OR author_id = (SELECT auth.uid())
      OR public.is_app_admin()
      OR public.is_community_admin(community_id)
    )
  );

DROP POLICY IF EXISTS "moderation_hidden_community_events" ON public.community_events;
CREATE POLICY "moderation_hidden_community_events" ON public.community_events
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (moderation_deleted_at IS NULL OR public.is_app_admin() OR public.is_community_admin(community_id))
    AND (
      moderation_hidden_at IS NULL
      OR created_by = (SELECT auth.uid())
      OR public.is_app_admin()
      OR public.is_community_admin(community_id)
    )
  );

-- Banned users cannot create content
DROP POLICY IF EXISTS "banned_cannot_insert_feed_posts" ON public.feed_posts;
CREATE POLICY "banned_cannot_insert_feed_posts" ON public.feed_posts
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_banned());

DROP POLICY IF EXISTS "banned_cannot_insert_feed_comments" ON public.feed_comments;
CREATE POLICY "banned_cannot_insert_feed_comments" ON public.feed_comments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_banned());

DROP POLICY IF EXISTS "banned_cannot_insert_prayers" ON public.personal_prayer_requests;
CREATE POLICY "banned_cannot_insert_prayers" ON public.personal_prayer_requests
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_banned());

DROP POLICY IF EXISTS "banned_cannot_insert_community_posts" ON public.community_posts;
CREATE POLICY "banned_cannot_insert_community_posts" ON public.community_posts
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_banned());

DROP POLICY IF EXISTS "banned_cannot_insert_messages" ON public.messages;
CREATE POLICY "banned_cannot_insert_messages" ON public.messages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_banned());

-- ─── 6. Moderation action RPCs ───────────────────────────────
CREATE OR REPLACE FUNCTION public.moderation_hide_content(p_content_type text, p_content_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_community uuid;
  v_author uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;

  IF p_content_type = 'feed_post' THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.feed_posts SET moderation_hidden_at = now(), moderation_hidden_by = v_me
    WHERE id = p_content_id RETURNING author_id INTO v_author;
  ELSIF p_content_type = 'feed_comment' THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.feed_comments SET moderation_hidden_at = now(), moderation_hidden_by = v_me
    WHERE id = p_content_id RETURNING author_id INTO v_author;
  ELSIF p_content_type IN ('personal_prayer_request','prayer_request') THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.personal_prayer_requests SET moderation_hidden_at = now(), moderation_hidden_by = v_me
    WHERE id = p_content_id RETURNING owner_id INTO v_author;
  ELSIF p_content_type = 'community_post' THEN
    SELECT community_id, author_id INTO v_community, v_author FROM public.community_posts WHERE id = p_content_id;
    IF NOT (public.is_app_admin() OR public.is_community_admin(v_community)) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    UPDATE public.community_posts SET moderation_hidden_at = now(), moderation_hidden_by = v_me WHERE id = p_content_id;
  ELSIF p_content_type = 'community_event' THEN
    SELECT community_id, created_by INTO v_community, v_author FROM public.community_events WHERE id = p_content_id;
    IF NOT (public.is_app_admin() OR public.is_community_admin(v_community)) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    UPDATE public.community_events SET moderation_hidden_at = now(), moderation_hidden_by = v_me WHERE id = p_content_id;
  ELSE
    RAISE EXCEPTION 'unsupported content type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.moderation_actions (actor_id, action, content_type, content_id, target_user_id, note)
  VALUES (v_me, 'hide', p_content_type, p_content_id, v_author, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_hide_content(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_hide_content(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_restore_content(p_content_type text, p_content_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_community uuid;
  v_author uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;

  IF p_content_type = 'feed_post' THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.feed_posts
      SET moderation_hidden_at = NULL, moderation_hidden_by = NULL,
          moderation_deleted_at = NULL, moderation_deleted_by = NULL
    WHERE id = p_content_id RETURNING author_id INTO v_author;
  ELSIF p_content_type = 'feed_comment' THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.feed_comments
      SET moderation_hidden_at = NULL, moderation_hidden_by = NULL,
          moderation_deleted_at = NULL, moderation_deleted_by = NULL
    WHERE id = p_content_id RETURNING author_id INTO v_author;
  ELSIF p_content_type IN ('personal_prayer_request','prayer_request') THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.personal_prayer_requests
      SET moderation_hidden_at = NULL, moderation_hidden_by = NULL,
          moderation_deleted_at = NULL, moderation_deleted_by = NULL
    WHERE id = p_content_id RETURNING owner_id INTO v_author;
  ELSIF p_content_type = 'community_post' THEN
    SELECT community_id, author_id INTO v_community, v_author FROM public.community_posts WHERE id = p_content_id;
    IF NOT (public.is_app_admin() OR public.is_community_admin(v_community)) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    UPDATE public.community_posts
      SET moderation_hidden_at = NULL, moderation_hidden_by = NULL,
          moderation_deleted_at = NULL, moderation_deleted_by = NULL
    WHERE id = p_content_id;
  ELSIF p_content_type = 'community_event' THEN
    SELECT community_id, created_by INTO v_community, v_author FROM public.community_events WHERE id = p_content_id;
    IF NOT (public.is_app_admin() OR public.is_community_admin(v_community)) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    UPDATE public.community_events
      SET moderation_hidden_at = NULL, moderation_hidden_by = NULL,
          moderation_deleted_at = NULL, moderation_deleted_by = NULL
    WHERE id = p_content_id;
  ELSE
    RAISE EXCEPTION 'unsupported content type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.moderation_actions (actor_id, action, content_type, content_id, target_user_id, note)
  VALUES (v_me, 'restore', p_content_type, p_content_id, v_author, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_restore_content(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_restore_content(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_soft_delete_content(p_content_type text, p_content_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_community uuid;
  v_author uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;

  IF p_content_type = 'feed_post' THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.feed_posts
      SET moderation_deleted_at = now(), moderation_deleted_by = v_me,
          moderation_hidden_at = COALESCE(moderation_hidden_at, now()), moderation_hidden_by = COALESCE(moderation_hidden_by, v_me)
    WHERE id = p_content_id RETURNING author_id INTO v_author;
  ELSIF p_content_type = 'feed_comment' THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.feed_comments
      SET moderation_deleted_at = now(), moderation_deleted_by = v_me,
          moderation_hidden_at = COALESCE(moderation_hidden_at, now()), moderation_hidden_by = COALESCE(moderation_hidden_by, v_me)
    WHERE id = p_content_id RETURNING author_id INTO v_author;
  ELSIF p_content_type IN ('personal_prayer_request','prayer_request') THEN
    IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    UPDATE public.personal_prayer_requests
      SET moderation_deleted_at = now(), moderation_deleted_by = v_me,
          moderation_hidden_at = COALESCE(moderation_hidden_at, now()), moderation_hidden_by = COALESCE(moderation_hidden_by, v_me)
    WHERE id = p_content_id RETURNING owner_id INTO v_author;
  ELSIF p_content_type = 'community_post' THEN
    SELECT community_id, author_id INTO v_community, v_author FROM public.community_posts WHERE id = p_content_id;
    IF NOT (public.is_app_admin() OR public.is_community_admin(v_community)) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    UPDATE public.community_posts
      SET moderation_deleted_at = now(), moderation_deleted_by = v_me,
          moderation_hidden_at = COALESCE(moderation_hidden_at, now()), moderation_hidden_by = COALESCE(moderation_hidden_by, v_me)
    WHERE id = p_content_id;
  ELSIF p_content_type = 'community_event' THEN
    SELECT community_id, created_by INTO v_community, v_author FROM public.community_events WHERE id = p_content_id;
    IF NOT (public.is_app_admin() OR public.is_community_admin(v_community)) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    UPDATE public.community_events
      SET moderation_deleted_at = now(), moderation_deleted_by = v_me,
          moderation_hidden_at = COALESCE(moderation_hidden_at, now()), moderation_hidden_by = COALESCE(moderation_hidden_by, v_me)
    WHERE id = p_content_id;
  ELSE
    RAISE EXCEPTION 'unsupported content type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.moderation_actions (actor_id, action, content_type, content_id, target_user_id, note)
  VALUES (v_me, 'soft_delete', p_content_type, p_content_id, v_author, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_soft_delete_content(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_soft_delete_content(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_resolve_report(
  p_report_id uuid,
  p_status text,
  p_action_taken text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_rep public.content_reports%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('resolved','dismissed') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_rep FROM public.content_reports WHERE id = p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found' USING ERRCODE = '22023'; END IF;

  IF NOT (
    public.is_app_admin()
    OR (v_rep.community_id IS NOT NULL AND public.is_community_admin(v_rep.community_id))
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.content_reports
  SET status = p_status,
      action_taken = p_action_taken,
      resolution_note = p_note,
      resolved_by = v_me,
      resolved_at = now()
  WHERE id = p_report_id;

  INSERT INTO public.moderation_actions (actor_id, action, content_type, content_id, target_user_id, report_id, note)
  VALUES (v_me, p_status, v_rep.content_type, v_rep.content_id, v_rep.target_author_id, p_report_id, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_resolve_report(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_resolve_report(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_warn_user(p_user_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR p_user_id = v_me THEN RAISE EXCEPTION 'invalid target' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.moderation_actions (actor_id, action, target_user_id, note)
  VALUES (v_me, 'warn', p_user_id, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_warn_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_warn_user(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_ban_user(p_user_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR p_user_id = v_me THEN RAISE EXCEPTION 'invalid target' USING ERRCODE = '22023'; END IF;
  IF public.is_app_admin(p_user_id) THEN RAISE EXCEPTION 'cannot ban an app admin' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.user_bans (user_id, banned_by, reason)
  VALUES (p_user_id, v_me, p_note)
  ON CONFLICT (user_id) DO UPDATE SET banned_by = EXCLUDED.banned_by, reason = EXCLUDED.reason, created_at = now();

  INSERT INTO public.moderation_actions (actor_id, action, target_user_id, note)
  VALUES (v_me, 'ban', p_user_id, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_ban_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_ban_user(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_unban_user(p_user_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  DELETE FROM public.user_bans WHERE user_id = p_user_id;

  INSERT INTO public.moderation_actions (actor_id, action, target_user_id, note)
  VALUES (v_me, 'unban', p_user_id, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_unban_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_unban_user(uuid, text) TO authenticated;

-- grant/revoke (defined after moderation_actions so audit insert works)
CREATE OR REPLACE FUNCTION public.grant_app_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_app_admin(v_me) THEN RAISE EXCEPTION 'only app admins can grant' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR p_user_id = v_me THEN RAISE EXCEPTION 'cannot self-grant' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.app_admins (user_id, granted_by) VALUES (p_user_id, v_me)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.moderation_actions (actor_id, action, target_user_id, note)
  VALUES (v_me, 'grant_admin', p_user_id, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_app_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_remaining int;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_app_admin(v_me) THEN RAISE EXCEPTION 'only app admins can revoke' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR p_user_id = v_me THEN RAISE EXCEPTION 'cannot revoke yourself' USING ERRCODE = '22023'; END IF;
  SELECT count(*)::int INTO v_remaining FROM public.app_admins WHERE user_id <> p_user_id;
  IF v_remaining < 1 THEN RAISE EXCEPTION 'cannot revoke last admin' USING ERRCODE = '22023'; END IF;
  DELETE FROM public.app_admins WHERE user_id = p_user_id;
  INSERT INTO public.moderation_actions (actor_id, action, target_user_id, note)
  VALUES (v_me, 'revoke_admin', p_user_id, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_app_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_app_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_app_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_app_admin(uuid) TO authenticated;

-- ─── 7. Moderation chat (conversations type=moderation) ──────
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_type_check
  CHECK (type = ANY (ARRAY['direct'::text, 'community'::text, 'discipleship'::text, 'activity'::text, 'moderation'::text]));

CREATE OR REPLACE FUNCTION public.ensure_moderation_conversation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  r record;
BEGIN
  SELECT id INTO v_id FROM public.conversations WHERE type = 'moderation' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.conversations (type) VALUES ('moderation') RETURNING id INTO v_id;
  END IF;

  -- Sync membership with app_admins
  INSERT INTO public.conversation_members (conversation_id, user_id)
  SELECT v_id, a.user_id FROM public.app_admins a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = v_id AND cm.user_id = a.user_id
  );

  DELETE FROM public.conversation_members cm
  WHERE cm.conversation_id = v_id
    AND NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = cm.user_id);

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_moderation_conversation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_moderation_conversation() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_moderation_conversation_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN public.ensure_moderation_conversation();
END;
$$;

REVOKE ALL ON FUNCTION public.get_moderation_conversation_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_moderation_conversation_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_app_admins_sync_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.ensure_moderation_conversation();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_app_admins_ai ON public.app_admins;
CREATE TRIGGER trg_app_admins_ai
  AFTER INSERT ON public.app_admins
  FOR EACH ROW EXECUTE FUNCTION public.trg_app_admins_sync_chat();

DROP TRIGGER IF EXISTS trg_app_admins_ad ON public.app_admins;
CREATE TRIGGER trg_app_admins_ad
  AFTER DELETE ON public.app_admins
  FOR EACH ROW EXECUTE FUNCTION public.trg_app_admins_sync_chat();

-- Seed moderation conversation now
SELECT public.ensure_moderation_conversation();

-- Exclude moderation from normal chat list / unread badge
CREATE OR REPLACE FUNCTION public.get_my_conversations()
 RETURNS TABLE(id uuid, type text, community_id uuid, activity_id uuid, last_read_at timestamp with time zone, last_message jsonb, other_user jsonb, community jsonb, activity jsonb, unread boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with my_membership as (
    select conversation_id, last_read_at
    from conversation_members
    where user_id = auth.uid()
  ),
  base as (
    select c.id, c.type, c.community_id, c.activity_id, mm.last_read_at
    from conversations c
    left join my_membership mm on mm.conversation_id = c.id
    where c.type <> 'moderation'
      and (c.id in (select conversation_id from my_membership)
       or (c.type = 'community' and c.community_id in (select get_my_community_ids())))
      and not (
        c.type = 'direct' and exists (
          select 1 from conversation_members bcm
          where bcm.conversation_id = c.id
            and bcm.user_id <> auth.uid()
            and public.is_blocked_pair(bcm.user_id)
        )
      )
  )
  select
    b.id,
    b.type,
    b.community_id,
    b.activity_id,
    b.last_read_at,
    lm.last_message,
    ou.other_user,
    comm.community,
    act.activity,
    coalesce(
      (lm.last_message ->> 'sender_id') is distinct from auth.uid()::text
      and (lm.last_message ->> 'created_at')::timestamptz > coalesce(b.last_read_at, 'epoch'::timestamptz),
      false
    ) as unread
  from base b
  left join lateral (
    select jsonb_build_object(
      'id', m.id, 'conversation_id', m.conversation_id, 'sender_id', m.sender_id,
      'type', m.type, 'text', m.text, 'is_deleted', m.is_deleted, 'created_at', m.created_at
    ) as last_message
    from messages m
    where m.conversation_id = b.id
      and not public.is_blocked_pair(m.sender_id)
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select jsonb_build_object(
      'id', p.id, 'username', p.username, 'full_name', p.full_name,
      'is_christian', p.is_christian, 'gender', p.gender, 'avatar_url', p.avatar_url
    ) as other_user
    from conversation_members ocm
    join profiles p on p.id = ocm.user_id
    where ocm.conversation_id = b.id and ocm.user_id <> auth.uid()
    limit 1
  ) ou on b.type = 'direct'
  left join lateral (
    select jsonb_build_object('id', co.id, 'name', co.name) as community
    from communities co
    where co.id = b.community_id
  ) comm on b.type = 'community'
  left join lateral (
    select jsonb_build_object(
      'id', wa.id, 'title', wa.title, 'activity_emoji', wa.activity_emoji, 'activity_type', wa.activity_type
    ) as activity
    from world_map_activities wa
    where wa.id = b.activity_id
  ) act on b.type = 'activity';
$function$;

CREATE OR REPLACE FUNCTION public.has_unread_conversations()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select auth.uid() as uid),
  convs as (
    select c.id, c.type, mm.last_read_at
    from public.conversations c
    left join public.conversation_members mm on mm.conversation_id = c.id and mm.user_id = (select uid from me)
    where c.type <> 'moderation'
      and (mm.user_id is not null
       or (c.type = 'community' and c.community_id in (select public.get_my_community_ids())))
  )
  select exists (
    select 1
    from convs b
    cross join lateral (
      select m.sender_id, m.created_at
      from public.messages m
      where m.conversation_id = b.id
        and not public.is_blocked_pair(m.sender_id)
      order by m.created_at desc
      limit 1
    ) lm
    where lm.sender_id is distinct from (select uid from me)
      and lm.created_at > coalesce(b.last_read_at, 'epoch'::timestamptz)
      and not (
        b.type = 'direct' and exists (
          select 1 from public.conversation_members bcm
          where bcm.conversation_id = b.id
            and bcm.user_id <> (select uid from me)
            and public.is_blocked_pair(bcm.user_id)
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_self_join_conversation(p_conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members m
                 WHERE m.conversation_id = p_conversation_id AND m.user_id = (select auth.uid()))
      OR EXISTS (SELECT 1 FROM public.conversations c
                 JOIN public.community_members cm ON cm.community_id = c.community_id
                 WHERE c.id = p_conversation_id AND c.type = 'community'
                   AND cm.user_id = (select auth.uid()));
$function$;

-- Allow app admins to read moderation conversation via membership (already synced).
-- Prevent non-admins from inserting moderation-type conversations:
DROP POLICY IF EXISTS "admins create moderation conversation" ON public.conversations;
CREATE POLICY "admins create moderation conversation" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (type = 'moderation' AND public.is_app_admin());

-- ─── 8. Patch get_feed_page (INVOKER) — RLS covers it; also filter deleted for clarity
CREATE OR REPLACE FUNCTION public.get_feed_page(
  p_category text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  WITH page AS (
    SELECT fp.*
    FROM feed_posts fp
    WHERE (p_category IS NULL OR fp.category = p_category)
      AND fp.moderation_deleted_at IS NULL
      AND (fp.moderation_hidden_at IS NULL OR fp.author_id = (SELECT auth.uid()) OR public.is_app_admin())
    ORDER BY fp.created_at DESC
    LIMIT least(greatest(p_limit, 1), 50) OFFSET greatest(p_offset, 0)
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'author_id', p.author_id, 'type', p.type, 'category', p.category,
      'title', p.title, 'body', p.body, 'photo_url', p.photo_url,
      'bible_reference', p.bible_reference, 'bible_verse', p.bible_verse,
      'bible_id', p.bible_id, 'bible_book', p.bible_book, 'bible_chapter', p.bible_chapter,
      'bible_verse_start', p.bible_verse_start, 'bible_verse_end', p.bible_verse_end,
      'is_public', p.is_public, 'visibility_mode', p.visibility_mode,
      'visibility_user_ids', p.visibility_user_ids, 'excluded_user_ids', p.excluded_user_ids,
      'view_count', p.view_count, 'bookmark_count', p.bookmark_count,
      'created_at', p.created_at, 'updated_at', p.updated_at,
      'moderation_hidden_at', p.moderation_hidden_at,
      'profiles', (SELECT jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'username', pr.username,
                                             'avatar_url', pr.avatar_url, 'is_christian', pr.is_christian)
                   FROM profiles pr WHERE pr.id = p.author_id),
      'reactions', COALESCE((SELECT jsonb_agg(jsonb_build_object('post_id', r.post_id, 'user_id', r.user_id, 'type', r.type))
                             FROM feed_reactions r WHERE r.post_id = p.id), '[]'::jsonb),
      'commentCount', (SELECT count(*) FROM feed_comments c WHERE c.post_id = p.id
                        AND c.moderation_deleted_at IS NULL
                        AND (c.moderation_hidden_at IS NULL OR c.author_id = (SELECT auth.uid()) OR public.is_app_admin())),
      'reposts', COALESCE((SELECT jsonb_agg(jsonb_build_object('post_id', rp.post_id, 'user_id', rp.user_id))
                           FROM feed_reposts rp WHERE rp.post_id = p.id), '[]'::jsonb),
      'bookmarked', EXISTS (SELECT 1 FROM feed_bookmarks b WHERE b.post_id = p.id AND b.user_id = (SELECT auth.uid()))
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  FROM page p;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_page(text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feed_page(text, integer, integer) FROM anon, public;

-- Policy on app_admins that references is_app_admin — recreate after function exists (already done).
-- Allow authenticated to see whether THEY are admin via select policy (done).


-- ─── 9. Patch DEFINER bootstrap RPCs to respect soft-hide ────
-- Injected filters into live function bodies via CREATE OR REPLACE from phase85 + filters.

CREATE OR REPLACE FUNCTION public.get_other_user_profile_bootstrap(p_target uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_profile jsonb;
  v_birthday date;
  v_friend record;
  v_friendship jsonb;
  v_blocked_by_me boolean;
  v_blocked_me boolean;
  v_prefs jsonb;
  v_conn_count int;
  v_communities jsonb;
  v_maps jsonb;
  v_posts jsonb;
  v_reposts jsonb;
  v_prayers jsonb;
  v_is_sibling boolean;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_target is null or p_target = v_me then
    raise exception 'invalid target' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'full_name', p.full_name, 'avatar_url', p.avatar_url,
    'bio', p.bio, 'bio_text', p.bio_text, 'show_bio', p.show_bio, 'is_christian', p.is_christian,
    'gender', p.gender, 'created_at', p.created_at, 'map_is_public', p.map_is_public,
    'discipleship_stage', p.discipleship_stage, 'show_on_world_map', p.show_on_world_map,
    'has_location', p.has_location, 'last_active_at', p.last_active_at, 'show_last_active', p.show_last_active,
    'show_birthday', p.show_birthday, 'church_name', p.church_name, 'show_church', p.show_church,
    'city', p.city, 'show_city', p.show_city, 'country', p.country, 'youversion_connected', p.youversion_connected
  )
  into v_profile
  from public.profiles p
  where p.id = p_target;

  if v_profile is null then
    return jsonb_build_object('profile', null);
  end if;

  if (v_profile->>'show_birthday')::boolean is true
     and not public.is_blocked_pair(p_target) then
    select p.birthday into v_birthday
    from public.profiles p
    where p.id = p_target and p.birthday is not null;
  end if;

  select f.id, f.status, f.requester_id, f.addressee_id
  into v_friend
  from public.friendships f
  where f.status <> 'declined'
    and (
      (f.requester_id = v_me and f.addressee_id = p_target)
      or (f.requester_id = p_target and f.addressee_id = v_me)
    )
  order by case f.status when 'accepted' then 0 when 'pending' then 1 else 2 end
  limit 1;

  if v_friend.id is null then
    v_friendship := jsonb_build_object('status', 'none', 'id', null);
    v_is_sibling := false;
  elsif v_friend.status = 'accepted' then
    v_friendship := jsonb_build_object('status', 'friends', 'id', v_friend.id);
    v_is_sibling := true;
  elsif v_friend.requester_id = v_me then
    v_friendship := jsonb_build_object('status', 'sent', 'id', v_friend.id);
    v_is_sibling := false;
  else
    v_friendship := jsonb_build_object('status', 'received', 'id', v_friend.id);
    v_is_sibling := false;
  end if;

  select exists(select 1 from public.user_blocks b where b.blocker_id = v_me and b.blocked_id = p_target) into v_blocked_by_me;
  select exists(select 1 from public.user_blocks b where b.blocker_id = p_target and b.blocked_id = v_me) into v_blocked_me;

  select to_jsonb(np) into v_prefs
  from public.notification_preferences np
  where np.user_id = v_me and np.target_user_id = p_target;

  select count(*)::int into v_conn_count
  from public.friendships f
  where f.status = 'accepted' and (f.requester_id = p_target or f.addressee_id = p_target);

  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'is_public', c.is_public) order by c.name), '[]'::jsonb)
  into v_communities
  from public.community_members cm
  join public.communities c on c.id = cm.community_id
  where cm.user_id = p_target and c.is_public is true;

  select coalesce(jsonb_agg(m.obj order by m.created_at), '[]'::jsonb)
  into v_maps
  from (
    select jsonb_build_object(
      'id', om.id, 'user_id', om.user_id, 'name', om.name, 'kind', om.kind,
      'visibility', om.visibility, 'visibility_user_ids', om.visibility_user_ids,
      'visibility_community_id', om.visibility_community_id, 'created_at', om.created_at,
      'personCount', (select count(*)::int from public.oikos_people op where op.map_id = om.id)
    ) as obj, om.created_at
    from public.oikos_maps om
    where om.user_id = p_target and om.visibility <> 'private' and public.is_map_visible_to(om.id, v_me)
  ) m;

  select coalesce(jsonb_agg(p.obj order by p.created_at desc), '[]'::jsonb)
  into v_posts
  from (
    select jsonb_build_object(
      'id', fp.id, 'author_id', fp.author_id, 'type', fp.type, 'category', fp.category,
      'title', fp.title, 'body', fp.body, 'photo_url', fp.photo_url,
      'bible_reference', fp.bible_reference, 'bible_verse', fp.bible_verse,
      'bible_id', fp.bible_id, 'bible_book', fp.bible_book, 'bible_chapter', fp.bible_chapter,
      'bible_verse_start', fp.bible_verse_start, 'bible_verse_end', fp.bible_verse_end,
      'is_public', fp.is_public, 'visibility_mode', fp.visibility_mode,
      'visibility_user_ids', fp.visibility_user_ids, 'excluded_user_ids', fp.excluded_user_ids,
      'view_count', fp.view_count, 'bookmark_count', fp.bookmark_count, 'created_at', fp.created_at,
      'profiles', jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'username', pr.username, 'avatar_url', pr.avatar_url, 'is_christian', pr.is_christian),
      'reactions', coalesce((select jsonb_agg(jsonb_build_object('post_id', fr.post_id, 'user_id', fr.user_id, 'type', fr.type)) from public.feed_reactions fr where fr.post_id = fp.id), '[]'::jsonb),
      'commentCount', (select count(*)::int from public.feed_comments fc where fc.post_id = fp.id and fc.moderation_deleted_at is null and (fc.moderation_hidden_at is null or fc.author_id = v_me or public.is_app_admin())),
      'reposts', coalesce((select jsonb_agg(jsonb_build_object('post_id', r.post_id, 'user_id', r.user_id)) from public.feed_reposts r where r.post_id = fp.id), '[]'::jsonb),
      'bookmarked', exists(select 1 from public.feed_bookmarks fb where fb.post_id = fp.id and fb.user_id = v_me)
    ) as obj, fp.created_at
    from public.feed_posts fp
    join public.profiles pr on pr.id = fp.author_id
    where fp.author_id = p_target
      and fp.is_public is true
      and not public.is_blocked_pair(fp.author_id)
      and fp.moderation_deleted_at is null
      and (fp.moderation_hidden_at is null or fp.author_id = v_me or public.is_app_admin())
    order by fp.created_at desc
    limit 50
  ) p;

  select coalesce(jsonb_agg(x.obj order by x.repost_at desc), '[]'::jsonb)
  into v_reposts
  from (
    select jsonb_build_object(
      'id', fp.id, 'author_id', fp.author_id, 'type', fp.type, 'category', fp.category,
      'title', fp.title, 'body', fp.body, 'photo_url', fp.photo_url,
      'bible_reference', fp.bible_reference, 'bible_verse', fp.bible_verse,
      'bible_id', fp.bible_id, 'bible_book', fp.bible_book, 'bible_chapter', fp.bible_chapter,
      'bible_verse_start', fp.bible_verse_start, 'bible_verse_end', fp.bible_verse_end,
      'is_public', fp.is_public, 'visibility_mode', fp.visibility_mode,
      'visibility_user_ids', fp.visibility_user_ids, 'excluded_user_ids', fp.excluded_user_ids,
      'view_count', fp.view_count, 'bookmark_count', fp.bookmark_count, 'created_at', fp.created_at,
      'profiles', jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'username', pr.username, 'avatar_url', pr.avatar_url, 'is_christian', pr.is_christian),
      'reactions', coalesce((select jsonb_agg(jsonb_build_object('post_id', fr.post_id, 'user_id', fr.user_id, 'type', fr.type)) from public.feed_reactions fr where fr.post_id = fp.id), '[]'::jsonb),
      'commentCount', (select count(*)::int from public.feed_comments fc where fc.post_id = fp.id and fc.moderation_deleted_at is null and (fc.moderation_hidden_at is null or fc.author_id = v_me or public.is_app_admin())),
      'reposts', coalesce((select jsonb_agg(jsonb_build_object('post_id', r.post_id, 'user_id', r.user_id)) from public.feed_reposts r where r.post_id = fp.id), '[]'::jsonb),
      'bookmarked', exists(select 1 from public.feed_bookmarks fb where fb.post_id = fp.id and fb.user_id = v_me)
    ) as obj, frp.created_at as repost_at
    from public.feed_reposts frp
    join public.feed_posts fp on fp.id = frp.post_id
    join public.profiles pr on pr.id = fp.author_id
    where frp.user_id = p_target
      and not public.is_blocked_pair(fp.author_id)
      and (fp.is_public is true or fp.author_id = v_me)
      and fp.moderation_deleted_at is null
      and (fp.moderation_hidden_at is null or fp.author_id = v_me or public.is_app_admin())
    order by frp.created_at desc
    limit 50
  ) x;

  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  into v_prayers
  from (
    select jsonb_build_object(
      'id', ppr.id, 'title', ppr.title, 'description', ppr.description, 'category', ppr.category,
      'is_answered', ppr.is_answered, 'is_public', ppr.visibility <> 'private', 'created_at', ppr.created_at, 'source', 'personal'
    ) as obj, ppr.created_at
    from public.personal_prayer_requests ppr
    where ppr.owner_id = p_target
      and not public.is_blocked_pair(ppr.owner_id)
      and ppr.moderation_deleted_at is null
      and (ppr.moderation_hidden_at is null or ppr.owner_id = v_me or public.is_app_admin())
      and (
        ppr.visibility = 'public'
        or (ppr.visibility = 'siblings' and v_is_sibling)
        or (ppr.visibility = 'community' and exists (
          select 1 from public.community_members cm
          where cm.community_id = ppr.visibility_community_id and cm.user_id = v_me
        ))
        or (v_me = any (coalesce(ppr.visibility_user_ids, '{}'::uuid[])))
      )
    union all
    select jsonb_build_object(
      'id', pr.id, 'title', pr.title, 'description', pr.description, 'category', null,
      'is_answered', pr.is_answered, 'is_public', pr.is_public, 'created_at', pr.created_at, 'source', 'person'
    ), pr.created_at
    from public.prayer_requests pr
    where pr.owner_id = p_target and pr.is_public is true
  ) q;

  return jsonb_build_object(
    'profile', v_profile || jsonb_build_object('birthday', v_birthday),
    'friendship', v_friendship,
    'blocked_by_me', v_blocked_by_me,
    'blocked_me', v_blocked_me,
    'notif_prefs', v_prefs,
    'connections_count', v_conn_count,
    'public_communities', coalesce(v_communities, '[]'::jsonb),
    'maps', coalesce(v_maps, '[]'::jsonb),
    'posts', coalesce(v_posts, '[]'::jsonb),
    'reposts', coalesce(v_reposts, '[]'::jsonb),
    'prayer_requests', coalesce(v_prayers, '[]'::jsonb)
  );
end;
$function$;

-- Soft-hide filter for get_my_profile_bootstrap (own posts always visible to self via author check)
DO $patch$
DECLARE
  def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO def
  FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'get_my_profile_bootstrap';
  IF def IS NULL THEN
    RAISE NOTICE 'get_my_profile_bootstrap not found, skip';
    RETURN;
  END IF;
  -- Only patch if not already patched
  IF def LIKE '%moderation_deleted_at%' THEN
    RAISE NOTICE 'get_my_profile_bootstrap already patched';
    RETURN;
  END IF;
  def := replace(def,
    'where fp.author_id = v_me',
    'where fp.author_id = v_me and fp.moderation_deleted_at is null');
  def := replace(def,
    'from public.personal_prayer_requests ppr where ppr.owner_id = v_me',
    'from public.personal_prayer_requests ppr where ppr.owner_id = v_me and ppr.moderation_deleted_at is null');
  -- Join filter for reposts of others'' posts
  def := replace(def,
    'join public.feed_posts fp on fp.id = frp.post_id',
    'join public.feed_posts fp on fp.id = frp.post_id and fp.moderation_deleted_at is null and (fp.moderation_hidden_at is null or fp.author_id = v_me or public.is_app_admin())');
  EXECUTE def;
END;
$patch$;

NOTIFY pgrst, 'reload schema';
