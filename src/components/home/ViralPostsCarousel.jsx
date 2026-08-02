import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useViralPosts } from '../../hooks/useViralPosts'
import { PostCard } from '../../pages/FriendsView'
import ShareSheet from '../feed/ShareSheet'

const noop = () => {}

// Swipe-Karussell der 3 viralsten Feedposts dieser Woche (eine Karte pro Breite).
export default function ViralPostsCarousel() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { posts, loading } = useViralPosts(3)
  const [active, setActive] = useState(0)
  const [sharePost, setSharePost] = useState(null)
  const trackRef = useRef(null)

  if (loading) {
    return <div style={{ height: 180, borderRadius: 16, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
  }
  if (!posts.length) return null

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== active) setActive(idx)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Flame size={14} color="var(--color-accent)" />
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          Diese Woche im Feed
        </p>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="hide-scrollbar"
        style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
          margin: '0 -2px', padding: '0 2px',
        }}
      >
        {posts.map(post => (
          <div key={post.id} style={{ flex: '0 0 100%', scrollSnapAlign: 'center', minWidth: 0 }}>
            <PostCard
              post={post}
              currentUserId={user?.id}
              onReact={noop}
              onDelete={noop}
              onClick={p => navigate(`/feed/post/${p.id}`)}
              onShare={setSharePost}
            />
          </div>
        ))}
      </div>

      {/* Punkte-Indikator */}
      {posts.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {posts.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === active ? 18 : 6, height: 6, borderRadius: 3,
                backgroundColor: i === active ? 'var(--color-accent)' : 'var(--color-warm-3)',
                transition: 'width 0.25s, background-color 0.25s',
              }}
            />
          ))}
        </div>
      )}

      {/* Feed öffnen */}
      <button
        onClick={() => navigate('/friends?tab=feed')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          width: '100%', marginTop: 10, padding: '6px 0', border: 'none', background: 'none',
          cursor: 'pointer', color: 'var(--color-text-muted)', fontFamily: 'Lora, serif',
          fontSize: 12, fontWeight: 600,
        }}
      >
        Feed öffnen <ChevronRight size={13} />
      </button>

      {sharePost && (
        <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />
      )}
    </div>
  )
}
