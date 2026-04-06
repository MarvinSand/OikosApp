import { useState, useRef } from 'react'

// ─── HSV ↔ Hex helpers ───────────────────────────────────────
function hsvToHex(h, s, v) {
  s /= 100; v /= 100
  const f = n => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function hexToHsv(hex) {
  const m = (hex || '#000').replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return [0, 0, 0]
  let [r, g, b] = m.map(x => parseInt(x, 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: h = ((b - r) / d + 2) * 60; break
      case b: h = ((r - g) / d + 4) * 60; break
    }
  }
  return [Math.round(h), Math.round(max === 0 ? 0 : d / max * 100), Math.round(max * 100)]
}

// ─── ColorPicker ─────────────────────────────────────────────
export default function ColorPicker({ value = '#4A7C59', onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const [h, s, v] = hsv

  const svDragging = useRef(false)
  const hueDragging = useRef(false)

  function update(newH, newS, newV) {
    const next = [
      Math.round(Math.max(0, Math.min(360, newH))),
      Math.round(Math.max(0, Math.min(100, newS))),
      Math.round(Math.max(0, Math.min(100, newV))),
    ]
    setHsv(next)
    onChange?.(hsvToHex(...next))
  }

  function onSVPointer(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    update(h, x * 100, (1 - y) * 100)
  }

  function onHuePointer(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    update(x * 360, s, v)
  }

  const pureHue = hsvToHex(h, 100, 100)
  const hex = hsvToHex(h, s, v)

  return (
    <div style={{ userSelect: 'none', touchAction: 'none', width: '100%' }}>

      {/* SV gradient area */}
      <div
        style={{
          width: '100%', height: 160, borderRadius: 10, position: 'relative',
          background: `linear-gradient(to bottom, transparent, #000),
                       linear-gradient(to right, #fff, ${pureHue})`,
          cursor: 'crosshair', marginBottom: 10, flexShrink: 0,
        }}
        onPointerDown={e => {
          svDragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          onSVPointer(e)
        }}
        onPointerMove={e => svDragging.current && onSVPointer(e)}
        onPointerUp={() => { svDragging.current = false }}
      >
        {/* Crosshair indicator */}
        <div style={{
          position: 'absolute',
          left: `${s}%`, top: `${100 - v}%`,
          transform: 'translate(-50%, -50%)',
          width: 16, height: 16, borderRadius: '50%',
          border: '2.5px solid white',
          boxShadow: '0 0 0 1.5px rgba(0,0,0,0.35)',
          backgroundColor: hex,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Hue rainbow slider */}
      <div
        style={{
          width: '100%', height: 18, borderRadius: 9, position: 'relative',
          background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
          cursor: 'pointer', marginBottom: 12,
        }}
        onPointerDown={e => {
          hueDragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          onHuePointer(e)
        }}
        onPointerMove={e => hueDragging.current && onHuePointer(e)}
        onPointerUp={() => { hueDragging.current = false }}
      >
        {/* Hue thumb */}
        <div style={{
          position: 'absolute',
          left: `${h / 360 * 100}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20, height: 20, borderRadius: '50%',
          border: '2.5px solid white',
          boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3)',
          backgroundColor: pureHue,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Preview + hex label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          backgroundColor: hex,
          border: '1.5px solid rgba(0,0,0,0.12)',
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
          {hex.toUpperCase()}
        </span>
      </div>
    </div>
  )
}
