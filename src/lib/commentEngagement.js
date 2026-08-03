import { supabase } from './supabase'

export const COMMENT_SELECT = `
  id, post_id, parent_id, author_id, body, like_count, repost_count, bookmark_count, created_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

// Reichert Kommentare mit denselben Engagement-Daten an wie Feed-Posts:
// eigene Likes/Reposts/Bookmark-Status sowie die Anzahl direkter Antworten.
export async function attachCommentEngagement(rawComments, userId) {
  if (!rawComments.length) return rawComments
  const ids = rawComments.map(c => c.id)
  const [{ data: likes }, { data: reposts }, { data: bookmarks }, { data: replies }] = await Promise.all([
    supabase.from('feed_comment_likes').select('comment_id, user_id').in('comment_id', ids),
    supabase.from('feed_comment_reposts').select('comment_id, user_id').in('comment_id', ids),
    userId
      ? supabase.from('feed_comment_bookmarks').select('comment_id').in('comment_id', ids).eq('user_id', userId)
      : Promise.resolve({ data: [] }),
    supabase.from('feed_comments').select('parent_id').in('parent_id', ids),
  ])
  const likeMap = {}
  ;(likes || []).forEach(l => { (likeMap[l.comment_id] ||= []).push(l) })
  const repostMap = {}
  ;(reposts || []).forEach(r => { (repostMap[r.comment_id] ||= []).push(r) })
  const bookmarkedSet = new Set((bookmarks || []).map(b => b.comment_id))
  const replyCount = {}
  ;(replies || []).forEach(r => { replyCount[r.parent_id] = (replyCount[r.parent_id] || 0) + 1 })

  return rawComments.map(c => ({
    ...c,
    likes: likeMap[c.id] || [],
    reposts: repostMap[c.id] || [],
    bookmarked: bookmarkedSet.has(c.id),
    replyCount: replyCount[c.id] || 0,
  }))
}
