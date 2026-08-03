import { MessageSquare, Repeat2, Heart, Bookmark, Share } from 'lucide-react'

function fmtCount(n) {
  if (!n) return ''
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

// Twitter-artige Engagement-Leiste: Kommentar · Repost · Like · Aufrufe · Bookmark · Teilen.
// Wird sowohl in der Feed-Liste (PostCard) als auch im Thread (FeedPostView) verwendet.
export default function PostEngagementBar({
  commentCount = 0,
  onComment,
  reposted = false,
  repostCount = 0,
  onRepost,
  liked = false,
  likeCount = 0,
  onLike,
  bookmarked = false,
  bookmarkCount = 0,
  onBookmark,
  onShare,
}) {
  const item = (active, activeColor) => ({
    display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none',
    cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: active ? 700 : 400,
    color: active ? activeColor : 'var(--color-text-muted)', padding: 4,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px 12px 62px' }}>
      <button onClick={e => { e.stopPropagation(); onComment?.() }} style={{ ...item(false), flex: 1 }} aria-label="Kommentieren">
        <MessageSquare size={15} />
        {commentCount > 0 && <span>{fmtCount(commentCount)}</span>}
      </button>

      <button onClick={e => { e.stopPropagation(); onRepost?.() }} style={{ ...item(reposted, '#0F9D58'), flex: 1 }} aria-label="Repost">
        <Repeat2 size={16} />
        {repostCount > 0 && <span>{fmtCount(repostCount)}</span>}
      </button>

      <button onClick={e => { e.stopPropagation(); onLike?.() }} style={{ ...item(liked, '#E0245E'), flex: 1 }} aria-label="Gefällt mir">
        <Heart size={15} fill={liked ? '#E0245E' : 'none'} />
        {likeCount > 0 && <span>{fmtCount(likeCount)}</span>}
      </button>

      <button onClick={e => { e.stopPropagation(); onBookmark?.() }} style={{ ...item(bookmarked, 'var(--color-accent-dark)'), flex: 1 }} aria-label="Merken">
        <Bookmark size={15} fill={bookmarked ? 'var(--color-accent-dark)' : 'none'} />
        {bookmarkCount > 0 && <span>{fmtCount(bookmarkCount)}</span>}
      </button>

      <button onClick={e => { e.stopPropagation(); onShare?.() }} style={item(false)} aria-label="Teilen">
        <Share size={15} />
      </button>
    </div>
  )
}
