import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const PAGE_SIZE = 20

const POST_SELECT = `
  id, author_id, type, category, title, body, photo_url,
  bible_reference, bible_verse, is_public, visibility_mode,
  visibility_user_ids, excluded_user_ids, created_at, updated_at,
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

    if (filter === 'bibelstelle')  q = q.eq('category', 'bibelstelle')
    else if (filter === 'zeugnis')      q = q.eq('category', 'zeugnis')
    else if (filter === 'frage')        q = q.eq('category', 'frage')
    else if (filter === 'meilenstein')  q = q.eq('category', 'meilenstein')
    else if (filter === 'ermutigung')   q = q.eq('category', 'ermutigung')

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

  /**
   * createPost
   *   body, category (required)
   *   visibilityMode: 'public' | 'siblings' | 'communities' | 'specific_include'
   *   communityIds: array (used when visibilityMode = 'communities')
   *   visibilityUserIds: array (used when visibilityMode = 'specific_include')
   *   excludedUserIds: array (always applied for filtering)
   *   photoFile: optional File object → uploaded to feed-photos bucket
   */
  async function createPost({
    body,
    title = null,
    category,
    visibilityMode = 'public',
    communityIds = [],
    visibilityUserIds = [],
    excludedUserIds = [],
    photoFile = null,
    bibleReference = null,
    bibleVerse = null,
  }) {
    // Step 1: optional photo upload to Supabase Storage
    let photo_url = null
    if (photoFile) {
      try {
        photo_url = await uploadPhoto(photoFile, user.id)
      } catch (err) {
        console.error('Photo upload failed', err)
      }
    }

    // Map category → legacy `type` for backwards compatibility with PostCard rendering
    const legacyType = ({
      bibelstelle: 'bible',
      zeugnis:     'testimony',
      frage:       'question',
      meilenstein: 'text',
      ermutigung:  'text',
      sonstiges:   'text',
    })[category] || 'text'

    const insertPayload = {
      author_id: user.id,
      type: photo_url ? 'photo' : legacyType,
      category,
      title: title || null,
      body,
      photo_url,
      bible_reference: bibleReference,
      bible_verse: bibleVerse,
      is_public: visibilityMode === 'public', // for legacy RLS fallback
      visibility_mode: visibilityMode,
      visibility_user_ids: visibilityMode === 'specific_include' ? visibilityUserIds : [],
      excluded_user_ids: excludedUserIds,
    }

    const { data, error } = await supabase
      .from('feed_posts')
      .insert(insertPayload)
      .select(POST_SELECT)
      .single()

    if (error) {
      console.error('Post insert failed', error)
      return null
    }

    if (visibilityMode === 'communities' && communityIds.length > 0) {
      await supabase
        .from('feed_post_communities')
        .insert(communityIds.map(cid => ({ post_id: data.id, community_id: cid })))
    }

    const post = { ...data, reactions: [], commentCount: 0 }
    setPosts(prev => [post, ...prev])
    return post
  }

  async function deletePost(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('feed_posts').delete().eq('id', postId)
  }

  async function reactToPost(postId, type) {
    const post = posts.find(p => p.id === postId)
    const myReaction = post?.reactions?.find(r => r.user_id === user.id && r.type === type)

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

// ─── Photo upload helper ──────────────────────────────────────
async function uploadPhoto(file, userId) {
  const compressed = await compressImage(file, 1600, 0.85)
  const ext = 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('feed-photos')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('feed-photos').getPublicUrl(path)
  return data.publicUrl
}

function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
        else { width = Math.round(width * maxDim / height); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}
