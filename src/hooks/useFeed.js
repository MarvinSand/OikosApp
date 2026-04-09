import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const PAGE_SIZE = 20

const POST_SELECT = `
  id, author_id, type, title, body, photo_url,
  bible_reference, bible_verse, is_public, created_at, updated_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

export function useFeed(filter = 'all') {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const buildQuery = useCallback((from = 0) => {
    let q = supabase
      .from('feed_posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filter === 'bible')     q = q.eq('type', 'bible')
    else if (filter === 'testimony') q = q.eq('type', 'testimony')
    else if (filter === 'question')  q = q.eq('type', 'question')
    // 'all', 'siblings', 'communities' — all return public posts for now
    // is_public = true handled by RLS

    return q
  }, [filter])

  const loadPosts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setOffset(0)
    const { data, error } = await buildQuery(0)
    if (!error) {
      const withReactions = await attachReactions(data || [])
      setPosts(withReactions)
      setHasMore((data || []).length === PAGE_SIZE)
    }
    setLoading(false)
  }, [user?.id, buildQuery])

  useEffect(() => { loadPosts() }, [loadPosts])

  async function attachReactions(rawPosts) {
    if (!rawPosts.length) return rawPosts
    const ids = rawPosts.map(p => p.id)
    const { data: reactions } = await supabase
      .from('feed_reactions')
      .select('post_id, user_id, type')
      .in('post_id', ids)
    const { data: comments } = await supabase
      .from('feed_comments')
      .select('post_id')
      .in('post_id', ids)

    const reactMap = {}
    ;(reactions || []).forEach(r => {
      if (!reactMap[r.post_id]) reactMap[r.post_id] = []
      reactMap[r.post_id].push(r)
    })
    const commentCount = {}
    ;(comments || []).forEach(c => {
      commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1
    })

    return rawPosts.map(p => ({
      ...p,
      reactions: reactMap[p.id] || [],
      commentCount: commentCount[p.id] || 0,
    }))
  }

  async function loadMore() {
    if (!hasMore || loading) return
    const nextOffset = offset + PAGE_SIZE
    const { data } = await buildQuery(nextOffset)
    if (data) {
      const withReactions = await attachReactions(data)
      setPosts(prev => [...prev, ...withReactions])
      setHasMore(data.length === PAGE_SIZE)
      setOffset(nextOffset)
    }
  }

  async function createPost({ type, body, title, bibleReference, bibleVerse, photoUrl, isPublic = true, communityIds = [] }) {
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId, _optimistic: true,
      author_id: user.id, type, title: title || null,
      body, photo_url: photoUrl || null,
      bible_reference: bibleReference || null,
      bible_verse: bibleVerse || null,
      is_public: isPublic, created_at: new Date().toISOString(),
      profiles: null, reactions: [], commentCount: 0,
    }
    setPosts(prev => [optimistic, ...prev])

    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        author_id: user.id, type, title: title || null,
        body, photo_url: photoUrl || null,
        bible_reference: bibleReference || null,
        bible_verse: bibleVerse || null,
        is_public: isPublic,
      })
      .select(POST_SELECT)
      .single()

    if (error) {
      setPosts(prev => prev.filter(p => p.id !== tempId))
      return null
    }

    // Link to communities if not public
    if (!isPublic && communityIds.length > 0) {
      await supabase
        .from('feed_post_communities')
        .insert(communityIds.map(cid => ({ post_id: data.id, community_id: cid })))
    }

    const post = { ...data, reactions: [], commentCount: 0 }
    setPosts(prev => prev.map(p => p.id === tempId ? post : p))
    return post
  }

  async function deletePost(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('feed_posts').delete().eq('id', postId)
  }

  async function reactToPost(postId, type) {
    const post = posts.find(p => p.id === postId)
    const myReaction = post?.reactions?.find(r => r.user_id === user.id && r.type === type)

    // Optimistic
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const reactions = myReaction
        ? p.reactions.filter(r => !(r.user_id === user.id && r.type === type))
        : [...(p.reactions || []), { post_id: postId, user_id: user.id, type }]
      return { ...p, reactions }
    }))

    if (myReaction) {
      await supabase.from('feed_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('type', type)
    } else {
      await supabase.from('feed_reactions')
        .insert({ post_id: postId, user_id: user.id, type })
    }
  }

  async function commentOnPost(postId, body, parentId = null) {
    const { data, error } = await supabase
      .from('feed_comments')
      .insert({ post_id: postId, author_id: user.id, body, parent_id: parentId || null })
      .select('id, post_id, parent_id, author_id, body, created_at, profiles:author_id(id, full_name, username, avatar_url)')
      .single()
    if (!error) {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
      ))
    }
    return error ? null : data
  }

  return {
    posts,
    loading,
    loadMore,
    hasMore,
    createPost,
    deletePost,
    reactToPost,
    commentOnPost,
    reload: loadPosts,
  }
}
