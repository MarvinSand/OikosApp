import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, HandHeart, Users, BookMarked, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const FEATURES = [
  { icon: MapPin,    title: 'OIKOS Map',    text: 'Begleite Menschen aus deinem Umfeld im Gebet.', target: '/profile' },
  { icon: HandHeart, title: 'Gebete & Ziele', text: 'Teile Anliegen, bete mit und setzt euch Gebetsziele.', target: '/prayers' },
  { icon: Users,     title: 'Community',     text: 'Finde Geschwister und betet gemeinsam.', target: '/?tab=community' },
  { icon: BookMarked,title: 'Jüngerschaft',  text: 'Wachse Schritt für Schritt im Glauben.', target: '/discipleship' },
]

// Kurzer, wegklickbarer Willkommens-Banner auf der Home-Startseite.
export default function WelcomeBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const storageKey = user ? `oikos_welcome_dismissed_${user.id}` : null
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey) return false
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  if (dismissed) return null

  function handleDismiss() {
    setDismissed(true)
    try { if (storageKey) localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: '18px 16px 16px',
        background: 'linear-gradient(150deg, var(--color-accent-light) 0%, var(--color-bg) 78%)',
        border: '1px solid var(--color-accent)',
        boxShadow: '0 6px 20px rgba(58,46,36,0.06)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={handleDismiss}
        aria-label="Willkommensnachricht schließen"
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer',
          background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
        }}
      >
        <X size={16} />
      </button>

      <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 4px', paddingRight: 34 }}>
        Willkommen bei OIKOS! 🌱
      </p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 14px' }}>
        Schön, dass du da bist. Das kannst du hier entdecken:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FEATURES.map(({ icon: Icon, title, text, target }) => (
          <button
            key={title}
            onClick={() => navigate(target)}
            aria-label={`${title} öffnen`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              padding: 6, margin: -6, borderRadius: 12, border: 'none', background: 'none',
              cursor: 'pointer', transition: 'background-color 0.15s',
            }}
            onMouseDown={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)' }}
            onMouseUp={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}>
              <Icon size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 1px' }}>
                {title}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.45, margin: 0 }}>
                {text}
              </p>
            </div>
            <ChevronRight size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  )
}
