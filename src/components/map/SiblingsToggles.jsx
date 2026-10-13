import { useState, useEffect } from 'react'
import { ChevronDown, Check, SlidersHorizontal, X } from 'lucide-react'

// Ansicht der Systemkarte „Meine Geschwister in Christus".
// Unten angedockt, damit das Menü nicht mitten auf den Personen liegt.
// Wahl bleibt auf dem Gerät (localStorage).

const STORAGE_KEY = 'oikos_siblings_view_v1'
const HINT_KEY = 'oikos_siblings_account_hint_v1'

const DEPTHS = [
  { depth: 1, title: 'Nur meine Freunde', text: 'Menschen, mit denen du verbunden bist.' },
  { depth: 2, title: 'Auch deren Freunde', text: 'Hängen als Kreise an deinen Freunden. Die Linie zeigt, über wen.' },
  { depth: 3, title: 'Noch eine Ebene weiter', text: 'Freunde von deren Freunden.' },
]

export function loadSiblingsView() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!v || typeof v !== 'object') return { depth: 1, showEdges: true, showCommunities: false }
    return {
      depth: [1, 2, 3].includes(v.depth) ? v.depth : 1,
      showEdges: v.showEdges !== false,
      showCommunities: v.showCommunities === true,
    }
  } catch {
    return { depth: 1, showEdges: true, showCommunities: false }
  }
}

export function saveSiblingsView(view) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(view)) } catch { /* privater Modus */ }
}

export function siblingsMapTitle(map, fallback = 'Meine Oikos Map') {
  if (!map) return fallback
  if (map.kind === 'siblings') return 'Meine Geschwister in Christus'
  return map.name || fallback
}

function nLabel(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

export function siblingsViewSummary({
  depth, showEdges, showCommunities, friendCount = 0, furtherCount = 0, communityCount = null, loadingMore = false,
}) {
  if (!friendCount) return 'Noch keine Freunde mit Account'
  let who = nLabel(friendCount, 'Freund', 'Freunde')
  if (depth > 1) {
    if (loadingMore) who = `${who} · weitere laden`
    else if (furtherCount > 0) who = `${who}, ${nLabel(furtherCount, 'weiterer', 'weitere')}`
  }
  const parts = [who]
  if (!showEdges) parts.push('keine Linien untereinander')
  if (showCommunities) {
    if (communityCount == null) parts.push('Gemeinden')
    else if (communityCount === 0) parts.push('keine Gemeinden')
    else parts.push(nLabel(communityCount, 'Gemeinde', 'Gemeinden'))
  }
  return parts.join(' · ')
}

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

const rowBtn = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px',
  border: 'none', background: 'transparent', color: 'var(--color-text)', textAlign: 'left', cursor: 'pointer',
}

export default function SiblingsToggles({
  depth, onDepth, showEdges, onShowEdges, showCommunities, onShowCommunities,
  friendCount = 0, furtherCount = 0, communityCount = null, loadingMore = false,
  liftAboveNav = true,
}) {
  const [open, setOpen] = useState(false)
  const [showHint, setShowHint] = useState(() => {
    try { return !localStorage.getItem(HINT_KEY) } catch { return false }
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const summary = siblingsViewSummary({
    depth, showEdges, showCommunities, friendCount, furtherCount, communityCount, loadingMore,
  })

  function dismissHint() {
    setShowHint(false)
    try { localStorage.setItem(HINT_KEY, '1') } catch { /* ignore */ }
  }

  const bottom = liftAboveNav
    ? 'calc(var(--bottom-nav-h, 64px) + 12px)'
    : '12px'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 35, pointerEvents: 'none' }}>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', pointerEvents: 'auto' }}
        />
      )}

      <div
        style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom,
          width: 'min(420px, calc(100% - 24px))',
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8,
          pointerEvents: 'auto',
        }}
      >
        {showHint && !open && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px', borderRadius: 14,
              background: 'var(--color-paper)', border: '1px solid var(--color-border)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
              fontFamily: 'Lora, serif', fontSize: 13, lineHeight: 1.4, color: 'var(--color-text)',
            }}
          >
            <span style={{ flex: 1 }}>
              Diese Karte zeigt nur Geschwister mit eigenem Account. Menschen ohne Account legst du auf einer eigenen Karte an.
            </span>
            <button
              onClick={dismissHint}
              aria-label="Hinweis schließen"
              style={{ border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {open ? (
          <div
            role="dialog"
            aria-label="Ansicht"
            style={{
              borderRadius: 18, overflow: 'hidden',
              border: '1px solid var(--color-border)', background: 'var(--color-paper)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              maxHeight: 'min(70vh, 520px)', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 4px' }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Ansicht</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Ansicht schließen"
                style={{ border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4 }}
              >
                <ChevronDown size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', paddingBottom: 8 }}>
              {showHint && (
                <p style={{ margin: '4px 14px 8px', fontFamily: 'Lora, serif', fontSize: 12.5, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>
                  Nur Geschwister mit eigenem Account. Ohne Account gehören sie auf eine eigene Karte.
                  <button
                    onClick={dismissHint}
                    style={{ marginLeft: 6, border: 'none', background: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}
                  >
                    Verstanden
                  </button>
                </p>
              )}

              <div style={sectionStyle}>Wen zeigen?</div>
              {DEPTHS.map((opt) => {
                const selected = depth === opt.depth
                return (
                  <button
                    key={opt.depth}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onDepth(opt.depth)}
                    style={{ ...rowBtn, background: selected ? 'var(--color-warm-4, rgba(255,255,255,0.04))' : 'transparent' }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 14.5, fontWeight: selected ? 600 : 500 }}>{opt.title}</span>
                      <span style={{ display: 'block', marginTop: 2, fontFamily: 'Lora, serif', fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-secondary)' }}>{opt.text}</span>
                    </span>
                    {selected && <Check size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
                  </button>
                )
              })}

              <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 14px' }} />
              <div style={sectionStyle}>Was einzeichnen?</div>

              <button role="switch" aria-checked={showEdges} onClick={() => onShowEdges(!showEdges)} style={rowBtn}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 14.5, fontWeight: 500 }}>Wer sich untereinander kennt</span>
                  <span style={{ display: 'block', marginTop: 2, fontFamily: 'Lora, serif', fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-secondary)' }}>
                    Linien zwischen Freunden. Linien zur Mitte und zu Gemeinden bleiben.
                  </span>
                </span>
                <Switch on={showEdges} />
              </button>

              <button role="switch" aria-checked={showCommunities} onClick={() => onShowCommunities(!showCommunities)} style={rowBtn}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'Lora, serif', fontSize: 14.5, fontWeight: 500 }}>Gemeinden</span>
                  <span style={{ display: 'block', marginTop: 2, fontFamily: 'Lora, serif', fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-secondary)' }}>
                    Grüne Karten für Communities, in denen ihr gemeinsam seid.
                    {showCommunities && communityCount === 0 ? ' Du bist in keiner.' : ''}
                  </span>
                </span>
                <Switch on={showCommunities} />
              </button>

              <p style={{ margin: '8px 14px 4px', fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                {summary}
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={false}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', borderRadius: 999,
              border: '1px solid var(--color-border)', background: 'var(--color-paper)',
              color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
            }}
          >
            <SlidersHorizontal size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{summary}</span>
            <ChevronDown size={16} style={{ flexShrink: 0, color: 'var(--color-text-secondary)', transform: 'rotate(180deg)' }} />
          </button>
        )}
      </div>
    </div>
  )
}

const sectionStyle = {
  padding: '8px 14px 2px', fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)',
}
