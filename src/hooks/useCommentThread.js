import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { COMMENT_SELECT, attachCommentEngagement } from '../lib/commentEngagement'

// Lädt einen einzelnen Kommentar (als "Haupt-Post" des Threads) plus alle
// direkten Antworten darauf – analog zu useFeed, nur für /feed/comment/:id.
export function useCommentThread(commentId) {
  const { user } = useAuth()
  const [comment, setComment] = useState(null)
  const [replies, setReplies] = useState([])
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
    setLoading(false)
  }, [commentId, user?.id])

  function patchAnywhere(id, updater) {
    setComment(prev => (prev && prev.id === id ? updater(prev) : prev))
    setReplies(prev => prev.map(r => r.id === id ? updater(r) : r))
  }

  async function toggleLike(id) {
    const target = comment?.id === id ? comment : replies.find(r => r.id === id)
    const mine = target?.likes?.find(l => l.user_id === user.id)
    patchAnywhere(id, c => ({
      ...c,
      likes: mine ? c.likes.filter(l => l.user_id !== user.id) : [...(c.likes || []), { comment_id: id, user_id: user.id }],
    }))
    if (mine) await supabase.from('feed_comment_likes').delete().eq('comment_id', id).eq('user_id', user.id)
    else await supabase.from('feed_comment_likes').insert({ comment_id: id, user_id: user.id })
  }

  async function toggleRepost(id) {
    const target = comment?.id === id ? comment : replies.find(r => r.id === id)
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

  return {
    comment, replies, loading, reload: load,
    toggleLike, toggleRepost, removeBookmark, markBookmarked,
    addReply, deleteReply,
  }
}
