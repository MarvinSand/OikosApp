import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import PostEngagementBar from './PostEngagementBar'
import ShareSheet from './ShareSheet'
import SavePostSheet from './SavePostSheet'
import FeedCardFrame, { CONTENT_INSET } from './FeedCardFrame'

function timeAgo(iso) {
  const d = new Date(iso)
  const diff = Math.floor((new Date() - d) / 60000)
  if (diff < 1) return 'Gerade eben'
  if (diff < 60) return `vor ${diff} Min.`
  const h = Math.floor(diff / 60)
  if (h < 24) return `vor ${h} Std.`
  const days = Math.floor(h / 24)
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function CommentAvatar({ profile, size = 36 }) {
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

// Kommentar-Karte im selben Stil wie ein Feed-Post: gleiche Icon-Leiste
// (Kommentar/Repost/Like/Bookmark/Teilen); Klick öffnet den Kommentar als
// eigenen Thread mit all seinen Antworten (/feed/comment/:id).
export default function CommentCard({ comment, currentUserId, onLike, onRepost, onBookmark, onBookmarkSaved, onDelete, onClick, threadLineBefore, threadLineAfter }) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const isOwn = comment.author_id === currentUserId
  const author = comment.profiles

  const liked = (comment.likes || []).some(l => l.user_id === currentUserId)
  const likeCount = (comment.likes || []).length
  const reposted = (comment.reposts || []).some(r => r.user_id === currentUserId)
  const repostCount = (comment.reposts || []).length

  return (
    <FeedCardFrame threadLineBefore={threadLineBefore} threadLineAfter={threadLineAfter}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
        <button onClick={() => navigate(`/user/${comment.author_id}`)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <CommentAvatar profile={author} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {author?.full_name || author?.username || 'Geschwister'}
            </span>
            {author?.is_christian && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, backgroundColor: 'rgba(196,151,74,0.15)', color: 'var(--color-accent)', fontFamily: 'Lora, serif', letterSpacing: 0.3 }}>
                Geschwister
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>
            {timeAgo(comment.created_at)}
          </span>
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
                    onClick={() => { setShowMenu(false); onDelete?.(comment.id) }}
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

      {/* Content */}
      <div onClick={() => onClick?.(comment)} style={{ padding: `0 16px 10px ${CONTENT_INSET}px`, cursor: 'pointer' }}>
        <p style={{ fontFamily: 'Lora, serif', color: 'var(--color-text)', margin: 0, lineHeight: 1.6, fontSize: 14, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
          {comment.body}
        </p>
      </div>

      {/* Engagement */}
      <PostEngagementBar
        commentCount={comment.replyCount}
        onComment={() => onClick?.(comment)}
        reposted={reposted}
        repostCount={repostCount}
        onRepost={() => onRepost?.(comment.id)}
        liked={liked}
        likeCount={likeCount}
        onLike={() => onLike?.(comment.id)}
        bookmarked={comment.bookmarked}
        bookmarkCount={comment.bookmark_count}
        onBookmark={() => {
          if (comment.bookmarked) onBookmark?.(comment.id)
          else setShowSaveSheet(true)
        }}
        onShare={() => setShowShareSheet(true)}
      />

      {showSaveSheet && (
        <SavePostSheet
          commentId={comment.id}
          onClose={() => setShowSaveSheet(false)}
          onSaved={() => onBookmarkSaved?.(comment.id)}
        />
      )}

      {showShareSheet && (
        <ShareSheet comment={comment} onClose={() => setShowShareSheet(false)} />
      )}
    </FeedCardFrame>
  )
}
