import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Cleane, ausklappbare Suche: zeigt standardmäßig nur eine Lupe.
 * Beim Antippen wächst ein vollwertiges Suchfeld auf (flex:1). Ist das Feld
 * leer und verliert den Fokus, klappt es wieder zur Lupe zusammen.
 *
 * Im Flex-Container nimmt die Komponente im eingeklappten Zustand 40px,
 * ausgeklappt den restlichen Platz ein.
 */
export default function ExpandableSearch({ value, onChange, placeholder = 'Suchen…' }) {
  const [expanded, setExpanded] = useState(!!value)
  const inputRef = useRef(null)

  // Bei vorbelegtem Wert offen halten
  useEffect(() => { if (value) setExpanded(true) }, [value])

  function open() {
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 20)
  }

  function clearAndClose() {
    onChange('')
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <button onClick={open} aria-label="Suchen" style={iconBtnStyle}>
        <Search size={18} />
      </button>
    )
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, animation: 'searchGrow 0.18s ease-out' }}>
      <Search
        size={15}
        color="var(--color-text-tertiary)"
        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => { if (!value.trim()) setExpanded(false) }}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 36px 9px 34px', borderRadius: 12,
          border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)',
          fontSize: 14, color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box',
        }}
      />
      <button
        onClick={clearAndClose}
        aria-label="Suche schließen"
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          width: 22, height: 22, borderRadius: '50%', border: 'none',
          background: 'var(--color-border)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={12} color="var(--color-text-secondary)" />
      </button>
      <style>{`@keyframes searchGrow { from { opacity: 0; transform: scaleX(0.7); transform-origin: right; } to { opacity: 1; transform: scaleX(1); } }`}</style>
    </div>
  )
}

const iconBtnStyle = {
  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
  border: '1.5px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-secondary)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
