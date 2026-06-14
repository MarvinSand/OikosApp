import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useConnectionsList } from '../hooks/useConnectionsList'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ profile, size = 44 }) {
  const initials = getInitials(profile?.full_name || profile?.username)
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid var(--color-border)',
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        border: '1px solid var(--color-border)',
      }}
    >
      {initials}
    </div>
  )
}

export default function ConnectionsView() {
  const { id } = useParams() // optional :id param – if absent, show own connections
  const navigate = useNavigate()
  const { user } = useAuth()
  const profileUserId = id || user?.id
  const { connections, totalCount, loading, query, searchConnections } = useConnectionsList(profileUserId)

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-2"
        style={{
          height: 52,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Zurück"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          Geschwister {totalCount > 0 && <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>({totalCount})</span>}
        </h2>
      </header>

      {/* Search */}
      <div className="px-4 pt-3">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => searchConnections(e.target.value)}
            placeholder="Suchen…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--color-text)',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="px-2 pt-2">
        {loading && (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            Lade…
          </p>
        )}
        {!loading && connections.length === 0 && (
          <p style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {query ? 'Keine Treffer' : 'Noch keine Geschwister'}
          </p>
        )}
        {!loading && connections.map(c => (
          <button
            key={c.id}
            onClick={() => navigate(`/user/${c.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderRadius: 10,
              textAlign: 'left',
            }}
          >
            <Avatar profile={c} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.full_name || c.username || '—'}
              </p>
              {c.username && (
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                  @{c.username}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
