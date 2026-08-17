import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'

const C = {
  accent: 'var(--color-accent)',
  accentDark: 'var(--color-accent-dark)',
  text: 'var(--color-text)',
  textSec: 'var(--color-text-secondary)',
  textTer: 'var(--color-text-tertiary)',
  border: 'var(--color-border)',
  bg: 'var(--color-bg)',
}

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function UserPinSheet({ user, onClose }) {
  const navigate = useNavigate()
  const isChristian = user.is_christian !== false
  const bioVisible = user.show_bio !== false && (user.bio_text || user.bio)
  const bioText = user.bio_text || user.bio
  const identityLabel = !isChristian
    ? 'Noch nicht Christ/in'
    : user.gender === 'brother'
      ? 'Bruder in Christus'
      : user.gender === 'sister'
        ? 'Schwester in Christus'
        : 'Bruder/Schwester in Christus'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 48px',
        maxHeight: '75%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
          <X size={20} />
        </button>

        {/* Profile header */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: user.avatar_url ? 'transparent' : C.accent,
            border: `2.5px solid ${C.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{getInitials(user.full_name)}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>
              {user.full_name || user.username}
            </p>
            {user.username && (
              <p style={{ fontSize: 12, color: C.textTer, margin: '2px 0 0' }}>
                @{user.username}
              </p>
            )}
            {(user.city || user.country) && (
              <p style={{ fontSize: 12, color: C.textSec, margin: '5px 0 0' }}>
                📍 {[user.city, user.country].filter(Boolean).join(', ')}
              </p>
            )}
            {user.church_name && (
              <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>
                ⛪ {user.church_name}
              </p>
            )}
            <p style={{ fontSize: 12, color: C.accentDark, margin: '5px 0 0', fontWeight: 600 }}>
              {identityLabel}
            </p>
          </div>
        </div>

        {/* Bio – vollständig, kein Abschneiden */}
        {bioVisible && (
          <p style={{ fontSize: 14, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: '0 0 18px' }}>
            {bioText}
          </p>
        )}

        {user.distance != null && (
          <p style={{ fontSize: 12, color: C.textTer, textAlign: 'center', marginBottom: 16 }}>
            {user.distance < 1 ? 'Weniger als 1 km entfernt' : `${Math.round(user.distance)} km entfernt`}
          </p>
        )}

        <button
          onClick={() => { onClose(); navigate(`/user/${user.id}`) }}
          style={{
            width: '100%', padding: '13px 0', border: 'none',
            borderRadius: 14, background: C.accent,
            color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <ExternalLink size={15} /> Vollständiges Profil ansehen
        </button>
      </div>
    </div>,
    document.body
  )
}
