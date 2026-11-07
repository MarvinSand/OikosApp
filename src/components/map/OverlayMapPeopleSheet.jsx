import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const BADGE_COLORS = {
  'Freund/in':    { bg: '#E8F4E8', color: 'var(--color-warm-1)' },
  'Kollege/in':   { bg: '#EAF0F8', color: '#3A5F8A' },
  'Familie':      { bg: '#FBF0E8', color: '#A0694A' },
  'Nachbar/in':   { bg: '#F5F0E0', color: '#8A7040' },
  'Bekannte/r':   { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
  'Sonstige/r':   { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Switch({ on }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 40, height: 24, borderRadius: 999, flexShrink: 0, position: 'relative',
        background: on ? 'var(--color-accent)' : 'var(--color-border)',
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.35)', transition: 'left 0.15s',
        }}
      />
    </span>
  )
}

// Kompaktes Personen-Menü für ein Eigene-Map-Kästchen: einfache Liste statt
// explodierter Ansicht auf der Karte, mit einem auffälligen Schalter, der
// das Einblenden auf der Karte separat steuert (siehe MapCanvas.jsx:
// expandedOverlayBoxKeys/onToggleOverlayBoxExpanded).
export default function OverlayMapPeopleSheet({ od, isExpanded, onToggleExpanded, onClose, onSelectPerson }) {
  const [profiles, setProfiles] = useState({}) // { [linked_user_id]: { full_name, username, avatar_url } }

  useEffect(() => {
    const linkedIds = [...new Set((od?.persons || []).map(p => p.linked_user_id).filter(Boolean))]
    if (linkedIds.length === 0) { setProfiles({}); return }
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', linkedIds)
      .then(({ data }) => {
        const byId = {}
        ;(data || []).forEach(p => { byId[p.id] = p })
        setProfiles(byId)
      })
  }, [od])

  if (!od) return null
  const persons = od.persons || []
  const connections = od.connections || []

  function connectedNames(personId) {
    return connections
      .filter(c => c.source_person_id === personId || c.target_person_id === personId)
      .map(c => {
        const otherId = c.source_person_id === personId ? c.target_person_id : c.source_person_id
        return persons.find(p => p.id === otherId)?.name
      })
      .filter(Boolean)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.3)', backdropFilter: 'blur(3px)', zIndex: 40 }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 12,
        left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)', maxWidth: 480,
        backgroundColor: 'var(--color-surface-blur)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border)',
        borderRadius: 32,
        zIndex: 50,
        maxHeight: 'calc(90vh - 24px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px -12px rgba(58,46,36,0.25), 0 0 0 1px rgba(232, 213, 183, 0.3)',
        animation: 'sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)' }} />
        </div>

        {/* Kopfzeile */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '4px 20px 12px', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
              {od.mapName || 'Map'}
            </h3>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>
              {persons.length} {persons.length === 1 ? 'Person' : 'Personen'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, flexShrink: 0, marginLeft: 8 }}
          >
            <X size={18} color="var(--color-text-muted)" />
          </button>
        </div>

        {/* Auffälliger Schalter: Personen auf der Karte ein-/ausblenden */}
        <button
          role="switch"
          aria-checked={isExpanded}
          onClick={onToggleExpanded}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '0 20px 14px', padding: '12px 14px',
            borderRadius: 16, border: 'none', cursor: 'pointer', textAlign: 'left',
            background: isExpanded ? 'var(--color-accent-light)' : 'var(--color-warm-4)',
            flexShrink: 0,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>
              Auf der Karte anzeigen
            </span>
            <span style={{ display: 'block', marginTop: 2, fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Personen dieser Map um das Kästchen herum einblenden
            </span>
          </span>
          <Switch on={isExpanded} />
        </button>

        {/* Scrollbare Liste */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {persons.length === 0 && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', padding: '8px 8px 16px' }}>
              Keine Personen in dieser Map.
            </p>
          )}
          {persons.map(person => {
            const relBadge = BADGE_COLORS[person.relationship_type] || null
            const profile = person.linked_user_id ? profiles[person.linked_user_id] : null
            const displayName = profile?.full_name || profile?.username || person.name
            const names = connectedNames(person.id)
            return (
              <div
                key={person.id}
                onClick={() => onSelectPerson?.(person)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, cursor: 'pointer' }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  backgroundColor: person.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
                }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(displayName)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14.5, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
                    {person.relationship_type && (
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 20, backgroundColor: relBadge?.bg || 'var(--color-warm-4)', color: relBadge?.color || 'var(--color-text-muted)' }}>
                        {person.relationship_type}
                      </span>
                    )}
                    {names.length > 0 && (
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 11.5, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        ↔ {names.slice(0, 2).join(', ')}{names.length > 2 ? ` +${names.length - 2}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {person.linked_user_id && (
                  <span style={{
                    flexShrink: 0, fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700,
                    padding: '4px 9px', borderRadius: 20, backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent-dark)',
                  }}>
                    Account ✓
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
