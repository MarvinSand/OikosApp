-- ============================================================
-- Phase 28: Erweiterte Feed-Post Sichtbarkeit + Kategorien
-- Run this in the Supabase SQL Editor
-- ============================================================
--
-- HINWEIS:
--   Für den Foto-Upload muss zusätzlich im Supabase Dashboard
--   unter Storage ein öffentlicher Bucket "feed-photos" angelegt
--   werden (Public bucket = ON). Dazu folgende RLS-Policies:
--     - Authenticated kann INSERT/UPDATE/DELETE auf eigene Files
--       (in path beginnt mit auth.uid())
--     - Public read access
-- ============================================================

-- 1) Sichtbarkeit pro Post
alter table public.feed_posts
  add column if not exists visibility_mode text default 'public'
    check (visibility_mode in ('public','siblings','communities','specific_include')),
  add column if not exists visibility_user_ids uuid[] default '{}',
  add column if not exists excluded_user_ids uuid[] default '{}',
  add column if not exists category text;

-- 2) Backfill: bestehende is_public-Werte abbilden
update public.feed_posts
  set visibility_mode = case
    when is_public = true then 'public'
    else 'communities'
  end
where visibility_mode is null;

-- 3) RLS-Policies aktualisieren
DROP POLICY IF EXISTS "Public posts readable"      ON public.feed_posts;
DROP POLICY IF EXISTS "Siblings posts readable"    ON public.feed_posts;
DROP POLICY IF EXISTS "Community posts readable"   ON public.feed_posts;
DROP POLICY IF EXISTS "Specific include readable"  ON public.feed_posts;
DROP POLICY IF EXISTS "Own posts"                  ON public.feed_posts;

-- "Für alle App Nutzer" – jeder eingeloggte User sieht sie, außer er ist auf excluded_user_ids
CREATE POLICY "Public posts readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'public'
    AND auth.uid() IS NOT NULL
    AND NOT (auth.uid() = ANY(coalesce(excluded_user_ids, '{}')))
  );

-- "Nur verbundene Geschwister" – nur akzeptierte Friendships sehen den Post
CREATE POLICY "Siblings posts readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'siblings'
    AND auth.uid() IS NOT NULL
    AND NOT (auth.uid() = ANY(coalesce(excluded_user_ids, '{}')))
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = feed_posts.author_id AND f.addressee_id = auth.uid())
          OR (f.addressee_id = feed_posts.author_id AND f.requester_id = auth.uid()))
    )
  );

-- "Communities" – nur Mitglieder der freigegebenen Communities
CREATE POLICY "Community posts readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'communities'
    AND auth.uid() IS NOT NULL
    AND NOT (auth.uid() = ANY(coalesce(excluded_user_ids, '{}')))
    AND auth.uid() IN (
      SELECT cm.user_id FROM public.community_members cm
      JOIN public.feed_post_communities fpc ON fpc.community_id = cm.community_id
      WHERE fpc.post_id = feed_posts.id
    )
  );

-- "Nur bestimmte Geschwister" – nur User auf visibility_user_ids
CREATE POLICY "Specific include readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'specific_include'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = ANY(coalesce(visibility_user_ids, '{}'))
  );

-- Owner sieht und verwaltet seine eigenen Posts immer
CREATE POLICY "Own posts"
  ON public.feed_posts FOR ALL
  USING (auth.uid() = author_id);
