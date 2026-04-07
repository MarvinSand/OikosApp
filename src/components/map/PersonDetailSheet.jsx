import { useState } from 'react'
import { X, Pencil, Trash2, Palette } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import PrayerRequestsSection from '../person/PrayerRequestsSection'
import ImpactMapSection from '../person/ImpactMapSection'
import StoryLineSection from '../person/StoryLineSection'

const RELATIONSHIP_TYPES = ['Freund/in', 'Kollege/in', 'Familie', 'Nachbar/in', 'Bekannte/r', 'Sonstige/r']

const CIRCLE_COLORS = [
  { label: 'Standard', hex: '#E8E4DC' },
  { label: 'Grün', hex: '#66BB6A' },
  { label: 'Rot', hex: '#EF5350' },
  { label: 'Blau', hex: '#42A5F5' },
  { label: 'Orange', hex: '#FFA726' },
  { label: 'Gelb', hex: '#FFEE58' },
  { label: 'Lila', hex: '#AB47BC' },
  { label: 'Pink', hex: '#EC407A' },
]

const NAME_COLORS = [
  { label: 'Schwarz', hex: '#1A1A1A' },
  { label: 'Weiß', hex: '#FFFFFF' },
]

const CONN_COLORS = [
  { label: 'Standard', hex: '#C8BFB0' },
  { label: 'Grün', hex: '#66BB6A' },
  { label: 'Rot', hex: '#EF5350' },
  { label: 'Blau', hex: '#42A5F5' },
  { label: 'Orange', hex: '#FFA726' },
  { label: 'Gelb', hex: '#FFEE58' },
  { label: 'Lila', hex: '#AB47BC' },
  { label: 'Pink', hex: '#EC407A' },
]

function ColorSwatches({ colors, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {colors.map(c => (
        <button
          key={c.hex}
          title={c.label}
          onClick={() => onSelect(c.hex)}
          style={{
            width: 32, height: 32, borderRadius: '50%', backgroundColor: c.hex,
            border: selected === c.hex ? '3px solid var(--color-text)' : '2px solid rgba(0,0,0,0.12)',
            cursor: 'pointer', padding: 0, flexShrink: 0,
            boxShadow: selected === c.hex ? '0 0 0 2px white inset' : 'none',
            transition: 'transform 0.1s',
          }}
        />
      ))}
    </div>
  )
}

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

function EditPersonForm({ person, onSave, onCancel }) {
  const [name, setName] = useState(person.name)
  const [relType, setRelType] = useState(person.relationship_type || '')
  const [isChristian, setIsChristian] = useState(person.is_christian || false)
  const [notes, setNotes] = useState(person.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), relationship_type: relType || null, is_christian: isChristian, notes: notes.trim() })
    setSaving(false)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
      <label style={lbl}>Name</label>
      <input type="text" value={name} onChange={e => setName(e.target.value)} style={inp} />

      <label style={{ ...lbl, marginTop: 12 }}>Beziehung</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
        {RELATIONSHIP_TYPES.map(t => (
          <button
            key={t} onClick={() => setRelType(relType === t ? '' : t)}
            style={{ padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, backgroundColor: relType === t ? 'var(--color-warm-1)' : 'var(--color-white)', color: relType === t ? 'white' : 'var(--color-text-muted)' }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span style={lbl}>Ist Christ/in</span>
        <button onClick={() => setIsChristian(!isChristian)} style={toggleTrack(isChristian)}>
          <div style={toggleThumb(isChristian)} />
        </button>
      </div>

      <label style={{ ...lbl, marginTop: 14 }}>Notiz / Beschreibung</label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Wer ist diese Person?" />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer' }}>
          Abbrechen
        </button>
        <button onClick={handleSave} disabled={!name.trim() || saving} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', backgroundColor: name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Gespeichert ✓' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}

// --- Connections Section ---
function ConnectionsSection({ person, people, overlayData = [], connections, onDeleteConnection, onCreateConnection, onUpdateConnectionColor, onAddConnectedPerson }) {
  const [showAddSearch, setShowAddSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [labelModal, setLabelModal] = useState(null) // { targetId }
  const [labelInput, setLabelInput] = useState('')
  const [colorPickerConnId, setColorPickerConnId] = useState(null)
  const [colorDraft, setColorDraft] = useState('#C8BFB0')
  const [colorSaving, setColorSaving] = useState(false)
  const [showNewPersonForm, setShowNewPersonForm] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [addingNewPerson, setAddingNewPerson] = useState(false)

  const myConnections = connections.filter(
    c => c.source_person_id === person.id || c.target_person_id === person.id
  )

  const connectedIds = new Set(myConnections.map(c =>
    c.source_person_id === person.id ? c.target_person_id : c.source_person_id
  ))

  const availablePeople = people.filter(p => p.id !== person.id && !connectedIds.has(p.id))
  const filteredPeople = searchQuery.trim()
    ? availablePeople.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : availablePeople

  function getOtherPerson(conn) {
    const otherId = conn.source_person_id === person.id ? conn.target_person_id : conn.source_person_id
    const main = people.find(p => p.id === otherId)
    if (main) return main
    for (const od of overlayData) {
      const found = od.persons.find(op => op.id === otherId)
      if (found) return found
    }
    return undefined
  }

  function handleAddPerson(targetPerson) {
    setLabelModal({ targetId: targetPerson.id })
    setLabelInput('')
    setShowAddSearch(false)
    setSearchQuery('')
  }

  async function handleAddNewPerson() {
    if (!newPersonName.trim() || addingNewPerson) return
    setAddingNewPerson(true)
    try {
      await onAddConnectedPerson?.(newPersonName.trim(), person.id)
      setShowNewPersonForm(false)
      setNewPersonName('')
    } catch {
      // ignore
    }
    setAddingNewPerson(false)
  }

  async function handleCreateWithLabel(label) {
    if (!labelModal) return
    try {
      await onCreateConnection?.(person.id, labelModal.targetId, label || null)
    } catch (err) {
      // ignore
    }
    setLabelModal(null)
    setLabelInput('')
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <h4 style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Verbindungen
      </h4>

      {myConnections.length === 0 && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', marginBottom: 12 }}>
          Keine Verbindungen.
        </p>
      )}

      {myConnections.map(conn => {
        const other = getOtherPerson(conn)
        if (!other) return null
        const isPickerOpen = colorPickerConnId === conn.id
        const connColor = conn.color || '#C8BFB0'
        return (
          <div key={conn.id} style={{ borderBottom: '1px solid var(--color-warm-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Color dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: connColor, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)' }}>
                  ↔ {other.name}
                </span>
                {conn.label && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {conn.label}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button
                  onClick={() => {
                    if (isPickerOpen) {
                      setColorPickerConnId(null)
                    } else {
                      setColorDraft(connColor)
                      setColorPickerConnId(conn.id)
                    }
                  }}
                  style={{ border: 'none', background: isPickerOpen ? 'var(--color-warm-4)' : 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: isPickerOpen ? 'var(--color-warm-1)' : 'var(--color-text-muted)', flexShrink: 0, display: 'flex' }}
                  title="Verbindungsfarbe ändern"
                >
                  <Palette size={14} />
                </button>
                <button
                  onClick={() => onDeleteConnection?.(conn.id)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#C0392B', flexShrink: 0, display: 'flex' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Inline color picker */}
            {isPickerOpen && (
              <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <ColorSwatches colors={CONN_COLORS} selected={colorDraft} onSelect={hex => setColorDraft(hex)} />
                <button
                  onClick={async () => {
                    setColorSaving(true)
                    await onUpdateConnectionColor?.(conn.id, colorDraft)
                    setColorSaving(false)
                    setColorPickerConnId(null)
                  }}
                  disabled={colorSaving}
                  style={{
                    marginTop: 12, width: '100%',
                    padding: '10px 0', borderRadius: 10,
                    border: 'none', backgroundColor: colorSaving ? 'var(--color-warm-3)' : 'var(--color-warm-1)',
                    color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                    fontWeight: 600, cursor: colorSaving ? 'default' : 'pointer',
                  }}
                >
                  {colorSaving ? 'Wird gespeichert…' : 'Speichern'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add buttons */}
      {!showAddSearch && !showNewPersonForm && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddSearch(true)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 600 }}
          >
            + Verbindung
          </button>
          <button
            onClick={() => { setShowNewPersonForm(true); setNewPersonName('') }}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--color-warm-1)', background: 'var(--color-warm-1)', fontFamily: 'Lora, serif', fontSize: 13, color: 'white', cursor: 'pointer', fontWeight: 600 }}
          >
            + Person hinzufügen
          </button>
        </div>
      )}

      {/* New person inline form */}
      {showNewPersonForm && (
        <div style={{ marginTop: 10, backgroundColor: 'var(--color-warm-4)', borderRadius: 12, padding: 12 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Neue Person wird direkt mit <strong>{person.name}</strong> verbunden.
          </p>
          <input
            type="text"
            value={newPersonName}
            onChange={e => setNewPersonName(e.target.value)}
            placeholder="Name der Person…"
            autoFocus
            style={{ ...inp, marginBottom: 10 }}
            onKeyDown={e => { if (e.key === 'Enter' && newPersonName.trim()) handleAddNewPerson() }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowNewPersonForm(false); setNewPersonName('') }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleAddNewPerson}
              disabled={!newPersonName.trim() || addingNewPerson}
              style={{ flex: 2, padding: '9px 0', borderRadius: 10, border: 'none', backgroundColor: newPersonName.trim() && !addingNewPerson ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {addingNewPerson ? 'Wird hinzugefügt…' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      )}

      {/* Inline search */}
      {showAddSearch && (
        <div style={{ marginTop: 10, backgroundColor: 'var(--color-warm-4)', borderRadius: 12, padding: 12 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Person suchen…"
            autoFocus
            style={{ ...inp, marginBottom: 8 }}
          />
          {filteredPeople.length === 0 ? (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              Keine weiteren Personen.
            </p>
          ) : (
            filteredPeople.map(p => (
              <button
                key={p.id}
                onClick={() => handleAddPerson(p)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-white)', marginBottom: 4, fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', cursor: 'pointer' }}
              >
                {p.name}
              </button>
            ))
          )}
          <button
            onClick={() => { setShowAddSearch(false); setSearchQuery('') }}
            style={{ marginTop: 4, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* Inline label modal */}
      {labelModal && (
        <>
          <div
            onClick={() => { setLabelModal(null); setLabelInput('') }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--color-white)',
            borderRadius: 16, padding: 24, width: 300, maxWidth: '90vw',
            zIndex: 70, boxShadow: '0 8px 32px rgba(58,46,36,0.18)',
          }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
              Verbindung hinzufügen
            </h3>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              {person.name} ↔ {people.find(p => p.id === labelModal.targetId)?.name}
            </p>
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              placeholder="Wie sind sie verbunden? (optional)"
              autoFocus
              style={{ ...inp, marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleCreateWithLabel(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                Überspringen
              </button>
              <button
                onClick={() => handleCreateWithLabel(labelInput.trim())}
                style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Verbinden
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// --- Account Linking Section ---
function AccountLinkingSection({ person, linkedProfile, onLinkAccount, onUnlinkAccount, onUpdateOverlay }) {
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  // Overlay state (initialized from person props)
  const [overlayEnabled, setOverlayEnabled] = useState((person.overlay_map_ids?.length ?? 0) > 0)
  const [jimMaps, setJimMaps] = useState([])
  const [loadingMaps, setLoadingMaps] = useState(false)
  const [selectedMapIds, setSelectedMapIds] = useState(person.overlay_map_ids || [])
  const [showChristian, setShowChristian] = useState(person.overlay_show_christian !== false)
  const [showNonChristian, setShowNonChristian] = useState(person.overlay_show_non_christian !== false)

  async function handleSearch(query) {
    setSearchQuery(query)
    if (!query.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(8)
    setSearchResults(data || [])
    setSearching(false)
  }

  function handleSelectProfile(profile) {
    onLinkAccount?.(person.id, profile.id)
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  async function loadJimMaps() {
    if (!person.linked_user_id) return
    setLoadingMaps(true)
    const { data } = await supabase
      .from('oikos_maps')
      .select('id, name, visibility')
      .eq('user_id', person.linked_user_id)
      .neq('visibility', 'private')
    setJimMaps(data || [])
    setLoadingMaps(false)
  }

  function handleToggleOverlay(val) {
    setOverlayEnabled(val)
    if (!val) {
      setSelectedMapIds([])
      onUpdateOverlay?.(person.id, { overlay_map_ids: [], overlay_show_christian: true, overlay_show_non_christian: true })
    } else {
      loadJimMaps()
    }
  }

  function handleToggleMap(mapId) {
    const next = selectedMapIds.includes(mapId)
      ? selectedMapIds.filter(id => id !== mapId)
      : [...selectedMapIds, mapId]
    setSelectedMapIds(next)
    onUpdateOverlay?.(person.id, { overlay_map_ids: next, overlay_show_christian: showChristian, overlay_show_non_christian: showNonChristian })
  }

  function handleToggleChristian(val) {
    setShowChristian(val)
    if (selectedMapIds.length > 0) {
      onUpdateOverlay?.(person.id, { overlay_map_ids: selectedMapIds, overlay_show_christian: val, overlay_show_non_christian: showNonChristian })
    }
  }

  function handleToggleNonChristian(val) {
    setShowNonChristian(val)
    if (selectedMapIds.length > 0) {
      onUpdateOverlay?.(person.id, { overlay_map_ids: selectedMapIds, overlay_show_christian: showChristian, overlay_show_non_christian: val })
    }
  }

  if (person.linked_user_id && linkedProfile) {
    return (
      <div style={{ marginBottom: 8 }}>
        <h4 style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          OIKOS App Account
        </h4>

        {/* Profile row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
            {linkedProfile.avatar_url
              ? <img src={linkedProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitials(linkedProfile.full_name || linkedProfile.username || '?')
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', fontWeight: 600 }}>
              {linkedProfile.full_name || linkedProfile.username}
            </div>
            {linkedProfile.username && (
              <div style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>@{linkedProfile.username}</div>
            )}
          </div>
          <button
            onClick={() => navigate(`/user/${person.linked_user_id}`)}
            style={{ padding: '7px 12px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Profil →
          </button>
        </div>

        {/* OIKOS einblenden toggle */}
        <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: overlayEnabled ? 10 : 0 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              OIKOS einblenden
            </span>
            <button onClick={() => handleToggleOverlay(!overlayEnabled)} style={toggleTrack(overlayEnabled)}>
              <div style={toggleThumb(overlayEnabled)} />
            </button>
          </div>

          {/* Map picker */}
          {overlayEnabled && (
            <div>
              {loadingMaps && (
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: '0 0 8px' }}>
                  Lade Maps…
                </p>
              )}
              {!loadingMaps && jimMaps.length === 0 && (
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: '0 0 8px' }}>
                  Keine öffentlichen Maps verfügbar.
                </p>
              )}
              {!loadingMaps && jimMaps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: selectedMapIds.length > 0 ? 10 : 0 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px' }}>
                    Maps auswählen
                  </p>
                  {jimMaps.map(m => {
                    const isSelected = selectedMapIds.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleToggleMap(m.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px', borderRadius: 10,
                          border: `1.5px solid ${isSelected ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                          backgroundColor: isSelected ? 'var(--color-warm-1)' : 'var(--color-white)',
                          color: isSelected ? 'white' : 'var(--color-text)',
                          fontFamily: 'Lora, serif', fontSize: 13,
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{isSelected ? '✓' : '○'}</span>
                        <span style={{ fontSize: 14 }}>🗺</span>
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Christ / Nicht Christ filter */}
              {selectedMapIds.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 8px' }}>
                    Anzeigen
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleToggleChristian(!showChristian)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                        padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${showChristian ? 'var(--color-accent)' : 'var(--color-warm-3)'}`,
                        backgroundColor: showChristian ? 'var(--color-accent-light)' : 'var(--color-white)',
                        color: showChristian ? 'var(--color-accent-dark)' : 'var(--color-text-muted)',
                        fontFamily: 'Lora, serif', fontSize: 12, fontWeight: showChristian ? 600 : 400,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{showChristian ? '✓' : '○'}</span>
                      Christ 🌿
                    </button>
                    <button
                      onClick={() => handleToggleNonChristian(!showNonChristian)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                        padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${showNonChristian ? 'var(--color-gold)' : 'var(--color-warm-3)'}`,
                        backgroundColor: showNonChristian ? 'var(--color-gold-light)' : 'var(--color-white)',
                        color: showNonChristian ? '#8A6020' : 'var(--color-text-muted)',
                        fontFamily: 'Lora, serif', fontSize: 12, fontWeight: showNonChristian ? 600 : 400,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{showNonChristian ? '✓' : '○'}</span>
                      Noch nicht 🌱
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unlink */}
        {!confirmUnlink ? (
          <button
            onClick={() => setConfirmUnlink(true)}
            style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: '#C0392B', cursor: 'pointer' }}
          >
            Verknüpfung aufheben
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>Wirklich aufheben?</span>
            <button
              onClick={() => { onUnlinkAccount?.(person.id); setConfirmUnlink(false); setOverlayEnabled(false); setSelectedMapIds([]) }}
              style={{ padding: '5px 10px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, cursor: 'pointer' }}
            >
              Ja
            </button>
            <button
              onClick={() => setConfirmUnlink(false)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, cursor: 'pointer' }}
            >
              Nein
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <h4 style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        OIKOS App Account
      </h4>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        Hat {person.name} einen OIKOS-Account?
      </p>
      {!showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--color-warm-1)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 600 }}
        >
          Account verknüpfen
        </button>
      ) : (
        <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 12, padding: 12 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Benutzername oder Name suchen…"
            autoFocus
            style={{ ...inp, marginBottom: 8 }}
          />
          {searching && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Suche…</p>
          )}
          {!searching && searchResults.map(profile => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-white)', marginBottom: 4, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(profile.full_name || profile.username || '?')
                }
              </div>
              <div>
                <div style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', fontWeight: 600 }}>
                  {profile.full_name || profile.username}
                </div>
                {profile.username && (
                  <div style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    @{profile.username}
                  </div>
                )}
              </div>
            </button>
          ))}
          <button
            onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
            style={{ marginTop: 4, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  )
}

export default function PersonDetailSheet({
  person: initialPerson,
  onClose,
  onDelete,
  onUpdate,
  connections = [],
  people = [],
  overlayData = [],
  onDeleteConnection,
  onCreateConnection,
  onUpdateConnectionColor,
  onAddConnectedPerson,
  linkedProfile,
  onLinkAccount,
  onUnlinkAccount,
  onUpdateOverlay,
}) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [person, setPerson] = useState(initialPerson)
  const [editMode, setEditMode] = useState(false)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [circleColorDraft, setCircleColorDraft] = useState(initialPerson.circle_color || '#E8E4DC')
  const [nameColorDraft, setNameColorDraft] = useState(initialPerson.name_color || '#3A2E24')
  const [colorSaving, setColorSaving] = useState(false)

  const isOwner = user?.id === person.user_id
  const relBadge = BADGE_COLORS[person.relationship_type] || null
  const currentStageNum = person.impact_stage || 1
  const stageName = ['Freisetzung', 'Meine Rolle', 'Empathie', 'Perspektive', 'Wortkraft', 'Kontinuität'][currentStageNum - 1]

  async function handleDelete() {
    if (!window.confirm(`„${person.name}" wirklich löschen?`)) return
    onDelete()
  }

  async function handleSaveEdit(updates) {
    try {
      const { data, error } = await supabase
        .from('oikos_people')
        .update(updates)
        .eq('id', person.id)
        .select().single()
      if (error) throw error
      setPerson(p => ({ ...p, ...data }))
      setEditMode(false)
      showToast('Änderungen gespeichert')
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleSaveColors() {
    setColorSaving(true)
    const updates = { circle_color: circleColorDraft, name_color: nameColorDraft }
    setPerson(p => ({ ...p, ...updates }))
    // Optimistic update to map — DB error silently ignored if columns don't exist yet
    onUpdate?.(updates).catch(() => {})
    showToast('Farben gespeichert')
    setColorSaving(false)
  }

  return (
    <>
      <div onClick={onClose} style={backdrop} />
      <div style={sheet}>
        {/* Handle */}
        <div style={handle} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: editMode ? 16 : 20 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              backgroundColor: person.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700,
            }}>
              {getInitials(person.name)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, lineHeight: 1.2 }}>
                {person.name}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {person.relationship_type && (
                  <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: relBadge?.bg || 'var(--color-warm-4)', color: relBadge?.color || 'var(--color-text-muted)' }}>
                    {person.relationship_type}
                  </span>
                )}
                <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: person.is_christian ? 'var(--color-accent-light)' : 'var(--color-warm-4)', color: person.is_christian ? 'var(--color-accent-dark)' : 'var(--color-text-muted)' }}>
                  {person.is_christian ? 'Christ 🌿' : 'Noch nicht 🌱'}
                </span>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020' }}>
                  Stufe {currentStageNum} – {stageName}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {isOwner && !editMode && (
              <button
                onClick={() => setShowColorPanel(v => !v)}
                style={{ ...iconBtn, backgroundColor: showColorPanel ? 'var(--color-warm-4)' : 'transparent' }}
                title="Farben anpassen"
              >
                <Palette size={16} color={showColorPanel ? 'var(--color-warm-1)' : 'var(--color-text-muted)'} />
              </button>
            )}
            {isOwner && !editMode && (
              <button onClick={() => setEditMode(true)} style={iconBtn} title="Bearbeiten">
                <Pencil size={16} color="var(--color-text-muted)" />
              </button>
            )}
            <button onClick={onClose} style={iconBtn}>
              <X size={18} color="var(--color-text-muted)" />
            </button>
          </div>
        </div>

        {/* Color Panel */}
        {showColorPanel && !editMode && (
          <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            {/* Kreisfarbe */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                Kreisfarbe
              </p>
              <ColorSwatches
                colors={CIRCLE_COLORS}
                selected={circleColorDraft}
                onSelect={hex => {
                  setCircleColorDraft(hex)
                  setPerson(p => ({ ...p, circle_color: hex }))
                }}
              />
            </div>
            {/* Namensfarbe */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                Namensfarbe
              </p>
              <ColorSwatches
                colors={NAME_COLORS}
                selected={nameColorDraft}
                onSelect={hex => {
                  setNameColorDraft(hex)
                  setPerson(p => ({ ...p, name_color: hex }))
                }}
              />
            </div>
            <button
              onClick={handleSaveColors}
              disabled={colorSaving}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10,
                border: 'none', backgroundColor: colorSaving ? 'var(--color-warm-3)' : 'var(--color-warm-1)',
                color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                fontWeight: 600, cursor: colorSaving ? 'default' : 'pointer',
              }}
            >
              {colorSaving ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>
        )}

        {/* Edit Form */}
        {editMode && (
          <EditPersonForm person={person} onSave={handleSaveEdit} onCancel={() => setEditMode(false)} />
        )}

        {/* Beschreibung */}
        {!editMode && person.notes && (
          <p style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 20, padding: '10px 14px', backgroundColor: 'var(--color-warm-4)', borderRadius: 12 }}>
            {person.notes}
          </p>
        )}

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

        {/* Gebetsanliegen */}
        <div className="tour-person-prayer">
          <PrayerRequestsSection personId={person.id} isOwner={isOwner} />
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

        {/* Story-Line */}
        <div className="tour-person-storyline">
          <StoryLineSection personId={person.id} isOwner={isOwner} />
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

        {/* Impact Map */}
        <div className="tour-person-impact">
          <ImpactMapSection
            personId={person.id} isOwner={isOwner} personName={person.name}
            onStageCompleted={(nextStage) => {
              setPerson(p => ({ ...p, impact_stage: nextStage }))
              onUpdate?.({ impact_stage: nextStage })
            }}
          />
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

        {/* Verbindungen */}
        <ConnectionsSection
          person={person}
          people={people}
          overlayData={overlayData}
          connections={connections}
          onDeleteConnection={onDeleteConnection}
          onCreateConnection={onCreateConnection}
          onUpdateConnectionColor={onUpdateConnectionColor}
          onAddConnectedPerson={onAddConnectedPerson}
        />

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

        {/* OIKOS Account Verknüpfung */}
        <div className="tour-person-link">
          <AccountLinkingSection
            person={person}
            linkedProfile={linkedProfile}
            onLinkAccount={(personId, profileId) => {
              onLinkAccount?.(personId, profileId)
              setPerson(p => ({ ...p, linked_user_id: profileId }))
            }}
            onUnlinkAccount={(personId) => {
              onUnlinkAccount?.(personId)
              setPerson(p => ({ ...p, linked_user_id: null, overlay_map_id: null }))
            }}
            onUpdateOverlay={onUpdateOverlay}
          />
        </div>

        {/* Person löschen */}
        {isOwner && (
          <button onClick={handleDelete} style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1px solid #E8C0B8', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: '#C0392B', cursor: 'pointer', marginTop: 8 }}>
            Person aus Map entfernen
          </button>
        )}
      </div>
    </>
  )
}

const backdrop = { position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.3)', backdropFilter: 'blur(3px)', zIndex: 40 }
const sheet = {
  position: 'fixed', bottom: 12,
  left: '50%', transform: 'translateX(-50%)',
  width: 'calc(100% - 24px)', maxWidth: 480,
  backgroundColor: 'rgba(255, 253, 248, 0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  borderRadius: 32,
  zIndex: 50, maxHeight: 'calc(90vh - 24px)', overflowY: 'auto',
  padding: '20px 24px calc(80px + env(safe-area-inset-bottom, 0px))',
  boxShadow: '0 24px 48px -12px rgba(58,46,36,0.25), 0 0 0 1px rgba(232, 213, 183, 0.3)',
  animation: 'sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
}
const handle = { width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block', boxSizing: 'border-box' }
const toggleTrack = (on) => ({ width: 42, height: 24, borderRadius: 12, backgroundColor: on ? 'var(--color-accent)' : 'var(--color-warm-3)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' })
const toggleThumb = (on) => ({ position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' })
