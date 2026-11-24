-- phase97: App-Admins können ein gemeldetes Konto löschen (bisher nur Selbst-Löschen via delete_user()).
-- Löscht auth.users → Profil und alle Daten verschwinden per ON DELETE CASCADE.
-- Offene Meldungen zu diesem Konto werden vorher als erledigt markiert; da
-- moderation_actions.target_user_id beim Löschen auf NULL gesetzt wird, steht
-- Benutzername/ID im Notiztext des Audit-Eintrags.

CREATE OR REPLACE FUNCTION public.moderation_delete_user(p_user_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_username text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR p_user_id = v_me THEN RAISE EXCEPTION 'invalid target' USING ERRCODE = '22023'; END IF;
  IF public.is_app_admin(p_user_id) THEN RAISE EXCEPTION 'cannot delete an app admin' USING ERRCODE = '22023'; END IF;

  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;

  UPDATE public.content_reports
  SET status = 'resolved',
      action_taken = 'account_deleted',
      resolution_note = p_note,
      resolved_by = v_me,
      resolved_at = now()
  WHERE status = 'open'
    AND (target_author_id = p_user_id OR (content_type = 'user' AND content_id = p_user_id));

  INSERT INTO public.moderation_actions (actor_id, action, target_user_id, note)
  VALUES (
    v_me, 'delete_account', p_user_id,
    concat_ws(' | ', 'Konto gelöscht: @' || coalesce(v_username, '?') || ' (' || p_user_id || ')', p_note)
  );

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.moderation_delete_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_delete_user(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
