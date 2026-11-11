import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Einheitliche Kopfzeile für Unterseiten (Einstellungen, Benachrichtigungen,
// Erhörte Gebete, Gebetsreise, Gespeicherte Beiträge …): Zurück-Pfeil links,
// Titel linksbündig, optionale Aktion rechts. `children` landet als zweite
// Zeile im selben sticky Block (z. B. Filter-Chips).
// Liegt im App-Container → keine eigene Safe-Area nötig (siehe CLAUDE.md).
export default function PageHeader({ title, subtitle, onBack, right = null, children = null }) {
  const navigate = useNavigate()
  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-3 px-2" style={{ minHeight: 52 }}>
        <button
          onClick={onBack || (() => navigate(-1))}
          aria-label="Zurück"
          style={{ width: 40, height: 40, flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0, padding: subtitle ? '6px 0' : 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </p>
          )}
        </div>
        {right && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingRight: 6 }}>{right}</div>}
      </div>
      {children}
    </header>
  )
}
