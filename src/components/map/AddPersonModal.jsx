import { useState } from 'react'
import { X, MapPin, ChevronDown, Check } from 'lucide-react'

function initials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function AddPersonModal({ onClose, onAdd, people = [], places = [] }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedCount, setAddedCount] = useState(0)
  const [target, setTarget] = useState({ type: 'me' })
  const [showTargets, setShowTargets] = useState(false)

  const targetLabel =
    target.type === 'me' ? 'Direkt mit mir'
    : target.type === 'place' ? (places.find(p => p.id === target.id)?.name || 'Ort')
    : (people.find(p => p.id === target.id)?.name || 'Person')

  async function handleAdd(keepOpen) {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onAdd(name.trim(), target)
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

        {/* Verbinden mit */}
        <label style={label}>Verbinden mit</label>
        <button type="button" onClick={() => setShowTargets(v => !v)} style={{ ...input, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 8 }}>
          {target.type === 'me'
            ? <span style={{ fontSize: 16 }}>🏠</span>
            : target.type === 'place'
            ? <MapPin size={15} color="var(--color-warm-1)" />
            : <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{initials(targetLabel)}</span>}
          <span style={{ flex: 1, color: 'var(--color-text)', fontWeight: 600 }}>{targetLabel}</span>
          <ChevronDown size={16} color="var(--color-text-muted)" />
        </button>

        {showTargets && (
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1.5px solid var(--color-warm-3)', borderRadius: 12, marginBottom: 8 }}>
            <TargetRow active={target.type === 'me'} onClick={() => { setTarget({ type: 'me' }); setShowTargets(false) }}
              icon={<span style={{ fontSize: 16 }}>🏠</span>} labelText="Direkt mit mir" />
            {places.length > 0 && <SectionLabel text="Orte" />}
            {places.map(pl => (
              <TargetRow key={'pl-' + pl.id} active={target.type === 'place' && target.id === pl.id}
                onClick={() => { setTarget({ type: 'place', id: pl.id }); setShowTargets(false) }}
                icon={<MapPin size={15} color="var(--color-warm-1)" />} labelText={pl.name} />
            ))}
            {people.length > 0 && <SectionLabel text="Personen" />}
            {people.map(pe => (
              <TargetRow key={'pe-' + pe.id} active={target.type === 'person' && target.id === pe.id}
                onClick={() => { setTarget({ type: 'person', id: pe.id }); setShowTargets(false) }}
                icon={<span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{initials(pe.name)}</span>}
                labelText={pe.name} />
            ))}
          </div>
        )}

        <label style={label}>Name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd(true)}
          placeholder="z.B. Anna Müller"
          style={input}
        />

        {error && <p style={errorText}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => handleAdd(true)}
            disabled={!name.trim() || loading}
            style={primaryBtn(!name.trim() || loading)}
          >
            + Weitere Person hinzufügen
          </button>
          <button
            onClick={() => handleAdd(false)}
            disabled={!name.trim() || loading}
            style={secondaryBtn(!name.trim() || loading)}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ text }) {
  return (
    <p style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, padding: '8px 12px 4px', backgroundColor: 'var(--color-bg-secondary)' }}>{text}</p>
  )
}

function TargetRow({ active, onClick, icon, labelText }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', background: active ? 'var(--color-warm-4)' : 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-warm-3)' }}
    >
      {icon}
      <span style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 13.5, color: 'var(--color-text)', fontWeight: active ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelText}</span>
      {active && <Check size={15} color="var(--color-warm-1)" />}
    </button>
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
