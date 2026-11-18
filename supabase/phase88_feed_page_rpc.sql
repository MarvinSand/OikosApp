-- Feed in EINEM Request statt 5 (Posts → Reaktionen/Kommentare/Reposts/Bookmarks).
-- Auf der kleinen Compute-Instanz kostet jeder Round-Trip bei Last mehrere
-- Sekunden; jetzt liefert eine Funktion die Seite komplett.
-- SECURITY INVOKER: RLS (Sichtbarkeit, Blockierungen) gilt unverändert pro Nutzer.
-- Idempotent.

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
    WHERE p_category IS NULL OR fp.category = p_category
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
      'profiles', (SELECT jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'username', pr.username,
                                             'avatar_url', pr.avatar_url, 'is_christian', pr.is_christian)
                   FROM profiles pr WHERE pr.id = p.author_id),
      'reactions', COALESCE((SELECT jsonb_agg(jsonb_build_object('post_id', r.post_id, 'user_id', r.user_id, 'type', r.type))
                             FROM feed_reactions r WHERE r.post_id = p.id), '[]'::jsonb),
      'commentCount', (SELECT count(*) FROM feed_comments c WHERE c.post_id = p.id),
      'reposts', COALESCE((SELECT jsonb_agg(jsonb_build_object('post_id', rp.post_id, 'user_id', rp.user_id))
                           FROM feed_reposts rp WHERE rp.post_id = p.id), '[]'::jsonb),
      'bookmarked', EXISTS (SELECT 1 FROM feed_bookmarks b WHERE b.post_id = p.id AND b.user_id = (SELECT auth.uid()))
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  FROM page p;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_page(text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feed_page(text, integer, integer) FROM anon, public;
