-- ============================================================
-- Phase 15: Community Feed & Orte auf der OIKOS Map
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── TEIL 1: COMMUNITY FEED ───────────────────────────────────

-- Posts
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type             text NOT NULL CHECK (type IN ('text', 'bible', 'testimony', 'question', 'photo')),
  title            text,
  body             text NOT NULL,
  photo_url        text,
  bible_reference  text,
  bible_verse      text,
  is_public        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Post visibility for specific communities (when is_public = false)
CREATE TABLE IF NOT EXISTS public.feed_post_communities (
  post_id      uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (post_id, community_id)
);

-- Comments / thread replies
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  parent_id  uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reactions on posts
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL CHECK (type IN ('prayer', 'heart', 'amen')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, type)
);

-- RLS
ALTER TABLE public.feed_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions        ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Public posts readable"      ON public.feed_posts;
DROP POLICY IF EXISTS "Community posts readable"   ON public.feed_posts;
DROP POLICY IF EXISTS "Own posts"                  ON public.feed_posts;
DROP POLICY IF EXISTS "Auth read feed post comms"  ON public.feed_post_communities;
DROP POLICY IF EXISTS "Auth read comments"         ON public.feed_comments;
DROP POLICY IF EXISTS "Own comments"               ON public.feed_comments;
DROP POLICY IF EXISTS "Auth read feed reactions"   ON public.feed_reactions;
DROP POLICY IF EXISTS "Own feed reactions"         ON public.feed_reactions;

-- Public posts readable by all authenticated users
CREATE POLICY "Public posts readable"
  ON public.feed_posts FOR SELECT
  USING (is_public = true AND auth.uid() IS NOT NULL);

-- Community-restricted posts readable only by members
CREATE POLICY "Community posts readable"
  ON public.feed_posts FOR SELECT
  USING (
    is_public = false AND auth.uid() IN (
      SELECT cm.user_id FROM public.community_members cm
      JOIN public.feed_post_communities fpc ON fpc.community_id = cm.community_id
      WHERE fpc.post_id = feed_posts.id
    )
  );

-- Own posts: full CRUD
CREATE POLICY "Own posts"
  ON public.feed_posts FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Auth read feed post comms"
  ON public.feed_post_communities FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth read comments"
  ON public.feed_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Own comments"
  ON public.feed_comments FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Auth read feed reactions"
  ON public.feed_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Own feed reactions"
  ON public.feed_reactions FOR ALL
  USING (auth.uid() = user_id);

-- ─── TEIL 2: ORTE AUF DER OIKOS MAP ──────────────────────────

-- Places on a map
CREATE TABLE IF NOT EXISTS public.oikos_places (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id           uuid REFERENCES public.oikos_maps(id) ON DELETE CASCADE NOT NULL,
  owner_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name             text NOT NULL,
  type             text DEFAULT 'place' CHECK (type IN ('place', 'church', 'work', 'school', 'sport', 'other')),
  notes            text,
  prayer_request   text,
  prayer_is_public boolean DEFAULT false,
  is_public        boolean DEFAULT true,
  pos_x            float DEFAULT 0,
  pos_y            float DEFAULT 0,
  color            text DEFAULT '#8A7060',
  created_at       timestamptz DEFAULT now()
);

-- Connection between a person and a place
CREATE TABLE IF NOT EXISTS public.person_place_connections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  uuid REFERENCES public.oikos_people(id) ON DELETE CASCADE NOT NULL,
  place_id   uuid REFERENCES public.oikos_places(id) ON DELETE CASCADE NOT NULL,
  context    text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(person_id, place_id)
);

-- RLS
ALTER TABLE public.oikos_places             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_place_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages places"            ON public.oikos_places;
DROP POLICY IF EXISTS "Public places visible"           ON public.oikos_places;
DROP POLICY IF EXISTS "Owner manages place connections" ON public.person_place_connections;

CREATE POLICY "Owner manages places"
  ON public.oikos_places FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Public places visible"
  ON public.oikos_places FOR SELECT
  USING (is_public = true);

CREATE POLICY "Owner manages place connections"
  ON public.person_place_connections FOR ALL
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.oikos_places
      WHERE id = person_place_connections.place_id
    )
  );
