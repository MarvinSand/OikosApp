import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function UserPinSheet({ user, onClose }) {
  const navigate = useNavigate()
  const isChristian = user.is_christian !== false
  const borderColor = isChristian ? '#4A6741' : '#E8865A'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,22,0.4)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#FBF8F3',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 48px',
        maxHeight: '65%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D8D2C5', margin: '0 auto 16px' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: '#A1927F', padding: 4, display: 'flex' }}>
          <X size={20} />
        </button>

        {/* Profile header */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: user.avatar_url ? 'transparent' : borderColor,
            border: `2.5px solid ${borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600, color: '#fff' }}>{getInitials(user.full_name)}</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: '#2C2416', margin: 0 }}>
              {user.full_name || user.username}
            </p>
            {user.username && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#A1927F', margin: '2px 0 0' }}>
                @{user.username}
              </p>
            )}
            {(user.city || user.country) && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#706351', margin: '5px 0 0' }}>
                📍 {[user.city, user.country].filter(Boolean).join(', ')}
              </p>
            )}
            {user.church_name && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#706351', margin: '2px 0 0' }}>
                ⛪ {user.church_name}
              </p>
            )}
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: borderColor, margin: '5px 0 0', fontWeight: 600 }}>
              {isChristian ? 'Bruder/Schwester in Christus' : 'Noch nicht Christ/in'}
            </p>
          </div>
        </div>

        {user.distance != null && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: '#A1927F', textAlign: 'center', marginBottom: 16 }}>
            {user.distance < 1 ? 'Weniger als 1 km entfernt' : `${Math.round(user.distance)} km entfernt`}
          </p>
        )}

        <button
          onClick={() => { onClose(); navigate(`/user/${user.id}`) }}
          style={{
            width: '100%', padding: '13px 0', border: 'none',
            borderRadius: 14, background: '#4A6741',
            color: '#fff', fontFamily: 'Lora, serif',
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
