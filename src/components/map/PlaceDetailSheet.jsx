import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Search, Plus, MapPin } from 'lucide-react'

const PLACE_TYPES = [
  { type: 'sport',  emoji: '🏋️', label: 'Sport' },
  { type: 'work',   emoji: '💼', label: 'Arbeit' },
  { type: 'school', emoji: '🏫', label: 'Schule' },
  { type: 'church', emoji: '⛪', label: 'Gemeinde' },
  { type: 'place',  emoji: '📍', label: 'Ort' },
  { type: 'other',  emoji: '🗺️', label: 'Sonstiges' },
]

const PLACE_COLORS = ['#8A7060', '#4A6741', '#3B82F6', '#EF4444', '#F59E0B']

function typeEmoji(type) {
  return PLACE_TYPES.find(t => t.type === type)?.emoji || '📍'
}

function typelabel(type) {
  return PLACE_TYPES.find(t => t.type === type)?.label || 'Ort'
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

export default function PlaceDetailSheet({ place, people, placeConnections, onClose, onUpdate, onDelete, onConnectPerson, onDisconnectPerson }) {
  const [editing, setEditing]         = useState(false)
  const [name, setName]               = useState(place.name)
  const [type, setType]               = useState(place.type || 'place')
  const [color, setColor]             = useState(place.color || '#8A7060')
  const [notes, setNotes]             = useState(place.notes || '')
  const [prayerRequest, setPrayer]    = useState(place.prayer_request || '')
  const [prayerPublic, setPrayerPub]  = useState(place.prayer_is_public || false)
  const [isPublic, setIsPublic]       = useState(place.is_public !== false)
  const [savingNote, setSavingNote]   = useState(false)
  const [personSearch, setPersonSearch] = useState('')
  const [showConnectPanel, setShowConnectPanel] = useState(false)
  const [connectContext, setConnectContext] = useState('')
  const [connectTarget, setConnectTarget] = useState(null)
  const saveDebounced = useRef(null)

  const connectedPersonIds = placeConnections
    .filter(c => c.place_id === place.id)
    .map(c => c.person_id)

  const connectedPeople = placeConnections
    .filter(c => c.place_id === place.id)
    .map(c => ({ ...c, person: c.oikos_people }))

  const filteredPeople = (people || []).filter(p =>
    !connectedPersonIds.includes(p.id) &&
    p.name?.toLowerCase().includes(personSearch.toLowerCase())
  )

  // Auto-save notes
  useEffect(() => {
    if (!saveDebounced.current) {
      saveDebounced.current = debounce(async (notes, prayerRequest, prayerPublic, isPublic) => {
        setSavingNote(true)
        await onUpdate(place.id, { notes, prayer_request: prayerRequest, prayer_is_public: prayerPublic, is_public: isPublic })
        setSavingNote(false)
      }, 1000)
    }
  }, [])

  useEffect(() => {
    saveDebounced.current?.(notes, prayerRequest, prayerPublic, isPublic)
  }, [notes, prayerRequest, prayerPublic, isPublic])

  async function handleSaveEdit() {
    await onUpdate(place.id, { name, type, color })
    setEditing(false)
  }

  async function handleConnect() {
    if (!connectTarget) return
    await onConnectPerson(place.id, connectTarget.id, connectContext.trim() || null)
    setConnectTarget(null)
    setConnectContext('')
    setShowConnectPanel(false)
    setPersonSearch('')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '24px 24px 0 0', zIndex: 50,
        maxHeight: '88vh', overflowY: 'auto',
        paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 12px', borderBottom: '1px solid var(--color-warm-3)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {typeEmoji(type)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</h3>
            <span style={{ fontSize: 11, fontFamily: 'Lora, serif', color: 'var(--color-text-muted)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-warm-4)' }}>
              {typelabel(place.type)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => setEditing(v => !v)}
              style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--color-warm-3)', backgroundColor: editing ? 'var(--color-warm-1)' : 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 15 }}>✏️</span>
            </button>
            <button
              onClick={() => { if (window.confirm('Ort wirklich löschen?')) { onDelete(place.id); onClose() } }}
              style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #E8C0B8', backgroundColor: 'rgba(192,57,43,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Trash2 size={15} color="#C0392B" />
            </button>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="var(--color-text-muted)" />
            </button>
          </div>
        </div>

        <div style={{ padding: '16px' }}>

          {/* Edit panel */}
          {editing && (
            <div style={{ padding: '14px', borderRadius: 14, border: '1.5px solid var(--color-warm-1)', backgroundColor: 'rgba(74,103,65,0.04)', marginBottom: 16 }}>
              <p style={sectionLabel}>Name</p>
              <input value={name} onChange={e => setName(e.target.value)} style={inp} />

              <p style={{ ...sectionLabel, marginTop: 12 }}>Typ</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {PLACE_TYPES.map(t => (
                  <button
                    key={t.type}
                    onClick={() => setType(t.type)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, border: `1.5px solid ${type === t.type ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, backgroundColor: type === t.type ? 'rgba(74,103,65,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text)', fontWeight: type === t.type ? 700 : 400 }}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>

              <p style={sectionLabel}>Farbe</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {PLACE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: c, border: `2.5px solid ${color === c ? 'var(--color-text)' : 'transparent'}`, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-muted)' }}>Abbrechen</button>
                <button onClick={handleSaveEdit} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Speichern</button>
              </div>
            </div>
          )}

          {/* Connected people */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={sectionLabel}>👥 Personen hier ({connectedPeople.length})</p>
              <button
                onClick={() => setShowConnectPanel(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={12} /> Person verbinden
              </button>
            </div>

            {/* Horizontal avatar row */}
            {connectedPeople.length > 0 && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                {connectedPeople.map(c => {
                  const initials = (c.person?.name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700 }}>
                          {initials}
                        </div>
                        <button
                          onClick={() => onDisconnectPerson(place.id, c.person_id)}
                          style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#C0392B', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <X size={9} color="white" />
                        </button>
                      </div>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: 'var(--color-text)', maxWidth: 52, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.person?.name || '…'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Connect panel */}
            {showConnectPanel && (
              <div style={{ marginTop: 10, padding: '12px', borderRadius: 14, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-warm-4)' }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 8px' }}>Person suchen</p>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search size={13} color="var(--color-text-light)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input value={personSearch} onChange={e => setPersonSearch(e.target.value)} placeholder="Name suchen…" style={{ ...inp, paddingLeft: 30, fontSize: 13 }} />
                </div>
                {connectTarget ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, backgroundColor: 'rgba(74,103,65,0.1)', border: '1.5px solid var(--color-warm-1)', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-warm-1)', flex: 1 }}>{connectTarget.name}</span>
                      <button onClick={() => setConnectTarget(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', color: 'var(--color-text-muted)' }}><X size={13} /></button>
                    </div>
                    <input
                      value={connectContext}
                      onChange={e => setConnectContext(e.target.value)}
                      placeholder="Kontext (optional): z.B. Dort kennengelernt"
                      style={{ ...inp, fontSize: 13, marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setConnectTarget(null); setPersonSearch('') }} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-muted)' }}>Abbrechen</button>
                      <button onClick={handleConnect} style={{ flex: 2, padding: '9px 0', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Verbinden</button>
                    </div>
                  </>
                ) : (
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {filteredPeople.length === 0 && (
                      <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                        {personSearch ? 'Keine Personen gefunden.' : 'Alle Personen bereits verbunden.'}
                      </p>
                    )}
                    {filteredPeople.map(p => (
                      <button key={p.id} onClick={() => setConnectTarget(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-warm-3)', textAlign: 'left' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {(p.name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)' }}>{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <p style={sectionLabel}>
              📝 Notizen
              {savingNote && <span style={{ fontWeight: 400, color: 'var(--color-text-light)', marginLeft: 6 }}>Speichert…</span>}
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="z.B. Jeden Dienstag und Donnerstag hier"
              rows={3}
              style={{ ...inp, resize: 'none' }}
            />
          </div>

          {/* Prayer request */}
          <div style={{ marginBottom: 16 }}>
            <p style={sectionLabel}>🙏 Gebetsanliegen für diesen Ort</p>
            <textarea
              value={prayerRequest}
              onChange={e => setPrayer(e.target.value)}
              placeholder="Gebetsanliegen eingeben…"
              rows={3}
              style={{ ...inp, resize: 'none', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>Für die Gemeinde sichtbar</span>
              <button
                onClick={() => setPrayerPub(v => !v)}
                style={{ width: 42, height: 24, borderRadius: 12, border: 'none', backgroundColor: prayerPublic ? 'var(--color-warm-1)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: prayerPublic ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-warm-4)' }}>
            <div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>Auf meiner öffentlichen Map sichtbar</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Geschwister sehen diesen Ort + verbundene Personen</p>
            </div>
            <button
              onClick={() => setIsPublic(v => !v)}
              style={{ width: 42, height: 24, borderRadius: 12, border: 'none', backgroundColor: isPublic ? 'var(--color-warm-1)' : 'var(--color-warm-3)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0, marginLeft: 12 }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: isPublic ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

// ─── Add Place Sheet ─────────────────────────────────────────
export function AddPlaceSheet({ onClose, onCreate }) {
  const [name, setName]   = useState('')
  const [type, setType]   = useState('place')
  const [color, setColor] = useState('#8A7060')
  const [saving, setSaving] = useState(false)

  const PLACE_COLORS = ['#8A7060', '#4A6741', '#3B82F6', '#EF4444', '#F59E0B']

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    await onCreate({ name: name.trim(), type, color })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '24px 24px 0 0', zIndex: 50, padding: '16px 20px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Ort hinzufügen</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--color-text-muted)" />
          </button>
        </div>

        <p style={sectionLabel}>Name *</p>
        <input
          autoFocus type="text" value={name}
          onChange={e => setName(e.target.value)}
          placeholder="z.B. Gym, Arbeit, Schule…"
          style={{ ...inp, marginBottom: 14 }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />

        <p style={sectionLabel}>Typ</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {PLACE_TYPES.map(t => (
            <button
              key={t.type}
              onClick={() => setType(t.type)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', borderRadius: 12, border: `1.5px solid ${type === t.type ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, backgroundColor: type === t.type ? 'rgba(74,103,65,0.08)' : 'var(--color-warm-4)', cursor: 'pointer', fontFamily: 'Lora, serif' }}
            >
              <span style={{ fontSize: 20 }}>{t.emoji}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text)', fontWeight: type === t.type ? 700 : 400 }}>{t.label}</span>
            </button>
          ))}
        </div>

        <p style={sectionLabel}>Farbe</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {PLACE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: c, border: `3px solid ${color === c ? 'var(--color-text)' : 'transparent'}`, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'border 0.15s' }}
            />
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', backgroundColor: name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Erstelle…' : 'Ort erstellen'}
        </button>
      </div>
    </>
  )
}

const sectionLabel = { fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }
const inp = { width: '100%', padding: '10px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block', boxSizing: 'border-box' }
