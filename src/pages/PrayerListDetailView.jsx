import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, X, Trash2, Bookmark } from 'lucide-react'
import { usePrayerListDetail } from '../hooks/usePrayerListDetail'
import { usePrayerLists } from '../hooks/usePrayerLists'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

// ─── Ampel-Indikator ──────────────────────────────────────────
function AmpelBar({ ampel }) {
  return (
    <div style={{ width: 4, borderRadius: 4, backgroundColor: ampel.color, flexShrink: 0 }} />
  )
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

// ─── Anliegen-Karte in der Liste ─────────────────────────────
function ListItemCard({ item, onRemove }) {
  const req = item.request
  const author = req?.profiles
  const authorName = author?.full_name || author?.username || 'Unbekannt'

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', backgroundColor: 'var(--color-white)',
      borderRadius: 14, marginBottom: 10, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(58,46,36,0.07)', border: '1px solid var(--color-warm-3)',
    }}>
      <AmpelBar ampel={item.ampel} />
      <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {req?.title || 'Unbekanntes Anliegen'}
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              Von {authorName}
            </p>
            <AmpelLabel ampel={item.ampel} />
          </div>
          <button
            onClick={() => onRemove(item.itemId)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-light)', padding: 4, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
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
          autoFocus
          type="text"
          value={search}
          onChange={e => doSearch(e.target.value)}
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
              onClick={() => handleAdd(req)}
              disabled={adding === req.id}
              style={{ padding: '6px 14px', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-warm-1)', color: 'white', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: 10 }}
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
          style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', backgroundColor: name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', marginBottom: 10 }}>
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

// ─── Hauptseite ───────────────────────────────────────────────
export default function PrayerListDetailView() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { list, items, loading, addItem, removeItem, reload } = usePrayerListDetail(listId)
  const { updateList, deleteList } = usePrayerLists()
  const [showAddItem, setShowAddItem] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const existingIds = new Set(items.map(i => i.request?.id).filter(Boolean))

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
      {/* Header */}
      <div style={{ backgroundColor: list.color + '22', borderBottom: '1px solid var(--color-warm-3)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/prayer')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8, flexShrink: 0 }}
          >
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
          <button
            onClick={() => setShowEdit(true)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6 }}
          >
            <Pencil size={18} />
          </button>
        </div>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '8px 0 0 44px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {items.length} {items.length === 1 ? 'Anliegen' : 'Anliegen'}
        </p>
      </div>

      {/* Inhalt */}
      <div style={{ padding: '16px 16px 0' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🔖</span>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.7 }}>
              Diese Liste ist noch leer.{'\n'}Füge Anliegen hinzu indem du auf das Lesezeichen-Icon tippst.
            </p>
          </div>
        )}

        {items.map(item => (
          <ListItemCard key={item.itemId} item={item} onRemove={handleRemoveItem} />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddItem(true)}
        style={{
          position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 20,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          backgroundColor: 'var(--color-warm-1)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(74,103,65,0.35)',
          zIndex: 20,
        }}
      >
        <Plus size={24} />
      </button>

      {showAddItem && (
        <AddItemSheet
          listId={listId}
          existingIds={existingIds}
          onClose={() => setShowAddItem(false)}
          onAdded={async (reqId, type) => {
            await addItem(reqId, type)
            // Sheet bleibt offen zum weiteren Hinzufügen
          }}
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
    </div>
  )
}

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
