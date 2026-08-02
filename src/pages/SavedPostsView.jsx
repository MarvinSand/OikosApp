import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSavedPosts } from '../hooks/useSavedPosts'
import { useBookmarkCollections } from '../hooks/useBookmarkCollections'
import { PostCard } from './FriendsView'

export default function SavedPostsView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { posts, loading, removeBookmark, reactToPost, toggleRepost } = useSavedPosts()
  const { collections } = useBookmarkCollections()
  const [activeCollection, setActiveCollection] = useState('all') // 'all' | 'none' | collection id

  const filtered = useMemo(() => {
    if (activeCollection === 'all') return posts
    if (activeCollection === 'none') return posts.filter(p => !p.collectionId)
    return posts.filter(p => p.collectionId === activeCollection)
  }, [posts, activeCollection])

  const chips = [
    { key: 'all', label: 'Alle' },
    ...collections.map(c => ({ key: c.id, label: c.name })),
    { key: 'none', label: 'Ohne Kategorie' },
  ]

  return (
    <div className="min-h-screen bg-bg pb-24">
      <div style={{ padding: '48px 16px 12px', backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-warm-1)', fontWeight: 600, padding: 0, marginBottom: 10 }}
        >
          <ArrowLeft size={18} /> Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bookmark size={19} color="var(--color-text)" />
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Gespeicherte Beiträge
          </h1>
        </div>

        {collections.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12, paddingBottom: 2 }} className="hide-scrollbar">
            {chips.map(c => {
              const active = activeCollection === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCollection(c.key)}
                  style={{
                    flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-warm-3)'}`,
                    backgroundColor: active ? 'rgba(90,200,250,0.12)' : 'var(--color-bg-secondary)',
                    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontFamily: 'Lora, serif', fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 120, borderRadius: 16, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 32, margin: '0 0 10px' }}>🔖</p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
              {posts.length === 0 ? 'Noch keine gespeicherten Beiträge.' : 'Keine Beiträge in dieser Kategorie.'}
            </p>
          </div>
        )}

        {!loading && filtered.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            onReact={reactToPost}
            onClick={p => navigate(`/feed/post/${p.id}`)}
            onRepost={toggleRepost}
            onBookmark={removeBookmark}
          />
        ))}
      </div>
    </div>
  )
}
