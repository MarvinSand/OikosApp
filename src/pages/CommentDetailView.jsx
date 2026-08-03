import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Trash2, MoreHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { useCommentThread } from '../hooks/useCommentThread'
import { PostCard } from './FriendsView'
import CommentCard from '../components/feed/CommentCard'
import PostEngagementBar from '../components/feed/PostEngagementBar'
import ShareSheet from '../components/feed/ShareSheet'
import SavePostSheet from '../components/feed/SavePostSheet'

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

// Zeigt einen Kommentar als Fokus, wie ein Tweet-Detail bei Twitter:
// scrollt man hoch, sieht man den Ursprungs-Post und die ganze Eltern-Kette
// von Kommentaren darüber. Unter dem fokussierten Kommentar stehen nur
// dessen direkte Antworten, die selbst wieder anklickbar sind.
export default function CommentDetailView() {
  const { id: commentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    comment, replies, ancestorPost, ancestorComments, loading, reload,
    toggleLike, toggleRepost, removeBookmark, markBookmarked,
    addReply, deleteReply,
    togglePostLike, togglePostRepost, removePostBookmark, markPostBookmarked, deletePost,
  } = useCommentThread(commentId)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [ancestorSharePost, setAncestorSharePost] = useState(null)
  const bottomRef = useRef(null)
  const draftRef = useRef(null)

  useEffect(() => { reload() }, [reload])

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    const res = await addReply(text)
    setSending(false)
    if (res) {
      setDraft('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } else {
      showToast('Fehler beim Antworten', 'error')
    }
  }

  async function handleDeleteRoot() {
    if (!comment || !window.confirm('Kommentar wirklich löschen?')) return
    await supabase.from('feed_comments').delete().eq('id', comment.id)
    if (comment.parent_id) navigate(`/feed/comment/${comment.parent_id}`, { replace: true })
    else navigate(`/feed/post/${comment.post_id}`, { replace: true })
  }

  async function handleDeleteReply(replyId) {
    await deleteReply(replyId)
  }

  async function handleDeleteAncestorComment(id) {
    if (!window.confirm('Kommentar wirklich löschen?')) return
    await supabase.from('feed_comments').delete().eq('id', id)
    await reload()
  }

  async function handleDeleteAncestorPost() {
    if (!window.confirm('Post wirklich löschen?')) return
    await deletePost()
    navigate('/friends?tab=feed', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="px-4 pt-12 space-y-3">
          <div className="h-8 bg-warm-3/40 rounded w-1/3 mb-6" />
          <div className="h-32 bg-surface rounded-2xl" />
          <div className="h-16 bg-surface rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!comment) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p style={{ fontFamily: 'Lora, serif', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Kommentar nicht gefunden.</p>
      </div>
    )
  }

  const isOwn = comment.author_id === user?.id
  const liked = (comment.likes || []).some(l => l.user_id === user?.id)
  const likeCount = (comment.likes || []).length
  const reposted = (comment.reposts || []).some(r => r.user_id === user?.id)
  const repostCount = (comment.reposts || []).length

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Back button */}
      <div style={{ padding: '48px 16px 12px', backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-warm-3)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-warm-1)', fontWeight: 600, padding: 0 }}
        >
          <ArrowLeft size={18} /> Zurück
        </button>
      </div>

      <div>
        {/* ── Kontext oberhalb: Ursprungs-Post + Eltern-Kommentare (wie bei Twitter beim Hochscrollen) ── */}
        {ancestorPost && (
          <PostCard
            post={ancestorPost}
            currentUserId={user?.id}
            onReact={togglePostLike}
            onDelete={handleDeleteAncestorPost}
            onClick={p => navigate(`/feed/post/${p.id}`)}
            onRepost={togglePostRepost}
            onBookmark={removePostBookmark}
            onBookmarkSaved={markPostBookmarked}
            onShare={setAncestorSharePost}
            threadLineAfter
          />
        )}

        {ancestorComments.map(ancestor => (
          <CommentCard
            key={ancestor.id}
            comment={ancestor}
            currentUserId={user?.id}
            onLike={toggleLike}
            onRepost={toggleRepost}
            onBookmark={removeBookmark}
            onBookmarkSaved={markBookmarked}
            onDelete={handleDeleteAncestorComment}
            onClick={c => navigate(`/feed/comment/${c.id}`)}
            threadLineAfter
          />
        ))}

        {/* ── Fokussierter Kommentar (voll, wie ein Post) ── */}
        <div style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-warm-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
            <button onClick={() => navigate(`/user/${comment.author_id}`)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
              <UserAvatar profile={comment.profiles} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {comment.profiles?.full_name || comment.profiles?.username || 'Geschwister'}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', margin: 0 }}>{timeAgo(comment.created_at)}</p>
            </div>
            {isOwn && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowMenu(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)', display: 'flex' }}>
                  <MoreHorizontal size={16} />
                </button>
                {showMenu && (
                  <>
                    <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                    <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.12)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 130 }}>
                      <button
                        onClick={() => { setShowMenu(false); handleDeleteRoot() }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: '#C0392B', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} /> Löschen
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '0 16px 14px' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {comment.body}
            </p>
          </div>

          <PostEngagementBar
            commentCount={comment.replyCount}
            onComment={() => draftRef.current?.focus()}
            reposted={reposted}
            repostCount={repostCount}
            onRepost={() => toggleRepost(comment.id)}
            liked={liked}
            likeCount={likeCount}
            onLike={() => toggleLike(comment.id)}
            bookmarked={comment.bookmarked}
            bookmarkCount={comment.bookmark_count}
            onBookmark={() => {
              if (comment.bookmarked) removeBookmark(comment.id)
              else setShowSaveSheet(true)
            }}
            onShare={() => setShowShareSheet(true)}
          />
        </div>

        {/* ── Divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 14px', padding: '0 16px' }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {replies.length} {replies.length === 1 ? 'Antwort' : 'Antworten'}
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
        </div>

        {/* ── Antworten ── */}
        {replies.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              Noch keine Antworten. Sei die Erste!
            </p>
          </div>
        )}

        {replies.map(reply => (
          <CommentCard
            key={reply.id}
            comment={reply}
            currentUserId={user?.id}
            onLike={toggleLike}
            onRepost={toggleRepost}
            onBookmark={removeBookmark}
            onBookmarkSaved={markBookmarked}
            onDelete={handleDeleteReply}
            onClick={c => navigate(`/feed/comment/${c.id}`)}
          />
        ))}

        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── Sticky Antwort-Eingabe ── */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-warm-3)', padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', zIndex: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={draftRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Antworten…"
            rows={1}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', resize: 'none', outline: 'none', lineHeight: 1.4 }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', backgroundColor: draft.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', cursor: draft.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.2s' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {showSaveSheet && (
        <SavePostSheet
          commentId={comment.id}
          onClose={() => setShowSaveSheet(false)}
          onSaved={() => markBookmarked(comment.id)}
        />
      )}

      {showShareSheet && (
        <ShareSheet comment={comment} onClose={() => setShowShareSheet(false)} />
      )}

      {ancestorSharePost && (
        <ShareSheet post={ancestorSharePost} onClose={() => setAncestorSharePost(null)} />
      )}
    </div>
  )
}
