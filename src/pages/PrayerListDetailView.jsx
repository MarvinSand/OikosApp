import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, X, Trash2, MoreVertical, Check } from 'lucide-react'
import { usePrayerListDetail } from '../hooks/usePrayerListDetail'
import { usePrayerLists } from '../hooks/usePrayerLists'
import { usePrayerUpdates } from '../hooks/usePrayerUpdates'
import { useAnsweredPrayers } from '../hooks/useAnsweredPrayers'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'
import Confetti from '../components/ui/Confetti'

// ─── Ampel ───────────────────────────────────────────────────
function AmpelBar({ ampel }) {
  return <div style={{ width: 4, borderRadius: 4, backgroundColor: ampel.color, flexShrink: 0 }} />
}

function AmpelLabel({ ampel }) {
  if (ampel.status === 'green') return null
  return (
    <span style={{
      fontFamily: 'Lora, serif', fontSize: 10, fontWeight: ampel.status === 'red' ? 700 : 400,
      color: ampel.color, display: 'block', marginTop: 2,
    }}>
      {ampel.label}
    </span>
  )
}

// ─── ListItemCard ─────────────────────────────────────────────
function ListItemCard({ item, onRemove, onMarkAnswered, onAddUpdate }) {
  const [showMenu, setShowMenu] = useState(false)
  const req = item.request
  const author = req?.profiles
  const authorName = author?.full_name || author?.username || 'Unbekannt'

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', backgroundColor: 'var(--color-white)',
      borderRadius: 14, marginBottom: 10, overflow: 'visible',
      boxShadow: '0 2px 8px rgba(58,46,36,0.07)', border: '1px solid var(--color-warm-3)',
      position: 'relative',
    }}>
      <AmpelBar ampel={item.ampel} />
      <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
              color: req?.is_answered ? 'var(--color-text-muted)' : 'var(--color-text)',
              margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: req?.is_answered ? 'line-through' : 'none',
            }}>
              {req?.title || 'Unbekanntes Anliegen'}
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              Von {authorName}
            </p>
            <AmpelLabel ampel={item.ampel} />
          </div>

          {/* Three-dot menu */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-light)', padding: 4, borderRadius: 6 }}
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  backgroundColor: 'var(--color-white)', borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(58,46,36,0.15)',
                  border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 200,
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { setShowMenu(false); onAddUpdate(item) }}
                    style={menuItem}
                  >
                    📝 Update hinzufügen
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onMarkAnswered(item) }}
                    style={{ ...menuItem, color: '#27AE60' }}
                  >
                    <Check size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Als erhört markieren
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onRemove(item.itemId) }}
                    style={{ ...menuItem, color: '#C0392B', borderTop: '1px solid var(--color-warm-3)' }}
                  >
                    <Trash2 size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Aus Liste entfernen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Anliegen hinzufügen Sheet ────────────────────────────────
function AddItemSheet({ listId, existingIds, onClose, onAdded }) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(null)
  const { showToast } = useToast()

  async function doSearch(q) {
    setSearch(q)
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const [{ data: personal }, { data: oikos }] = await Promise.all([
      supabase.from('personal_prayer_requests')
        .select('id, title, owner_id, profiles!owner_id(full_name, username)')
        .ilike('title', `%${q}%`)
        .eq('is_answered', false)
        .limit(20),
      supabase.from('prayer_requests')
        .select('id, title, owner_id, profiles!owner_id(full_name, username)')
        .ilike('title', `%${q}%`)
        .eq('is_answered', false)
        .limit(20),
    ])
    const personalItems = (personal || []).map(r => ({ ...r, _type: 'personal' }))
    const oikosItems = (oikos || []).map(r => ({ ...r, _type: 'oikos' }))
    setResults([...personalItems, ...oikosItems].filter(r => !existingIds.has(r.id)))
    setLoading(false)
  }

  async function handleAdd(req) {
    setAdding(req.id)
    try {
      await onAdded(req.id, req._type)
      showToast('Zur Liste hinzugefügt ✓')
    } catch {
      showToast('Fehler', 'error')
    } finally {
      setAdding(null)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', maxHeight: '80vh', overflowY: 'auto', animation: 'sheetSlideUp 0.3s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Anliegen hinzufügen</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>
        <input
          autoFocus type="text" value={search} onChange={e => doSearch(e.target.value)}
          placeholder="Anliegen suchen..."
          style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block', marginBottom: 12 }}
        />
        {loading && <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>Suche…</p>}
        {!loading && search && results.length === 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', fontStyle: 'italic' }}>Keine Ergebnisse</p>
        )}
        {results.map(req => (
          <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-warm-3)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                {req.profiles?.full_name || req.profiles?.username || 'Unbekannt'} · {req._type === 'personal' ? 'Persönlich' : 'Oikos'}
              </p>
            </div>
            <button
              onClick={() => handleAdd(req)} disabled={adding === req.id}
              style={{ padding: '6px 14px', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: 10 }}
            >
              {adding === req.id ? '…' : '+ Hinzufügen'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Edit-Liste Sheet ─────────────────────────────────────────
const LIST_COLORS = ['#7A9E7E', '#D4A853', '#C0392B', '#2980B9', '#8E44AD', '#2C3E50', '#ECF0F1', '#E67E22']
const LIST_EMOJIS = ['🙏', '👨‍👩‍👧', '🌍', '🏥', '💼', '🛡️', '💔', '➕', '🌅', '⭐', '🕊️', '🔥', '💡', '🌿', '🎯', '❤️', '🌸', '📖', '🌟', '🤲']

function EditListSheet({ list, onClose, onSave, onDelete }) {
  const [name, setName] = useState(list.name)
  const [icon, setIcon] = useState(list.icon)
  const [color, setColor] = useState(list.color)
  const [description, setDescription] = useState(list.description || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { showToast } = useToast()

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), icon, color, description: description.trim() || null })
      showToast('Liste aktualisiert ✓')
      onClose()
    } catch { showToast('Fehler', 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', maxHeight: '90vh', overflowY: 'auto', animation: 'sheetSlideUp 0.3s ease-out' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Liste bearbeiten</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <label style={lbl}>Emoji</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {LIST_EMOJIS.map(e => (
            <button key={e} onClick={() => setIcon(e)}
              style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${icon === e ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`, background: icon === e ? 'var(--color-warm-4)' : 'none', fontSize: 20, cursor: 'pointer' }}>
              {e}
            </button>
          ))}
        </div>

        <label style={lbl}>Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inp} />
        <label style={{ ...lbl, marginTop: 14 }}>Beschreibung</label>
        <input value={description} onChange={e => setDescription(e.target.value)} style={inp} placeholder="Optional" />
        <label style={{ ...lbl, marginTop: 14 }}>Farbe</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {LIST_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: c, border: color === c ? '3px solid var(--color-text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
          ))}
        </div>

        <button onClick={handleSave} disabled={!name.trim() || saving}
          style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', backgroundColor: name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', marginBottom: 10 }}>
          {saving ? 'Speichere…' : 'Änderungen speichern'}
        </button>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8C0B8', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: '#C0392B', cursor: 'pointer' }}>
            Liste löschen
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={onDelete} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ja, löschen</button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Answered Sheet ───────────────────────────────────────────
function AnsweredSheet({ item, onClose, onConfirm }) {
  const [note, setNote] = useState('')
  const [share, setShare] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm(item, { note, shareAsTestimony: share })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>🎉 Gebet erhört!</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
          „{item.request?.title}"
        </p>

        <label style={lbl}>Wie wurde es erhört? (optional, aber ermutigend!)</label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <textarea
            autoFocus value={note} onChange={e => setNote(e.target.value.slice(0, 500))}
            placeholder="Was hat Gott getan? ..."
            rows={3}
            style={{ ...inp, resize: 'none' }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>
            {note.length}/500
          </span>
        </div>

        <label style={lbl}>Als Zeugnis teilen?</label>
        <button
          onClick={() => setShare(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: `1.5px solid ${share ? '#27AE60' : 'var(--color-warm-3)'}`,
            backgroundColor: share ? '#DFF5E8' : 'var(--color-bg)',
            cursor: 'pointer', marginBottom: 24, textAlign: 'left',
          }}
        >
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            backgroundColor: share ? '#27AE60' : 'var(--color-warm-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {share && <Check size={14} color="white" />}
          </div>
          <div>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: share ? '#1E8449' : 'var(--color-text)', margin: 0 }}>
              Mit der Community teilen
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Erscheint im Feed als Lobpreis
            </p>
          </div>
        </button>

        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            backgroundColor: '#27AE60', color: 'white',
            fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
            cursor: saving ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Check size={16} />
          {saving ? 'Speichere…' : 'Erhört markieren'}
        </button>
      </div>
    </>
  )
}

// ─── Update Sheet ─────────────────────────────────────────────
const UPDATE_TYPES = [
  { key: 'update', emoji: '📝', label: 'Update' },
  { key: 'answered', emoji: '🙌', label: 'Erhört!' },
  { key: 'new_situation', emoji: '🔄', label: 'Neue Wendung' },
  { key: 'encouragement', emoji: '💪', label: 'Ermutigung' },
  { key: 'praise', emoji: '🎉', label: 'Lobpreis' },
]

function UpdateSheet({ item, onClose, onSave }) {
  const [content, setContent] = useState('')
  const [updateType, setUpdateType] = useState('update')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const { updates, loading: updatesLoading, addUpdate } = usePrayerUpdates(item.request?.id, item.type)

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await addUpdate({ content, updateType, isPublic })
      await onSave(updateType)
      onClose()
    } catch {
      // handled in hook
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))', animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Update hinzufügen</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
          „{item.request?.title}"
        </p>

        {/* Update type selector */}
        <label style={lbl}>Art des Updates</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {UPDATE_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setUpdateType(t.key)}
              style={{
                padding: '8px 12px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${updateType === t.key ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: updateType === t.key ? 'var(--color-warm-4)' : 'transparent',
                fontFamily: 'Lora, serif', fontSize: 13,
                color: updateType === t.key ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
                fontWeight: updateType === t.key ? 600 : 400,
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <label style={lbl}>Was ist passiert?</label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <textarea
            autoFocus value={content} onChange={e => setContent(e.target.value.slice(0, 500))}
            placeholder="Teile, was Gott tut…"
            rows={3}
            style={{ ...inp, resize: 'none' }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)' }}>
            {content.length}/500
          </span>
        </div>

        <label style={lbl}>Sichtbarkeit</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            [true, '🌐', 'Öffentlich'],
            [false, '🔒', 'Nur für mich'],
          ].map(([val, icon, label]) => (
            <button
              key={String(val)} onClick={() => setIsPublic(val)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${isPublic === val ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: isPublic === val ? 'var(--color-warm-4)' : 'var(--color-bg)',
                fontFamily: 'Lora, serif', fontSize: 12,
                color: isPublic === val ? 'var(--color-warm-1)' : 'var(--color-text-muted)',
                fontWeight: isPublic === val ? 600 : 400,
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Previous updates */}
        {!updatesLoading && updates.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 0', borderTop: '1px solid var(--color-warm-3)' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
              Bisheriger Verlauf ({updates.length})
            </p>
            {updates.slice(0, 3).map(u => {
              const typeInfo = UPDATE_TYPES.find(t => t.key === u.update_type) || UPDATE_TYPES[0]
              return (
                <div key={u.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-warm-3)', display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{typeInfo.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', margin: '0 0 2px', lineHeight: 1.45 }}>
                      {u.content}
                    </p>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', margin: 0 }}>
                      {new Date(u.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!content.trim() || saving}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
            backgroundColor: content.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
            color: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600,
            cursor: content.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Speichere…' : 'Update speichern'}
        </button>
      </div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function PrayerListDetailView() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { list, items, loading, addItem, removeItem, reload } = usePrayerListDetail(listId)
  const { updateList, deleteList } = usePrayerLists()
  const { markAnswered } = useAnsweredPrayers()

  const [showAddItem, setShowAddItem] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showGuidedMode, setShowGuidedMode] = useState(false)
  const [answeredItem, setAnsweredItem] = useState(null)
  const [updateItem, setUpdateItem] = useState(null)
  const [confetti, setConfetti] = useState(false)

  const existingIds = new Set(items.map(i => i.request?.id).filter(Boolean))
  const activeItems = items.filter(i => !i.request?.is_answered)

  async function handleRemoveItem(itemId) {
    await removeItem(itemId)
    showToast('Aus Liste entfernt')
  }

  async function handleSaveList(updates) {
    await updateList(listId, updates)
    await reload()
  }

  async function handleDeleteList() {
    await deleteList(listId)
    showToast('Liste gelöscht')
    navigate('/prayer')
  }

  async function handleMarkAnswered(item, { note, shareAsTestimony }) {
    try {
      await markAnswered(item.request.id, item.type, { note, shareAsTestimony })
      await removeItem(item.itemId)
      setAnsweredItem(null)
      setConfetti(true)
      setTimeout(() => setConfetti(false), 3200)
      showToast('Gott ist treu! 🙏')
    } catch {
      showToast('Fehler', 'error')
    }
  }

  async function handleUpdateSaved(updateType) {
    if (updateType === 'answered') {
      showToast('Als erhört markiert 🎉')
    } else {
      showToast('Update gespeichert ✓')
    }
    await reload()
  }

  if (loading) {
    return (
      <div className="bg-bg min-h-full pb-24">
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-warm-3)', backgroundColor: 'var(--color-white)' }}>
          <div style={{ width: 80, height: 20, borderRadius: 8, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ padding: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 14, backgroundColor: 'var(--color-white)', marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="bg-bg min-h-full flex items-center justify-center">
        <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Liste nicht gefunden.</p>
      </div>
    )
  }

  return (
    <div className="bg-bg min-h-full pb-24 md:max-w-2xl md:mx-auto">
      <Confetti show={confetti} />

      {/* Header */}
      <div style={{ backgroundColor: list.color + '22', borderBottom: '1px solid var(--color-warm-3)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/prayer')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8, flexShrink: 0 }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{list.icon}</span>
              <h1 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {list.name}
              </h1>
            </div>
            {list.description && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                {list.description}
              </p>
            )}
          </div>
          <button onClick={() => setShowEdit(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6 }}>
            <Pencil size={18} />
          </button>
        </div>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '8px 0 0 44px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {items.length} {items.length === 1 ? 'Anliegen' : 'Anliegen'}
        </p>
      </div>

      {/* Gebetszeit starten Banner */}
      {activeItems.length > 0 && (
        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={() => setShowGuidedMode(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #4A6741 0%, #395132 100%)',
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(74,103,65,0.25)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>
                🕊 Gebetszeit starten
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                {activeItems.length} Anliegen · ca. {activeItems.length} Minuten
              </p>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 16, flexShrink: 0,
            }}>
              ▶
            </div>
          </button>
        </div>
      )}

      {/* Inhalt */}
      <div style={{ padding: '16px 16px 0' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🔖</span>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.7 }}>
              Diese Liste ist noch leer.{'\n'}Füge Anliegen hinzu indem du auf das +-Symbol tippst.
            </p>
          </div>
        )}

        {items.map(item => (
          <ListItemCard
            key={item.itemId}
            item={item}
            onRemove={handleRemoveItem}
            onMarkAnswered={setAnsweredItem}
            onAddUpdate={setUpdateItem}
          />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddItem(true)}
        style={{
          position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 20,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(74,103,65,0.35)', zIndex: 20,
        }}
      >
        <Plus size={24} />
      </button>

      {/* Sheets */}
      {showAddItem && (
        <AddItemSheet
          listId={listId} existingIds={existingIds}
          onClose={() => setShowAddItem(false)}
          onAdded={async (reqId, type) => { await addItem(reqId, type) }}
        />
      )}
      {showEdit && (
        <EditListSheet
          list={list}
          onClose={() => setShowEdit(false)}
          onSave={handleSaveList}
          onDelete={handleDeleteList}
        />
      )}
      {answeredItem && (
        <AnsweredSheet
          item={answeredItem}
          onClose={() => setAnsweredItem(null)}
          onConfirm={handleMarkAnswered}
        />
      )}
      {updateItem && (
        <UpdateSheet
          item={updateItem}
          onClose={() => setUpdateItem(null)}
          onSave={handleUpdateSaved}
        />
      )}

      {/* Guided Prayer Mode – full screen overlay */}
      {showGuidedMode && (
        <GuidedPrayerMode
          items={activeItems}
          listId={listId}
          listName={list.name}
          onClose={() => {
            setShowGuidedMode(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
const menuItem = { display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.1s' }
