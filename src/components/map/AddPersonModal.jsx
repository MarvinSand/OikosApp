import { useState } from 'react'
import { X } from 'lucide-react'

export default function AddPersonModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedCount, setAddedCount] = useState(0)

  async function handleAdd(keepOpen) {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onAdd(name.trim())
      if (keepOpen) {
        setName('')
        setAddedCount(c => c + 1)
      } else {
        onClose()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={row}>
          <h3 style={title}>Person hinzufügen</h3>
          <button onClick={onClose} style={closeBtn}><X size={18} /></button>
        </div>

        {addedCount > 0 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-accent)', fontStyle: 'italic', marginBottom: 12 }}>
            ✓ {addedCount} {addedCount === 1 ? 'Person' : 'Personen'} hinzugefügt
          </p>
        )}

        <label style={label}>Name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd(false)}
          placeholder="z.B. Anna Müller"
          style={input}
        />

        {error && <p style={errorText}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => handleAdd(false)}
            disabled={!name.trim() || loading}
            style={primaryBtn(!name.trim() || loading)}
          >
            Fertig
          </button>
          <button
            onClick={() => handleAdd(true)}
            disabled={!name.trim() || loading}
            style={secondaryBtn(!name.trim() || loading)}
          >
            + Weitere Person hinzufügen
          </button>
        </div>
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
}
const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }
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
const errorText = { color: '#C0392B', fontSize: 13, fontStyle: 'italic', marginTop: 8 }
const primaryBtn = (disabled) => ({
  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: disabled ? 'var(--color-warm-3)' : 'var(--color-warm-1)',
  color: 'var(--color-white)',
  fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600,
})
const secondaryBtn = (disabled) => ({
  width: '100%', padding: '12px 0', borderRadius: 14,
  border: '1.5px solid var(--color-warm-3)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: 'transparent',
  color: disabled ? 'var(--color-text-light)' : 'var(--color-warm-1)',
  fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 500,
})
