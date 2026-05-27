import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { usePrayerLists } from '../../hooks/usePrayerLists'
import { useToast } from '../../context/ToastContext'

const LIST_COLORS = ['#7A9E7E', '#D4A853', '#C0392B', '#2980B9', '#8E44AD', '#2C3E50', '#E0E0E0', '#E67E22']
const LIST_EMOJIS = ['🙏', '👨‍👩‍👧', '🌍', '🏥', '💼', '🛡️', '💔', '➕', '🌅', '⭐', '🕊️', '🔥', '💡', '🌿', '🎯', '❤️', '🌸', '📖', '🌟', '🤲']

// ─── CreateListSheet ──────────────────────────────────────────
function CreateListSheet({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🙏')
  const [color, setColor] = useState('#7A9E7E')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onCreate({ name: name.trim(), icon, color, description: description.trim() || null })
      showToast('Liste erstellt ✓')
      onClose()
    } catch {
      showToast('Fehler beim Erstellen', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Neue Gebetsliste</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <label style={lbl}>Emoji wählen</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {LIST_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              style={{
                width: 40, height: 40, borderRadius: 10, fontSize: 20, cursor: 'pointer',
                border: `2px solid ${icon === e ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                background: icon === e ? 'var(--color-warm-4)' : 'none',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        <label style={lbl}>Name der Liste *</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="z.B. Familie, Mission, Täglich …"
          style={inp}
        />

        <label style={{ ...lbl, marginTop: 14 }}>Beschreibung (optional)</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Kurze Beschreibung…"
          style={inp}
        />

        <label style={{ ...lbl, marginTop: 14 }}>Farbe</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {LIST_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 32, height: 32, borderRadius: '50%', backgroundColor: c,
                border: color === c ? '3px solid var(--color-text)' : '2px solid transparent',
                cursor: 'pointer', flexShrink: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            backgroundColor: name.trim() ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
            color: 'white', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Erstelle…' : 'Liste erstellen'}
        </button>
      </div>
    </>
  )
}

// ─── ListTile ─────────────────────────────────────────────────
function ListTile({ list, onClick }) {
  const textColor = isLightColor(list.color) ? '#2C2416' : '#ffffff'

  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, width: 130, borderRadius: 16, padding: '14px 12px',
        backgroundColor: list.color, border: 'none', cursor: 'pointer',
        textAlign: 'left', boxShadow: '0 3px 10px rgba(58,46,36,0.15)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <div style={{ fontSize: 24, marginBottom: 6, lineHeight: 1 }}>{list.icon}</div>
      <p style={{
        fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700,
        color: textColor, margin: '0 0 4px', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {list.name}
      </p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: textColor + 'CC', margin: 0 }}>
        {list.itemCount} {list.itemCount === 1 ? 'Anliegen' : 'Anliegen'}
      </p>
    </button>
  )
}

function isLightColor(hex) {
  if (!hex) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

// ─── Skeleton für Listen ──────────────────────────────────────
function ListSkeleton() {
  return (
    <div style={{ flexShrink: 0, width: 130, height: 96, borderRadius: 16, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
  )
}

// ─── PrayerListsSection ───────────────────────────────────────
export default function PrayerListsSection() {
  const navigate = useNavigate()
  const { lists, loading, createList } = usePrayerLists()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div style={{ margin: '12px 0 0', borderBottom: '1px solid var(--color-warm-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 10px' }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          Meine Listen
        </p>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-warm-1)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, padding: '4px 0' }}
        >
          <Plus size={14} /> Neue Liste
        </button>
      </div>

      {/* Horizontal-Scroll-Reihe */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 16px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {loading && [1, 2, 3].map(i => <ListSkeleton key={i} />)}

        {!loading && lists.length === 0 && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              flexShrink: 0, width: 130, height: 96, borderRadius: 16,
              border: '2px dashed var(--color-warm-3)', background: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Plus size={20} color="var(--color-warm-1)" />
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-warm-1)', fontWeight: 600 }}>
              Liste erstellen
            </span>
          </button>
        )}

        {!loading && lists.map(list => (
          <ListTile
            key={list.id}
            list={list}
            onClick={() => navigate(`/prayer/list/${list.id}`)}
          />
        ))}
      </div>

      {showCreate && (
        <CreateListSheet
          onClose={() => setShowCreate(false)}
          onCreate={createList}
        />
      )}
    </div>
  )
}

const lbl = { display: 'block', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', backgroundColor: 'var(--color-bg)', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', display: 'block' }
