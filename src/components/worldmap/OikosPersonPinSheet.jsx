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

// Pin-Detail für Personen aus einer Oikos Map ohne eigenen Weltkarten-Profil-Pin
// (accountlos, oder verknüpft aber anderweitig nicht sichtbar). Bewusst eine
// eigene, kleine Datei statt UserPinSheet.jsx zu verbiegen – dessen Felder
// (username/bio/church_name/gender) passen nicht zu dieser Datenform.
export default function OikosPersonPinSheet({ person, onClose }) {
  const navigate = useNavigate()

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 48px',
        maxHeight: '60%',
        overflowY: 'auto',
        animation: 'worldSheetUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 4, display: 'flex' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: C.accent, border: `2.5px dashed ${C.accentDark}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{getInitials(person.name)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>
              {person.name}
            </p>
            {person.relationship_type && (
              <p style={{ fontSize: 12, color: C.textSec, margin: '3px 0 0' }}>
                {person.relationship_type}
              </p>
            )}
            {person.address && (
              <p style={{ fontSize: 12, color: C.textSec, margin: '5px 0 0' }}>
                📍 {person.address}
              </p>
            )}
            <p style={{ fontSize: 11, color: C.textTer, margin: '6px 0 0', fontStyle: 'italic' }}>
              Aus deiner Oikos Map – kein eigener Account
            </p>
          </div>
        </div>

        {person.linked_user_id && (
          <button
            onClick={() => { onClose(); navigate(`/user/${person.linked_user_id}`) }}
            style={{
              width: '100%', padding: '13px 0', border: 'none',
              borderRadius: 14, background: C.accent, color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <ExternalLink size={15} /> Profil ansehen
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
