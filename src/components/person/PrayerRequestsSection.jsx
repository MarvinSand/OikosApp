import { useState } from 'react'
import { Plus, Lock, Globe, Check, Trash2 } from 'lucide-react'
import { usePrayerRequests } from '../../hooks/usePrayerRequests'
import { usePrayerLogs } from '../../hooks/usePrayerLogs'
import { useToast } from '../../context/ToastContext'

function PrayerRequestCard({ req, isOwner, onToggleAnswered, onTogglePublic, onDelete, onPrayed }) {
  const { hasPrayedToday, countToday, logPrayer } = usePrayerLogs(req.id)
  const { showToast } = useToast()

  async function handlePray() {
    try {
      await logPrayer()
      showToast('🙏 Gebet wurde notiert')
      onPrayed?.(req.id)
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  return (
    <div style={{
      backgroundColor: req.is_answered ? 'rgba(122,158,126,0.08)' : 'var(--color-warm-4)',
      borderRadius: 14, padding: '12px 14px',
      border: `1.5px solid ${req.is_answered ? 'var(--color-accent-light)' : 'var(--color-warm-3)'}`,
    }}>
      {/* Titel + Aktionen */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
          color: req.is_answered ? 'var(--color-text-muted)' : 'var(--color-text)',
          textDecoration: req.is_answered ? 'line-through' : 'none',
          flex: 1,
        }}>
          {req.title}
        </span>
        {isOwner && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={handlePray} disabled={hasPrayedToday} title="Ich habe gebetet" style={iconBtn}>
              <span style={{ fontSize: 13, opacity: hasPrayedToday ? 0.4 : 1 }}>🙏</span>
            </button>
            <button onClick={() => onTogglePublic(req.id)} title={req.is_public ? 'Öffentlich' : 'Privat'} style={iconBtn}>
              {req.is_public
                ? <Globe size={13} color="var(--color-accent)" />
                : <Lock size={13} color="var(--color-text-light)" />}
            </button>
            <button onClick={() => onToggleAnswered(req.id)} title="Als erhört markieren" style={iconBtn}>
              <Check size={13} color={req.is_answered ? 'var(--color-accent)' : 'var(--color-text-light)'} />
            </button>
            <button onClick={() => onDelete(req.id)} title="Löschen" style={iconBtn}>
              <Trash2 size={13} color="#C0392B" />
            </button>
          </div>
        )}
      </div>

      {/* Beschreibung */}
      {req.description && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>
          {req.description}
        </p>
      )}

      {/* Gebet-Bereich (nur für Nicht-Owner) */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!isOwner ? (
          <button
            onClick={handlePray}
            disabled={hasPrayedToday}
            style={{
              padding: '6px 12px', borderRadius: 8, cursor: hasPrayedToday ? 'default' : 'pointer',
              backgroundColor: hasPrayedToday ? 'transparent' : 'var(--color-warm-1)',
              color: hasPrayedToday ? 'var(--color-text-muted)' : 'white',
              fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500,
              border: hasPrayedToday ? '1px solid var(--color-warm-3)' : 'none',
            }}
          >
            {hasPrayedToday ? '🙏 Gebetet' : 'Ich habe gebetet'}
          </button>
        ) : <div />}
        {countToday > 0 && (
          <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-gold)', fontStyle: 'italic' }}>
            {countToday} {countToday === 1 ? 'Person' : 'Personen'} haben heute gebetet
          </span>
        )}
      </div>
    </div>
  )
}

function AddRequestForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), description: description.trim() || null, is_public: isPublic })
    setSaving(false)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 14, padding: '14px', border: '1.5px solid var(--color-warm-1)' }}>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Titel des Anliegens *"
        style={inputStyle}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Beschreibung (optional)"
        rows={2}
        style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <button
          onClick={() => setIsPublic(!isPublic)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}
        >
          {isPublic ? <Globe size={13} color="var(--color-accent)" /> : <Lock size={13} />}
          {isPublic ? 'Öffentlich' : 'Privat'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ ...smallBtn, backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-warm-3)' }}>
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{ ...smallBtn, backgroundColor: title.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', border: 'none' }}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PrayerRequestsSection({ personId, isOwner }) {
  const { requests, loading, addRequest, deleteRequest, toggleAnswered, togglePublic } = usePrayerRequests(personId)
  const { showToast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [prayedIds, setPrayedIds] = useState(new Set())

  async function handleAdd(data) {
    try {
      await addRequest(data)
      setShowAddForm(false)
      showToast('Anliegen hinzugefügt')
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Anliegen wirklich löschen?')) return
    await deleteRequest(id)
    showToast('Anliegen gelöscht', 'info')
  }

  const activeRaw = requests.filter(r => !r.is_answered)
  const active = [
    ...activeRaw.filter(r => !prayedIds.has(r.id)),
    ...activeRaw.filter(r => prayedIds.has(r.id)),
  ]
  const answered = requests.filter(r => r.is_answered)

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={sectionHeader}>
        <h4 style={sectionTitle}>Gebetsanliegen</h4>
        {isOwner && !showAddForm && (
          <button onClick={() => setShowAddForm(true)} style={addBtn}>
            <Plus size={13} /> Hinzufügen
          </button>
        )}
      </div>

      {loading ? (
        <div style={skeleton} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {active.map(req => (
            <PrayerRequestCard key={req.id} req={req} isOwner={isOwner}
              onToggleAnswered={toggleAnswered} onTogglePublic={togglePublic} onDelete={handleDelete}
              onPrayed={(id) => setPrayedIds(prev => new Set([...prev, id]))} />
          ))}

          {showAddForm && (
            <AddRequestForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
          )}

          {answered.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-light)', fontStyle: 'italic', marginBottom: 8 }}>
                Erhört ✓
              </p>
              {answered.map(req => (
                <PrayerRequestCard key={req.id} req={req} isOwner={isOwner}
                  onToggleAnswered={toggleAnswered} onTogglePublic={togglePublic} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {requests.length === 0 && !showAddForm && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              {isOwner ? 'Füge dein erstes Gebetsanliegen hinzu.' : 'Noch keine öffentlichen Anliegen.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)',
  fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', display: 'block',
}
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 3, borderRadius: 6 }
const smallBtn = { padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500 }
const sectionHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const sectionTitle = { fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }
const addBtn = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
  borderRadius: 8, border: '1px solid var(--color-warm-3)', background: 'none',
  fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', cursor: 'pointer',
}
const skeleton = { height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }
