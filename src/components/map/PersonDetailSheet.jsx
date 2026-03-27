import { useState } from 'react'
import { X, Pencil, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import PrayerRequestsSection from '../person/PrayerRequestsSection'
import ImpactMapSection from '../person/ImpactMapSection'

const RELATIONSHIP_TYPES = ['Freund/in', 'Kollege/in', 'Familie', 'Nachbar/in', 'Bekannte/r', 'Sonstige/r']

const BADGE_COLORS = {
  'Freund/in':    { bg: '#E8F4E8', color: '#4E7A53' },
  'Kollege/in':   { bg: '#EAF0F8', color: '#3A5F8A' },
  'Familie':      { bg: '#FBF0E8', color: '#A0694A' },
  'Nachbar/in':   { bg: '#F5F0E0', color: '#8A7040' },
  'Bekannte/r':   { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
  'Sonstige/r':   { bg: 'var(--color-warm-4)', color: 'var(--color-text-muted)' },
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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

export default function PersonDetailSheet({ person: initialPerson, onClose, onDelete, onUpdate }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [person, setPerson] = useState(initialPerson)
  const [editMode, setEditMode] = useState(false)

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
              <button onClick={() => setEditMode(true)} style={iconBtn} title="Bearbeiten">
                <Pencil size={16} color="var(--color-text-muted)" />
              </button>
            )}
            <button onClick={onClose} style={iconBtn}>
              <X size={18} color="var(--color-text-muted)" />
            </button>
          </div>
        </div>

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
        <PrayerRequestsSection personId={person.id} isOwner={isOwner} />

        <div style={{ height: 1, backgroundColor: 'var(--color-warm-3)', marginBottom: 20 }} />

        {/* Impact Map */}
        <ImpactMapSection
          personId={person.id} isOwner={isOwner} personName={person.name}
          onStageCompleted={(nextStage) => {
            setPerson(p => ({ ...p, impact_stage: nextStage }))
            onUpdate?.({ impact_stage: nextStage })
          }}
        />

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

const backdrop = { position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }
const sheet = {
  position: 'fixed', bottom: 0,
  left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: 480,
  backgroundColor: 'var(--color-white)',
  borderRadius: '20px 20px 0 0',
  zIndex: 50, maxHeight: '90vh', overflowY: 'auto',
  padding: '16px 20px 40px',
  animation: 'sheetSlideUp 0.3s ease-out',
}
const handle = { width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 18px' }
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }
const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
const toggleTrack = (on) => ({ width: 42, height: 24, borderRadius: 12, backgroundColor: on ? 'var(--color-accent)' : 'var(--color-warm-3)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' })
const toggleThumb = (on) => ({ position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' })
