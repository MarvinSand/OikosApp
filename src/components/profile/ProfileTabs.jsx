import { useNavigate } from 'react-router-dom'
import {
  Settings, Lock, Globe, Users as UsersIcon, Home as HomeIcon, Loader2,
} from 'lucide-react'
import { PostCard } from '../../pages/FriendsView'

// ─── Helpers ──────────────────────────────────────────────────
export function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function Avatar({ profile, size = 80, uploading }) {
  const initials = getInitials(profile?.full_name || profile?.username)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
      {uploading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2 size={24} color="white" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}
    </div>
  )
}

export function VisibilityIcon({ visibility }) {
  if (visibility === 'private') return <Lock size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  if (visibility === 'public') return <Globe size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  if (visibility === 'all_siblings') return <UsersIcon size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  if (visibility === 'community') return <HomeIcon size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  return null
}

export const VISIBILITY_LABEL = {
  private: 'Privat',
  all_siblings: 'Geschwister',
  specific_include: 'Geschwister',
  specific_exclude: 'Geschwister',
  community: 'Community',
}

// ─── Maps tab ─────────────────────────────────────────────────
// onOpen(map) is required. onSettings / onCreateMap are optional – when omitted
// (e.g. viewing someone else's profile) the per-map settings button and the
// "Neue Map" tile are hidden, making the tab read-only.
export function MapsTab({ maps, onOpen, onSettings, onCreateMap }) {
  if (maps.length === 0 && !onCreateMap) {
    return (
      <p style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Keine sichtbaren Maps
      </p>
    )
  }
  return (
    <div className="py-3">
      <div className="grid grid-cols-2 gap-3 px-3">
        {maps.map(m => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => onOpen(m)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 6,
                padding: '14px 12px 10px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 22 }}>🗺</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {m.name}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {m.personCount || 0} {m.personCount === 1 ? 'Person' : 'Personen'}
              </p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                <VisibilityIcon visibility={m.visibility} />
                {VISIBILITY_LABEL[m.visibility] || 'Privat'}
              </span>
            </button>

            {onSettings && (
              <button
                onClick={() => onSettings(m)}
                aria-label="Map-Einstellungen"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 0',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        ))}

        {/* New map tile (own profile only) */}
        {onCreateMap && (
          <button
            onClick={onCreateMap}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 12,
              border: '1.5px dashed var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              cursor: 'pointer',
              padding: '24px 12px',
              minHeight: 120,
            }}
          >
            <span style={{ fontSize: 24, color: 'var(--color-accent)' }}>+</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-accent)' }}>
              Neue Map
            </p>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Posts tab ────────────────────────────────────────────────
export function PostsTab({ posts, currentUserId, onReact, onDelete }) {
  const navigate = useNavigate()
  if (posts.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Noch keine Posts
      </p>
    )
  }
  return (
    <div className="px-3 py-3">
      {posts.map(p => (
        <PostCard
          key={p.id}
          post={p}
          currentUserId={currentUserId}
          onReact={onReact}
          onDelete={onDelete}
          onClick={post => navigate(`/feed/post/${post.id}`)}
        />
      ))}
    </div>
  )
}

// ─── Prayers tab ──────────────────────────────────────────────
export function PrayersTab({ prayers }) {
  if (prayers.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Noch keine Gebetsanliegen geteilt
      </p>
    )
  }
  const active = prayers.filter(p => !p.is_answered)
  const answered = prayers.filter(p => p.is_answered)
  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {active.map(p => (
        <div
          key={p.id}
          style={{
            padding: '14px 16px',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            backgroundColor: 'var(--color-bg)',
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
            {p.category ? `${p.category} ` : ''}{p.title}
          </p>
          {p.description && (
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {p.description}
            </p>
          )}
        </div>
      ))}
      {answered.map(p => (
        <div
          key={p.id}
          style={{
            padding: '14px 16px',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            backgroundColor: 'var(--color-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>
              {p.category ? `${p.category} ` : ''}{p.title}
            </p>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
                backgroundColor: 'var(--color-gold-light)',
                color: '#7C5A00',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              ✓ Erhört
            </span>
          </div>
          {p.description && (
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-tertiary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {p.description}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
