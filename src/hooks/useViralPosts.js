import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const POST_SELECT = `
  id, author_id, type, category, title, body, photo_url,
  bible_reference, bible_verse, created_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

// Lädt die viralsten Feedposts der letzten 7 Tage (Engagement = Reaktionen + Kommentare).
export function useViralPosts(limit = 3) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: rawPosts } = await supabase
        .from('feed_posts')
        .select(POST_SELECT)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!rawPosts || rawPosts.length === 0) {
        if (!cancelled) { setPosts([]); setLoading(false) }
        return
      }

      const ids = rawPosts.map(p => p.id)
      const [{ data: reactions }, { data: comments }] = await Promise.all([
        supabase.from('feed_reactions').select('post_id, user_id, type').in('post_id', ids),
        supabase.from('feed_comments').select('post_id').in('post_id', ids),
      ])

      const reactMap = {}
      ;(reactions || []).forEach(r => {
        if (!reactMap[r.post_id]) reactMap[r.post_id] = []
        reactMap[r.post_id].push(r)
      })
      const commentMap = {}
      ;(comments || []).forEach(c => { commentMap[c.post_id] = (commentMap[c.post_id] || 0) + 1 })

      const enriched = rawPosts
        .map(p => {
          const reacts = reactMap[p.id] || []
          const commentCount = commentMap[p.id] || 0
          return { ...p, reactions: reacts, commentCount, _engagement: reacts.length + commentCount }
        })
        .sort((a, b) => b._engagement - a._engagement || new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)

      if (!cancelled) { setPosts(enriched); setLoading(false) }
    })()

    return () => { cancelled = true }
  }, [user?.id, limit])

  return { posts, loading }
}
