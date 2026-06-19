import { useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function ItemAvatar({ avatarUrl, name, size = 44 }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0, border: '1px solid var(--color-border)',
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700,
        border: '1px solid var(--color-border)',
      }}
    >
      {getInitials(name)}
    </div>
  )
}

/**
 * Slide-over overlay that stays scoped to the profile page (no route change).
 * Renders a back button + searchable list.
 *
 * `items` shape: { id, title, subtitle?, avatarUrl?, badge? }
 */
export default function ProfileListOverlay({ title, items, onClose, onSelect, emptyText = 'Keine Einträge' }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(it =>
      (it.title || '').toLowerCase().includes(q) ||
      (it.subtitle || '').toLowerCase().includes(q)
    )
  }, [query, items])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        backgroundColor: 'var(--color-bg)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        animation: 'overlaySlideIn 0.18s ease-out',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 52,
          padding: '0 8px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Zurück"
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--color-text)',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
          {title}
        </h2>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px 12px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg-secondary)',
            marginBottom: 8,
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Suchen…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--color-text)',
            }}
          />
        </div>

        {filtered.length === 0 && (
          <p style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {query ? 'Keine Treffer' : emptyText}
          </p>
        )}

        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect?.(item)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '10px 12px',
              border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 10, textAlign: 'left',
            }}
          >
            <ItemAvatar avatarUrl={item.avatarUrl} name={item.title} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </p>
              {item.subtitle && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {item.subtitle}
                </p>
              )}
            </div>
            {item.badge && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes overlaySlideIn {
          from { transform: translateX(8px); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
