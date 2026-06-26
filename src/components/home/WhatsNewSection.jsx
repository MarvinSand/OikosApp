import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandHeart, ListChecks, Target, UserCircle, Globe, Newspaper, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'

// Die wichtigsten Neuerungen seit der letzten Version. Jede Zeile öffnet das Feature.
const FEATURES = [
  { icon: HandHeart, title: 'Geführter Gebetsmodus',        text: 'Bete fokussiert durch Listen, Ziele & die Oikos Map.', target: '/prayers' },
  { icon: ListChecks, title: 'Gebetslisten',                text: 'Anliegen merken und in eigenen Listen sammeln.',       target: '/prayers' },
  { icon: Target,     title: 'Gebetsziele & Gruppengebete', text: 'Setzt euch gemeinsame Ziele und betet mit.',           target: '/prayers' },
  { icon: UserCircle, title: 'Neue Profilansicht',          text: 'Überarbeitetes Profil mit Oikos Map, Posts & Gebeten.', target: '/profile' },
  { icon: Globe,      title: 'Weltkarte',                   text: 'Events und Geschwister in deiner Nähe entdecken.',     target: '/worldmap' },
  { icon: Newspaper,  title: 'For-You-Feed',                text: 'Anliegen teilen, kommentieren, reagieren & weiterleiten.', target: '/friends?tab=feed' },
]

const INITIAL_COUNT = 4

// Dauerhaft eingeblendete „Was ist neu"-Karte auf der Home-Startseite.
export default function WhatsNewSection() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? FEATURES : FEATURES.slice(0, INITIAL_COUNT)
  const hiddenCount = FEATURES.length - INITIAL_COUNT

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: '18px 16px 14px',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 6px 20px rgba(58,46,36,0.05)',
        overflow: 'hidden',
      }}
    >
      <p style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 4px' }}>
        ✨ Was ist neu
      </p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 14px' }}>
        Die wichtigsten Neuerungen seit dem letzten Update:
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
          {expanded ? <>Weniger anzeigen <ChevronUp size={15} /></> : <>Alle Neuerungen anzeigen <ChevronDown size={15} /></>}
        </button>
      )}
    </div>
  )
}
