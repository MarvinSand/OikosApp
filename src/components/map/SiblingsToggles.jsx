import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, SlidersHorizontal } from 'lucide-react'

// Anzeige-Menü der Systemkarte „Meine Geschwister in Christus":
// Generationen (Freunde von Freunden), Verbindungen zwischen Freunden, Communities.
// Farben ausschließlich über Theme-Tokens (Hell-/Darkmode).
const DEPTHS = [
  [1, 'Verbundene'],
  [2, '+ Freunde von Freunden'],
  [3, '+ 3. Generation'],
]

function Switch({ on }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 40, height: 24, borderRadius: 999, flexShrink: 0, position: 'relative',
        background: on ? 'var(--color-accent)' : 'var(--color-border)',
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.35)', transition: 'left 0.15s',
        }}
      />
    </span>
  )
}

const rowStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  width: '100%', padding: '11px 14px', border: 'none', background: 'transparent',
  color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 14, textAlign: 'left', cursor: 'pointer',
}
const sectionStyle = {
  padding: '10px 14px 4px', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)',
}

export default function SiblingsToggles({
  depth, onDepth, showEdges, onShowEdges, showCommunities, onShowCommunities, hasCommunities = true,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const depthLabel = DEPTHS.find(([d]) => d === depth)?.[1] ?? DEPTHS[0][1]
  const extras = [!showEdges && 'ohne Linien', hasCommunities && showCommunities && 'Communities'].filter(Boolean)
  const summary = [depthLabel, ...extras].join(' · ')

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, maxWidth: '92vw', padding: '8px 14px',
          borderRadius: 999, border: '1px solid var(--color-border)', background: 'var(--color-paper)',
          color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
        }}
      >
        <SlidersHorizontal size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
        <ChevronDown
          size={16}
          style={{ flexShrink: 0, color: 'var(--color-text-secondary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
            width: 'min(300px, 92vw)', zIndex: 40, overflow: 'hidden', borderRadius: 16,
            border: '1px solid var(--color-border)', background: 'var(--color-paper)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          }}
        >
          <div style={sectionStyle}>Generationen</div>
          {DEPTHS.map(([d, label]) => (
            <button
              key={d}
              role="menuitemradio"
              aria-checked={depth === d}
              onClick={() => { onDepth(d); setOpen(false) }}
              style={{ ...rowStyle, fontWeight: depth === d ? 600 : 400 }}
            >
              <span>{label}</span>
              {depth === d && <Check size={16} style={{ color: 'var(--color-accent)' }} />}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 0' }} />
          <div style={sectionStyle}>Anzeige</div>
          <button role="menuitemcheckbox" aria-checked={showEdges} onClick={() => onShowEdges(!showEdges)} style={rowStyle}>
            <span>Verbindungen untereinander</span>
            <Switch on={showEdges} />
          </button>
          {hasCommunities && (
            <button
              role="menuitemcheckbox"
              aria-checked={showCommunities}
              onClick={() => onShowCommunities(!showCommunities)}
              style={rowStyle}
            >
              <span>Communities</span>
              <Switch on={showCommunities} />
            </button>
          )}
          <div style={{ height: 6 }} />
        </div>
      )}
    </div>
  )
}
