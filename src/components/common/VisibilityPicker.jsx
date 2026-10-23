import { Lock, Globe, Home as HomeIcon, UserCheck, Users } from 'lucide-react'
import SiblingPicker from '../prayer/SiblingPicker'

// Gemeinsame Sichtbarkeits-Auswahl (Privat/Öffentlich/Community/Geschwister/
// Ausgewählte Geschwister) - nach dem Vorbild von Prayers.jsx'
// VISIBILITY_OPTIONS/row(active), hier aber als eigenständige, wiederverwendbare
// Komponente statt einer weiteren Kopie. "Privat" ergänzt (bei Prayers.jsx
// aktuell nicht in der Erstellen-Oberfläche wählbar, obwohl die Spalte es
// zulässt) - für Bibel-Notizen explizit gefordert.
export const VISIBILITY_OPTIONS = [
  { key: 'private',  label: 'Privat',                  icon: Lock },
  { key: 'public',   label: 'Öffentlich',               icon: Globe },
  { key: 'community', label: 'Community',               icon: HomeIcon },
  { key: 'siblings', label: 'Geschwister',               icon: UserCheck },
  { key: 'specific', label: 'Ausgewählte Geschwister',   icon: Users },
]

function row(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  }
}

const field = { width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box', display: 'block' }
const hint = { fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic', margin: '8px 0 0' }

export default function VisibilityPicker({
  value, onChange,
  communityId, onCommunityIdChange,
  siblingIds, onSiblingIdsChange,
  myCommunities = [],
}) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {VISIBILITY_OPTIONS.map(o => {
          const Icon = o.icon
          const active = value === o.key
          return (
            <button key={o.key} type="button" onClick={() => onChange(o.key)} style={row(active)}>
              <Icon size={16} color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>{o.label}</span>
            </button>
          )
        })}
      </div>
      {value === 'community' && (
        myCommunities.length === 0 ? (
          <p style={hint}>Du bist noch in keiner Community.</p>
        ) : (
          <select
            value={communityId || ''}
            onChange={e => onCommunityIdChange(e.target.value || null)}
            style={{ ...field, marginTop: 8, appearance: 'none' }}
          >
            <option value="">— Community auswählen —</option>
            {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )
      )}
      {value === 'specific' && (
        <div style={{ marginTop: 8 }}>
          <SiblingPicker selected={siblingIds} onChange={onSiblingIdsChange} />
        </div>
      )}
    </div>
  )
}
