import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { hashString, getInitials } from '../../lib/communityTheme'

// Deterministische Akzentfarbe je Besitzer-ID – gleiche Idee wie
// communityCover(), nur als flache Farbe statt Verlauf (für kleine Badges).
const OWNER_COLORS = ['#6366F1', '#0EA5E9', '#14B8A6', '#F43F5E', '#D946EF', '#F59E0B', '#EC4899', '#10B981']
function ownerColor(id) {
  return OWNER_COLORS[hashString(id) % OWNER_COLORS.length]
}

function OwnerBadge({ isOwn, ownerName, ownerId }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
      padding: '2px 8px 2px 4px', borderRadius: 999,
      backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        backgroundColor: isOwn ? 'var(--color-accent)' : ownerColor(ownerId),
        color: '#fff', fontSize: 8, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isOwn ? '' : getInitials(ownerName)}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
        {isOwn ? 'Du' : ownerName}
      </span>
    </span>
  )
}

function BulkButtons({ onAll, onNone }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onAll} style={bulkBtn}>Alle ein</button>
      <button onClick={onNone} style={{ ...bulkBtn, color: 'var(--color-text-secondary)' }}>Alle aus</button>
    </div>
  )
}

function CheckRow({ checked, onToggle, children }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', cursor: 'pointer' }}>
      <input
        type="checkbox" checked={checked} onChange={onToggle}
        style={{ width: 16, height: 16, flexShrink: 0, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
    </label>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Oikos-Filter: Von wem → welche Maps → welche Personen
// ════════════════════════════════════════════════════════════════════════
// source: Rückgabe von useOikosFilterSource() – dieser Sheet hat keinen
// eigenen Auswahlzustand, Änderungen wirken sofort (der Hook ist bereits
// die Quelle für den gefilterten Feed).
export default function OikosFilterSheet({ source, onClose }) {
  const [siblingQuery, setSiblingQuery] = useState('')
  const {
    loading, siblings, availableMaps, availablePeople,
    mineOn, setMineOn, siblingsOn, setSiblingsOn,
    checkedSiblingIds, checkedMapIds, checkedPersonIds,
    toggleSibling, toggleMap, togglePerson,
    setAllSiblings, setAllMaps, setAllPeople,
  } = source

  const filteredSiblings = siblings.filter(s =>
    (s.full_name || s.username || '').toLowerCase().includes(siblingQuery.toLowerCase()),
  )

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 70,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Oikos-Gebete auswählen
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Von wem ─────────────────────────────────────────────── */}
        <p style={sectionLabel}>Von wem</p>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: '4px 12px', marginBottom: 18 }}>
          <CheckRow checked={mineOn} onToggle={() => setMineOn(v => !v)}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Meine Maps</span>
          </CheckRow>
          <div style={{ borderTop: '1px solid var(--color-border)' }} />
          <CheckRow checked={siblingsOn} onToggle={() => setSiblingsOn(v => !v)}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Von Geschwistern</span>
          </CheckRow>

          {siblingsOn && (
            <div style={{ padding: '4px 4px 10px' }}>
              {siblings.length === 0 && !loading ? (
                <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', fontStyle: 'italic', margin: '4px 0 6px' }}>
                  Du hast noch keine verbundenen Geschwister.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: 8, backgroundColor: 'var(--color-bg)' }}>
                    <Search size={13} color="var(--color-text-tertiary)" />
                    <input
                      value={siblingQuery} onChange={e => setSiblingQuery(e.target.value)}
                      placeholder="Geschwister suchen…"
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--color-text)' }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <BulkButtons onAll={() => setAllSiblings(true)} onNone={() => setAllSiblings(false)} />
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {filteredSiblings.map(s => (
                      <CheckRow key={s.id} checked={checkedSiblingIds.has(s.id)} onToggle={() => toggleSibling(s.id)}>
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getInitials(s.full_name || s.username)}
                          </span>
                        )}
                        <span style={{ fontSize: 13.5, color: 'var(--color-text)' }}>{s.full_name || s.username}</span>
                      </CheckRow>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Maps ─────────────────────────────────────────────────── */}
        {(mineOn || siblingsOn) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ ...sectionLabel, marginBottom: 0 }}>Maps</p>
              <BulkButtons onAll={() => setAllMaps(true)} onNone={() => setAllMaps(false)} />
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: '4px 12px', marginBottom: 18, maxHeight: 220, overflowY: 'auto' }}>
              {availableMaps.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', fontStyle: 'italic', margin: '10px 0' }}>
                  Keine Maps in dieser Auswahl.
                </p>
              ) : (
                availableMaps.map((m, i) => (
                  <div key={m.id}>
                    {i > 0 && <div style={{ borderTop: '1px solid var(--color-border)' }} />}
                    <CheckRow checked={checkedMapIds.has(m.id)} onToggle={() => toggleMap(m.id)}>
                      <OwnerBadge isOwn={m.isOwn} ownerName={m.ownerName} ownerId={m.ownerId} />
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>{m.name || 'Unbenannte Map'}</span>
                    </CheckRow>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── Personen ─────────────────────────────────────────────── */}
        {(mineOn || siblingsOn) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ ...sectionLabel, marginBottom: 0 }}>Personen</p>
              <BulkButtons onAll={() => setAllPeople(true)} onNone={() => setAllPeople(false)} />
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: '4px 12px', marginBottom: 8, maxHeight: 220, overflowY: 'auto' }}>
              {availablePeople.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', fontStyle: 'italic', margin: '10px 0' }}>
                  Keine Personen in den ausgewählten Maps.
                </p>
              ) : (
                availablePeople.map((p, i) => (
                  <div key={p.id}>
                    {i > 0 && <div style={{ borderTop: '1px solid var(--color-border)' }} />}
                    <CheckRow checked={checkedPersonIds.has(p.id)} onToggle={() => togglePerson(p.id)}>
                      <span style={{ fontSize: 13.5, color: 'var(--color-text)' }}>{p.name}</span>
                      {p.mapName && (
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>· {p.mapName}</span>
                      )}
                    </CheckRow>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 8,
            backgroundColor: 'var(--color-accent)', color: '#fff',
            fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Fertig
        </button>
      </div>
    </>
  )
}

const sectionLabel = {
  fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px',
}
const bulkBtn = {
  padding: '4px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'none',
  fontFamily: 'Lora, serif', fontSize: 11.5, fontWeight: 600, color: 'var(--color-accent-dark)', cursor: 'pointer',
}
