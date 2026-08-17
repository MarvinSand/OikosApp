import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, HandHeart, ListChecks, Target, Users, Globe,
  Newspaper, MessageCircle, Moon, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react'

// Alle Kernfunktionen der App – eine Karte, ein Überblick, direkt navigierbar.
const FEATURES = [
  { icon: MapPin,      title: 'Oikos Map',                   text: 'Begleite Menschen aus deinem Umfeld im Gebet – dein persönliches Beziehungsnetz.', target: '/profile' },
  { icon: HandHeart,   title: 'Geführter Gebetsmodus',        text: 'Bete fokussiert durch Listen, Ziele & die Oikos Map.', target: '/prayers' },
  { icon: ListChecks,  title: 'Gebetslisten',                 text: 'Anliegen merken und in eigenen Listen sammeln.', target: '/prayers' },
  { icon: Target,      title: 'Gebetsziele & Gruppengebete',  text: 'Setzt euch gemeinsame Ziele und betet miteinander.', target: '/prayers' },
  { icon: Users,       title: 'Community',                    text: 'Finde Geschwister, tritt Communities bei und betet gemeinsam.', target: '/?tab=community' },
  { icon: Globe,       title: 'Weltkarte',                    text: 'Sieh Events und wo deine Geschwister weltweit unterwegs sind.', target: '/worldmap' },
  { icon: Newspaper,   title: 'For-You-Feed',                 text: 'Anliegen teilen, kommentieren, reagieren & weiterleiten.', target: '/friends?tab=feed' },
  { icon: MessageCircle, title: 'Chats & Benachrichtigungen', text: 'Direkt mit Geschwistern austauschen und nichts verpassen.', target: '/chats' },
  { icon: Moon,        title: 'Dark Mode',                    text: 'Augenschonendes dunkles Design, umschaltbar in den Einstellungen.', target: '/settings' },
]

const INITIAL_COUNT = 4

// Dauerhaft eingeblendete Willkommens- & Funktionsübersicht auf der Home-Startseite.
export default function WelcomeBanner() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? FEATURES : FEATURES.slice(0, INITIAL_COUNT)
  const hiddenCount = FEATURES.length - INITIAL_COUNT

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
      <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 4px' }}>
        Willkommen bei OIKOS! 🌱
      </p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 14px' }}>
        Schön, dass du da bist. Das kannst du hier entdecken:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(({ icon: Icon, title, text, target }) => (
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

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            width: '100%', marginTop: 12, padding: '8px 0', borderRadius: 10,
            border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-accent)',
          }}
        >
          {expanded ? <>Weniger anzeigen <ChevronUp size={15} /></> : <>Alle Funktionen anzeigen <ChevronDown size={15} /></>}
        </button>
      )}
    </div>
  )
}
