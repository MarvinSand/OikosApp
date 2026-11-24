-- phase102: Von der Moderation gelöschte Inhalte (moderation_deleted_at) sind für
-- niemanden mehr über normale Abfragen sichtbar – auch nicht für Admins oder die
-- Autor:innen. Die Zeile bleibt für das Audit erhalten. Versteckte Inhalte
-- (moderation_hidden_at) sehen weiterhin Admins und die Autor:innen.
alter policy "moderation_hidden_feed_posts" on public.feed_posts
  using ((moderation_deleted_at is null) and ((moderation_hidden_at is null) or (author_id = (select auth.uid())) or is_app_admin()));

alter policy "moderation_hidden_feed_comments" on public.feed_comments
  using ((moderation_deleted_at is null) and ((moderation_hidden_at is null) or (author_id = (select auth.uid())) or is_app_admin()));

alter policy "moderation_hidden_personal_prayers" on public.personal_prayer_requests
  using ((moderation_deleted_at is null) and ((moderation_hidden_at is null) or (owner_id = (select auth.uid())) or is_app_admin()));

alter policy "moderation_hidden_community_posts" on public.community_posts
  using ((moderation_deleted_at is null) and ((moderation_hidden_at is null) or (author_id = (select auth.uid())) or is_app_admin() or is_community_admin(community_id)));

alter policy "moderation_hidden_community_events" on public.community_events
  using ((moderation_deleted_at is null) and ((moderation_hidden_at is null) or (created_by = (select auth.uid())) or is_app_admin() or is_community_admin(community_id)));
