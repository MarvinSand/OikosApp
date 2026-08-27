import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { COMMENT_SELECT, attachCommentEngagement } from '../lib/commentEngagement'

const POST_SELECT = `
  id, author_id, type, category, title, body, photo_url,
  bible_reference, bible_verse, bible_id, bible_book, bible_chapter, bible_verse_start, bible_verse_end,
  is_public, view_count, bookmark_count, created_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

async function loadAncestorPost(postId, userId) {
  const [{ data: postData }, { data: reactData }, { data: repostData }, { data: bookmarkData }, { data: commentData }] = await Promise.all([
    supabase.from('feed_posts').select(POST_SELECT).eq('id', postId).single(),
    supabase.from('feed_reactions').select('post_id, user_id, type').eq('post_id', postId),
    supabase.from('feed_reposts').select('post_id, user_id').eq('post_id', postId),
    userId ? supabase.from('feed_bookmarks').select('id').eq('post_id', postId).eq('user_id', userId) : Promise.resolve({ data: [] }),
    supabase.from('feed_comments').select('id').eq('post_id', postId),
  ])
  if (!postData) return null
  return {
    ...postData,
    reactions: reactData || [],
    reposts: repostData || [],
    bookmarked: (bookmarkData || []).length > 0,
    commentCount: (commentData || []).length,
  }
}

// Läuft die Eltern-Kette eines Kommentars nach oben (bis zum obersten
// Kommentar, dessen parent_id null ist), damit man beim Öffnen einer
// Antwort wie bei Twitter den ganzen Kontext darüber sieht.
async function loadAncestorChain(startParentId) {
  const chain = []
  let cursor = startParentId
  while (cursor) {
    const { data } = await supabase.from('feed_comments').select(COMMENT_SELECT).eq('id', cursor).single()
    if (!data) break
    chain.unshift(data)
    cursor = data.parent_id
  }
  return chain
}

// Lädt einen einzelnen Kommentar (als "Haupt-Post" des Threads) plus alle
// direkten Antworten darauf, sowie den kompletten Kontext darüber
// (Ursprungs-Post + Eltern-Kommentare) – analog zu useFeed, nur für
// /feed/comment/:id.
export function useCommentThread(commentId) {
  const { user } = useAuth()
  const [comment, setComment] = useState(null)
  const [replies, setReplies] = useState([])
  const [ancestorPost, setAncestorPost] = useState(null)
  const [ancestorComments, setAncestorComments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !commentId) return
    setLoading(true)
    const [{ data: commentData }, { data: replyData }] = await Promise.all([
      supabase.from('feed_comments').select(COMMENT_SELECT).eq('id', commentId).single(),
      supabase.from('feed_comments').select(COMMENT_SELECT).eq('parent_id', commentId).order('created_at'),
    ])
    const [enrichedComment] = commentData ? await attachCommentEngagement([commentData], user.id) : [null]
    const enrichedReplies = await attachCommentEngagement(replyData || [], user.id)
    setComment(enrichedComment || null)
    setReplies(enrichedReplies)

    if (commentData) {
      const [post, chain] = await Promise.all([
        loadAncestorPost(commentData.post_id, user.id),
        loadAncestorChain(commentData.parent_id),
      ])
      setAncestorPost(post)
      setAncestorComments(await attachCommentEngagement(chain, user.id))
    } else {
      setAncestorPost(null)
      setAncestorComments([])
    }

    setLoading(false)
  }, [commentId, user?.id])

  function patchAnywhere(id, updater) {
    setComment(prev => (prev && prev.id === id ? updater(prev) : prev))
    setReplies(prev => prev.map(r => r.id === id ? updater(r) : r))
    setAncestorComments(prev => prev.map(c => c.id === id ? updater(c) : c))
  }

  async function toggleLike(id) {
    const target = [comment, ...replies, ...ancestorComments].find(c => c?.id === id)
    const mine = target?.likes?.find(l => l.user_id === user.id)
    patchAnywhere(id, c => ({
      ...c,
      likes: mine ? c.likes.filter(l => l.user_id !== user.id) : [...(c.likes || []), { comment_id: id, user_id: user.id }],
    }))
    if (mine) await supabase.from('feed_comment_likes').delete().eq('comment_id', id).eq('user_id', user.id)
    else await supabase.from('feed_comment_likes').insert({ comment_id: id, user_id: user.id })
  }

  async function toggleRepost(id) {
    const target = [comment, ...replies, ...ancestorComments].find(c => c?.id === id)
    const mine = target?.reposts?.find(r => r.user_id === user.id)
    patchAnywhere(id, c => ({
      ...c,
      reposts: mine ? c.reposts.filter(r => r.user_id !== user.id) : [...(c.reposts || []), { comment_id: id, user_id: user.id }],
    }))
    if (mine) await supabase.from('feed_comment_reposts').delete().eq('comment_id', id).eq('user_id', user.id)
    else await supabase.from('feed_comment_reposts').insert({ comment_id: id, user_id: user.id })
  }

  async function removeBookmark(id) {
    patchAnywhere(id, c => ({ ...c, bookmarked: false, bookmark_count: Math.max((c.bookmark_count || 0) - 1, 0) }))
    await supabase.from('feed_comment_bookmarks').delete().eq('comment_id', id).eq('user_id', user.id)
  }

  function markBookmarked(id) {
    patchAnywhere(id, c => ({ ...c, bookmarked: true, bookmark_count: (c.bookmark_count || 0) + 1 }))
  }

  async function addReply(body) {
    const text = body.trim()
    if (!text || !comment) return null
    const { data, error } = await supabase
      .from('feed_comments')
      .insert({ post_id: comment.post_id, author_id: user.id, body: text, parent_id: comment.id })
      .select(COMMENT_SELECT)
      .single()
    if (error || !data) return null
    setReplies(prev => [...prev, { ...data, likes: [], reposts: [], bookmarked: false, replyCount: 0 }])
    setComment(prev => prev && { ...prev, replyCount: (prev.replyCount || 0) + 1 })
    return data
  }

  async function deleteReply(id) {
    setReplies(prev => prev.filter(r => r.id !== id))
    setComment(prev => prev && { ...prev, replyCount: Math.max((prev.replyCount || 0) - 1, 0) })
    await supabase.from('feed_comments').delete().eq('id', id)
  }

  // ── Ursprungs-Post (ganz oben in der Kette) ──
  async function togglePostLike() {
    if (!ancestorPost) return
    const mine = ancestorPost.reactions?.find(r => r.user_id === user.id && r.type === 'heart')
    setAncestorPost(prev => prev && {
      ...prev,
      reactions: mine
        ? prev.reactions.filter(r => !(r.user_id === user.id && r.type === 'heart'))
        : [...(prev.reactions || []), { post_id: prev.id, user_id: user.id, type: 'heart' }],
    })
    if (mine) await supabase.from('feed_reactions').delete().eq('post_id', ancestorPost.id).eq('user_id', user.id).eq('type', 'heart')
    else await supabase.from('feed_reactions').insert({ post_id: ancestorPost.id, user_id: user.id, type: 'heart' })
  }

  async function togglePostRepost() {
    if (!ancestorPost) return
    const mine = ancestorPost.reposts?.find(r => r.user_id === user.id)
    setAncestorPost(prev => prev && {
      ...prev,
      reposts: mine ? prev.reposts.filter(r => r.user_id !== user.id) : [...(prev.reposts || []), { post_id: prev.id, user_id: user.id }],
    })
    if (mine) await supabase.from('feed_reposts').delete().eq('post_id', ancestorPost.id).eq('user_id', user.id)
    else await supabase.from('feed_reposts').insert({ post_id: ancestorPost.id, user_id: user.id })
  }

  async function removePostBookmark() {
    if (!ancestorPost) return
    setAncestorPost(prev => prev && { ...prev, bookmarked: false, bookmark_count: Math.max((prev.bookmark_count || 0) - 1, 0) })
    await supabase.from('feed_bookmarks').delete().eq('post_id', ancestorPost.id).eq('user_id', user.id)
  }

  function markPostBookmarked() {
    setAncestorPost(prev => prev && { ...prev, bookmarked: true, bookmark_count: (prev.bookmark_count || 0) + 1 })
  }

  async function deletePost() {
    if (!ancestorPost) return
    await supabase.from('feed_posts').delete().eq('id', ancestorPost.id)
  }

  return {
    comment, replies, ancestorPost, ancestorComments, loading, reload: load,
    toggleLike, toggleRepost, removeBookmark, markBookmarked,
    addReply, deleteReply,
    togglePostLike, togglePostRepost, removePostBookmark, markPostBookmarked, deletePost,
  }
}
