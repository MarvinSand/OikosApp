import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import PostEngagementBar from './PostEngagementBar'
import ShareSheet from './ShareSheet'
import SavePostSheet from './SavePostSheet'
import FeedCardFrame, { CONTENT_INSET } from './FeedCardFrame'
import ModerationSheet from '../common/ModerationSheet'
import AnchoredMenu, { anchoredMenuItemStyle } from '../common/AnchoredMenu'
import AdminContentMenuItems from '../moderation/AdminContentMenuItems'
import ModerationHiddenNotice from '../moderation/ModerationHiddenNotice'
import { useModerationDeleted } from '../../lib/moderationState'
import { useBlocks } from '../../hooks/useBlocks'
import { useIsAppAdmin } from '../../hooks/useIsAppAdmin'
import { useT, tr, getLang } from '../../i18n'

function timeAgo(iso) {
  const d = new Date(iso)
  const diff = Math.floor((new Date() - d) / 60000)
  if (diff < 1) return tr('Gerade eben')
  if (diff < 60) return tr('vor {n} Min.', { n: diff })
  const h = Math.floor(diff / 60)
  if (h < 24) return tr('vor {n} Std.', { n: h })
  const days = Math.floor(h / 24)
  if (days === 1) return tr('gestern')
  if (days < 7) return tr('vor {n} Tagen', { n: days })
  return d.toLocaleDateString((getLang() === 'en' ? 'en-US' : 'de-DE'), { day: 'numeric', month: 'short' })
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
  const { t } = useT()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const menuBtnRef = useRef(null)
  const [showModeration, setShowModeration] = useState(false)
  const { isAppAdmin } = useIsAppAdmin()
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const { isBlocked } = useBlocks()
  const moderationDeleted = useModerationDeleted('feed_comment', comment.id)
  const isOwn = comment.author_id === currentUserId
  const author = comment.profiles

  const liked = (comment.likes || []).some(l => l.user_id === currentUserId)
  const likeCount = (comment.likes || []).length
  const reposted = (comment.reposts || []).some(r => r.user_id === currentUserId)
  const repostCount = (comment.reposts || []).length

  if (!isOwn && isBlocked(comment.author_id)) return null
  if (moderationDeleted) return null

  return (
    <FeedCardFrame threadLineBefore={threadLineBefore} threadLineAfter={threadLineAfter}>
      <div style={{ padding: '10px 16px 0' }}>
        <ModerationHiddenNotice contentType="feed_comment" contentId={comment.id} hiddenAt={comment.moderation_hidden_at} />
      </div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
        <button onClick={() => navigate(`/user/${comment.author_id}`)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <CommentAvatar profile={author} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {author?.full_name || author?.username || t('Geschwister')}
            </span>
            {author?.is_christian && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, backgroundColor: 'rgba(196,151,74,0.15)', color: 'var(--color-accent)', fontFamily: 'Lora, serif', letterSpacing: 0.3 }}>{t('Geschwister')}</span>
            )}
          </div>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>
            {timeAgo(comment.created_at)}
          </span>
        </div>
        {!isOwn && (
          <>
            <button ref={menuBtnRef} onClick={() => setShowMenu(v => !v)} aria-label={t('Optionen')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)', display: 'flex' }}>
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <AnchoredMenu anchorRef={menuBtnRef} onClose={() => setShowMenu(false)} minWidth={220}>
                <button onClick={() => { setShowMenu(false); setShowModeration(true) }} style={{ ...anchoredMenuItemStyle, color: 'var(--color-error)' }}>{t('Melden / Blockieren')}</button>
                {isAppAdmin && (
                  <AdminContentMenuItems
                    contentType="feed_comment"
                    contentId={comment.id}
                    hiddenAt={comment.moderation_hidden_at}
                    onClose={() => setShowMenu(false)}
                  />
                )}
              </AnchoredMenu>
            )}
          </>
        )}
        {showModeration && (
          <ModerationSheet
            contentType="feed_comment"
            contentId={comment.id}
            authorId={comment.author_id}
            authorName={author?.full_name || author?.username}
            onClose={() => setShowModeration(false)}
          />
        )}
        {isOwn && (
          <>
            <button ref={menuBtnRef} onClick={() => setShowMenu(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-light)', display: 'flex' }}>
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <AnchoredMenu anchorRef={menuBtnRef} onClose={() => setShowMenu(false)} minWidth={130}>
                <button
                  onClick={() => { setShowMenu(false); onDelete?.(comment.id) }}
                  style={{ ...anchoredMenuItemStyle, color: '#C0392B' }}
                >
                  <Trash2 size={14} />{' '}{t('Löschen')}</button>
              </AnchoredMenu>
            )}
          </>
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
