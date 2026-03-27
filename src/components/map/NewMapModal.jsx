import { useState } from 'react'
import { X } from 'lucide-react'

const VISIBILITY_OPTIONS = [
  { value: 'private',          icon: '🔒', label: 'Nur ich' },
  { value: 'all_siblings',     icon: '👥', label: 'Alle meine Geschwister' },
  { value: 'specific_include', icon: '✅', label: 'Nur bestimmte Geschwister' },
  { value: 'specific_exclude', icon: '🚫', label: 'Alle außer...' },
  { value: 'community',        icon: '🏘', label: 'Nur eine Community' },
]

export default function NewMapModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onCreate({ name: name.trim(), visibility })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={title}>Neue Oikos Map</h3>
          <button onClick={onClose} style={closeBtn}><X size={18} /></button>
        </div>

        <label style={label}>Name der Map</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="z.B. Meine Familie"
          style={input}
        />

        <label style={{ ...label, marginTop: 18 }}>Wer kann diese Map sehen?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {VISIBILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVisibility(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-warm-3)'}`,
                backgroundColor: visibility === opt.value ? 'var(--color-warm-4)' : 'var(--color-bg)',
                fontFamily: 'Lora, serif', fontSize: 14, textAlign: 'left',
                color: visibility === opt.value ? 'var(--color-warm-1)' : 'var(--color-text)',
                fontWeight: visibility === opt.value ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {error && <p style={errorText}>{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          style={{ ...primaryBtn(!name.trim() || loading), marginTop: 20 }}
        >
          {loading ? 'Erstelle…' : 'Map erstellen'}
        </button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 50,
  backgroundColor: 'rgba(58,46,36,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 16px',
}
const modal = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 20, padding: '24px 20px',
  width: '100%', maxWidth: 400,
  boxShadow: '0 8px 32px rgba(58,46,36,0.15)',
  maxHeight: '90vh', overflowY: 'auto',
}
const title = { fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: 'var(--color-text)' }
const closeBtn = { border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }
const label = { display: 'block', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }
const input = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1.5px solid var(--color-warm-3)',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)',
  display: 'block',
}
const errorText = { color: '#C0392B', fontSize: 13, fontStyle: 'italic', marginTop: 8, fontFamily: 'Lora, serif' }
const primaryBtn = (disabled) => ({
  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: disabled ? 'var(--color-warm-3)' : 'var(--color-warm-1)',
  color: 'var(--color-white)',
  fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
})
