import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, BookOpen, HandHeart, HelpCircle, MessageSquare, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ShareSheet from '../components/feed/ShareSheet'
import SavePostSheet from '../components/feed/SavePostSheet'
import PostEngagementBar from '../components/feed/PostEngagementBar'

// ─── Helpers ─────────────────────────────────────────────────
const TYPE_CONFIG = {
  text:      { icon: MessageSquare, label: 'Gedanke',    color: 'var(--color-warm-1)' },
  bible:     { icon: BookOpen,      label: 'Bibelstelle', color: 'var(--color-accent)' },
  testimony: { icon: HandHeart,     label: 'Zeugnis',    color: 'var(--color-warm-1)' },
  question:  { icon: HelpCircle,    label: 'Frage',      color: '#3B82F6' },
  photo:     { icon: MessageSquare, label: 'Foto',       color: 'var(--color-warm-1)' },
}

function timeAgo(iso) {
  const d = new Date(iso)
  const diff = Math.floor((new Date() - d) / 60000)
  if (diff < 1) return 'Gerade eben'
  if (diff < 60) return `vor ${diff} Min.`
  const h = Math.floor(diff / 60)
  if (h < 24) return `vor ${h} Std.`
  const days = Math.floor(h / 24)
  if (days === 1) return 'gestern'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function UserAvatar({ profile, size = 36 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
      overflow: 'hidden',
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )
}

const POST_SELECT = `
  id, author_id, type, category, title, body, photo_url,
  bible_reference, bible_verse, is_public, view_count, bookmark_count, created_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

const FEED_CATEGORIES = [
  { key: 'bibelstelle', label: 'Bibelstelle', emoji: '📖' },
  { key: 'zeugnis',     label: 'Zeugnis',     emoji: '🙌' },
  { key: 'frage',       label: 'Frage',       emoji: '❓' },
  { key: 'meilenstein', label: 'Meilenstein', emoji: '🏔' },
  { key: 'ermutigung',  label: 'Ermutigung',  emoji: '💛' },
  { key: 'sonstiges',   label: 'Sonstiges',   emoji: '💬' },
]

export default function FeedPostView() {
  const { id: postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [post, setPost] = useState(null)
  const [reactions, setReactions] = useState([])
  const [reposts, setReposts] = useState([])
  const [bookmarked, setBookmarked] = useState(false)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null) // { id, author: name }
  const [sending, setSending] = useState(false)
  const [sharePost, setSharePost] = useState(null)
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const bottomRef = useRef(null)
  const draftRef = useRef(null)

  useEffect(() => { load() }, [postId, user?.id])

  async function load() {
    setLoading(true)
    const [{ data: postData }, { data: reactData }, { data: commentData }, { data: repostData }, { data: bookmarkData }] = await Promise.all([
      supabase.from('feed_posts').select(POST_SELECT).eq('id', postId).single(),
      supabase.from('feed_reactions').select('id, user_id, type').eq('post_id', postId),
      supabase.from('feed_comments')
        .select('id, post_id, parent_id, author_id, body, created_at, profiles:author_id(id, full_name, username, avatar_url, is_christian)')
        .eq('post_id', postId)
        .order('created_at'),
      supabase.from('feed_reposts').select('id, user_id').eq('post_id', postId),
      user
        ? supabase.from('feed_bookmarks').select('id').eq('post_id', postId).eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])
    setPost(postData || null)
    setReactions(reactData || [])
    setComments(commentData || [])
    setReposts(repostData || [])
    setBookmarked((bookmarkData || []).length > 0)
    setLoading(false)
    if (postData) supabase.rpc('increment_feed_post_view', { p_post_id: postId })
  }

  async function toggleReaction(type) {
    const mine = reactions.find(r => r.user_id === user.id && r.type === type)
    if (mine) {
      setReactions(prev => prev.filter(r => r.id !== mine.id))
      await supabase.from('feed_reactions').delete().eq('id', mine.id)
    } else {
      const { data } = await supabase
        .from('feed_reactions')
        .insert({ post_id: postId, user_id: user.id, type })
        .select('id, user_id, type')
        .single()
      if (data) setReactions(prev => [...prev, data])
    }
  }

  async function toggleRepost() {
    const mine = reposts.find(r => r.user_id === user.id)
    if (mine) {
      setReposts(prev => prev.filter(r => r.id !== mine.id))
      await supabase.from('feed_reposts').delete().eq('id', mine.id)
    } else {
      const { data } = await supabase
        .from('feed_reposts')
        .insert({ post_id: postId, user_id: user.id })
        .select('id, user_id')
        .single()
      if (data) setReposts(prev => [...prev, data])
    }
  }

  async function removeBookmark() {
    setBookmarked(false)
    setPost(prev => prev && { ...prev, bookmark_count: Math.max((prev.bookmark_count || 0) - 1, 0) })
    await supabase.from('feed_bookmarks').delete().eq('post_id', postId).eq('user_id', user.id)
  }

  async function sendComment() {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    const { data, error } = await supabase
      .from('feed_comments')
      .insert({ post_id: postId, author_id: user.id, body, parent_id: replyTo?.id || null })
      .select('id, post_id, parent_id, author_id, body, created_at, profiles:author_id(id, full_name, username, avatar_url, is_christian)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setDraft('')
      setReplyTo(null)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setSending(false)
  }

  async function deleteComment(commentId) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    await supabase.from('feed_comments').delete().eq('id', commentId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="px-4 pt-12 space-y-3">
          <div className="h-8 bg-warm-3/40 rounded w-1/3 mb-6" />
          <div className="h-32 bg-surface rounded-2xl" />
          <div className="h-16 bg-surface rounded-2xl" />
          <div className="h-16 bg-surface rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p style={{ fontFamily: 'Lora, serif', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Post nicht gefunden.</p>
      </div>
    )
  }

  const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.text
  const liked = reactions.some(x => x.type === 'heart' && x.user_id === user?.id)
  const likeCount = reactions.filter(x => x.type === 'heart').length
  const reposted = reposts.some(r => r.user_id === user?.id)

  const topComments  = comments.filter(c => !c.parent_id)
  const getReplies   = (parentId) => comments.filter(c => c.parent_id === parentId)

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Back button */}
      <div style={{ padding: '48px 16px 12px', backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-warm-1)', fontWeight: 600, padding: 0 }}
        >
          <ArrowLeft size={18} /> Zurück
        </button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* ── Original post (full) ── */}
        <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, border: '1.5px solid var(--color-warm-3)', marginBottom: 8, overflow: 'hidden' }}>
          {/* Author row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
            <UserAvatar profile={post.profiles} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {post.profiles?.full_name || post.profiles?.username || 'Geschwister'}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', margin: 0 }}>{timeAgo(post.created_at)}</p>
            </div>
            {(() => {
              const catCfg = FEED_CATEGORIES.find(c => c.key === post.category)
              return catCfg ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'Lora, serif', fontWeight: 700, color: 'var(--color-accent-dark)', padding: '3px 10px', borderRadius: 20, backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-accent)', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 13 }}>{catCfg.emoji}</span> {catCfg.label}
                </span>
              ) : (
                <span style={{ fontSize: 10, fontFamily: 'Lora, serif', color: cfg.color, padding: '2px 8px', borderRadius: 20, border: `1px solid ${cfg.color}20`, backgroundColor: `${cfg.color}10`, fontWeight: 600 }}>
                  {cfg.label}
                </span>
              )
            })()}
          </div>

          {/* Content */}
          <div style={{ padding: '0 16px 14px' }}>
            {post.title && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>{post.title}</p>
            )}
            {post.type === 'bible' && (
              <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 12, marginBottom: 10 }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', margin: '0 0 5px' }}>📖 {post.bible_reference}</p>
                {post.bible_verse && (
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontStyle: 'italic', color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.6 }}>„{post.bible_verse}"</p>
                )}
              </div>
            )}
            {post.type === 'photo' && post.photo_url && (
              <img src={post.photo_url} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, marginBottom: 10, display: 'block' }} />
            )}
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text)', margin: 0, lineHeight: 1.7 }}>{post.body}</p>
          </div>

          {/* Engagement */}
          <PostEngagementBar
            commentCount={comments.length}
            onComment={() => draftRef.current?.focus()}
            reposted={reposted}
            repostCount={reposts.length}
            onRepost={toggleRepost}
            liked={liked}
            likeCount={likeCount}
            onLike={() => toggleReaction('heart')}
            bookmarked={bookmarked}
            bookmarkCount={post.bookmark_count}
            onBookmark={() => {
              if (bookmarked) removeBookmark()
              else setShowSaveSheet(true)
            }}
            onShare={() => setSharePost(post)}
          />
        </div>

        {/* ── Divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 14px' }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {comments.length} {comments.length === 1 ? 'Antwort' : 'Antworten'}
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
        </div>

        {/* ── Comments ── */}
        {comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              Noch keine Antworten. Sei die Erste!
            </p>
          </div>
        )}

        {topComments.map(comment => {
          const replies = getReplies(comment.id)
          const isOwn = comment.author_id === user?.id
          return (
            <div key={comment.id} style={{ marginBottom: 12 }}>
              <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, border: '1px solid var(--color-warm-3)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <UserAvatar profile={comment.profiles} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                        {comment.profiles?.full_name || comment.profiles?.username || '…'}
                      </span>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>{timeAgo(comment.created_at)}</span>
                      {isOwn && (
                        <button onClick={() => deleteComment(comment.id)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#C0392B', display: 'flex', padding: 2 }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>{comment.body}</p>
                    <button
                      onClick={() => setReplyTo({ id: comment.id, author: comment.profiles?.full_name || comment.profiles?.username })}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', padding: '4px 0 0', fontWeight: 600 }}
                    >
                      Antworten
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {replies.map(reply => (
                <div key={reply.id} style={{ marginLeft: 30, marginTop: 6 }}>
                  <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 12, border: '1px solid var(--color-warm-3)', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <UserAvatar profile={reply.profiles} size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                            {reply.profiles?.full_name || reply.profiles?.username || '…'}
                          </span>
                          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>{timeAgo(reply.created_at)}</span>
                          {reply.author_id === user?.id && (
                            <button onClick={() => deleteComment(reply.id)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#C0392B', display: 'flex', padding: 2 }}>
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>{reply.body}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── Sticky comment input ── */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-warm-3)', padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', zIndex: 20 }}>
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', borderRadius: 8, backgroundColor: 'var(--color-warm-4)', border: '1px solid var(--color-warm-3)' }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', flex: 1 }}>
              Antwort an <strong>{replyTo.author}</strong>
            </span>
            <button onClick={() => setReplyTo(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', color: 'var(--color-text-light)' }}>
              <X size={14} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={draftRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
            placeholder="Schreib eine Antwort…"
            rows={1}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', resize: 'none', outline: 'none', lineHeight: 1.4 }}
          />
          <button
            onClick={sendComment}
            disabled={!draft.trim() || sending}
            style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', backgroundColor: draft.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', cursor: draft.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.2s' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {sharePost && (
        <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />
      )}

      {showSaveSheet && (
        <SavePostSheet
          postId={post.id}
          onClose={() => setShowSaveSheet(false)}
          onSaved={() => {
            setBookmarked(true)
            setPost(prev => prev && { ...prev, bookmark_count: (prev.bookmark_count || 0) + 1 })
          }}
        />
      )}
    </div>
  )
}
