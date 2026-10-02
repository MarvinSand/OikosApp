import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const POST_SELECT = `
  id, author_id, type, category, title, body, photo_url,
  bible_reference, bible_verse, bible_id, bible_book, bible_chapter, bible_verse_start, bible_verse_end,
  is_public, view_count, bookmark_count, created_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

async function attachEngagement(rawPosts, userId) {
  if (!rawPosts.length) return rawPosts
  const ids = rawPosts.map(p => p.id)
  const [{ data: reactions }, { data: comments }, { data: reposts }] = await Promise.all([
    supabase.from('feed_reactions').select('post_id, user_id, type').in('post_id', ids),
    supabase.from('feed_comments').select('post_id').in('post_id', ids),
    supabase.from('feed_reposts').select('post_id, user_id').in('post_id', ids),
  ])
  const reactMap = {}
  ;(reactions || []).forEach(r => { (reactMap[r.post_id] ||= []).push(r) })
  const commentCount = {}
  ;(comments || []).forEach(c => { commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1 })
  const repostMap = {}
  ;(reposts || []).forEach(r => { (repostMap[r.post_id] ||= []).push(r) })
  return rawPosts.map(p => ({
    ...p,
    reactions: reactMap[p.id] || [],
    commentCount: commentCount[p.id] || 0,
    reposts: repostMap[p.id] || [],
    bookmarked: true,
  }))
}

// Lädt alle vom aktuellen Nutzer gespeicherten (gebookmarkten) Feed-Posts,
// inkl. der Bookmark-Sammlung (Kategorie), in die jeder Post einsortiert wurde.
export function useSavedPosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: bookmarkRows } = await supabase
      .from('feed_bookmarks')
      .select('post_id, collection_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const postIds = (bookmarkRows || []).map(b => b.post_id)
    if (postIds.length === 0) {
      setPosts([])
      setLoading(false)
      return
    }

    const { data: rawPosts } = await supabase.from('feed_posts').select(POST_SELECT).in('id', postIds)
    const collectionByPost = {}
    ;(bookmarkRows || []).forEach(b => { collectionByPost[b.post_id] = b.collection_id })

    const enriched = await attachEngagement(rawPosts || [], user.id)
    const withCollection = enriched.map(p => ({ ...p, collectionId: collectionByPost[p.id] ?? null }))
    const orderMap = new Map(postIds.map((id, i) => [id, i]))
    withCollection.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id))

    setPosts(withCollection)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  function removeBookmark(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    supabase.from('feed_bookmarks').delete().eq('post_id', postId).eq('user_id', user.id)
  }

  async function reactToPost(postId, type) {
    const post = posts.find(p => p.id === postId)
    const mine = post?.reactions?.find(r => r.user_id === user.id && r.type === type)
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const reactions = mine
        ? p.reactions.filter(r => !(r.user_id === user.id && r.type === type))
        : [...(p.reactions || []), { post_id: postId, user_id: user.id, type }]
      return { ...p, reactions }
    }))
    if (mine) {
      await supabase.from('feed_reactions').delete().eq('post_id', postId).eq('user_id', user.id).eq('type', type)
    } else {
      await supabase.from('feed_reactions').insert({ post_id: postId, user_id: user.id, type })
    }
  }

  async function toggleRepost(postId) {
    const post = posts.find(p => p.id === postId)
    const mine = post?.reposts?.find(r => r.user_id === user.id)
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const reposts = mine
        ? p.reposts.filter(r => r.user_id !== user.id)
        : [...(p.reposts || []), { post_id: postId, user_id: user.id }]
      return { ...p, reposts }
    }))
    if (mine) {
      await supabase.from('feed_reposts').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('feed_reposts').insert({ post_id: postId, user_id: user.id })
    }
  }

  return { posts, loading, removeBookmark, reactToPost, toggleRepost, reload: load }
}
