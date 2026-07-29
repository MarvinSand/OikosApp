import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, Maximize2 } from 'lucide-react'
import HouseShape from './HouseShape'
import PlantShape from './PlantShape'

// Dorf-Ansicht von oben: Die Häuser aller Geschwister stehen im Kreis, vor
// jedem Haus liegt das Beet mit den Pflanzen/Samen dieser Person. Zusammen
// ergibt sich ein großer gemeinsamer Garten, in den man rein- und rauszoomen
// kann (Mausrad, Pinch, Ziehen).

const WORLD = 2000
const CENTER = WORLD / 2
const MIN_ZOOM = 0.4
const MAX_ZOOM = 6

const HOUSE_SCALE = 1.5
const HOUSE_W = 120 * HOUSE_SCALE
const PLANTS_PER_ROW = 5
const PLANT_SCALE = 1.3
const PLANT_SPACING_X = 56
const PLANT_SPACING_Y = 52
const BEET_DISTANCE = 200

// Deterministische Pseudo-Zufallszahl, damit Bäume/Steine bei jedem Rendern
// an derselben Stelle liegen.
function rand(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function beetSize(count) {
  const cols = Math.min(PLANTS_PER_ROW, Math.max(count, 1))
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / PLANTS_PER_ROW))
  return {
    cols, rows,
    rx: (cols * PLANT_SPACING_X) / 2 + 34,
    ry: (rows * PLANT_SPACING_Y) / 2 + 28,
  }
}

function computeLayout(plots) {
  const n = Math.max(plots.length, 1)
  const sizes = plots.map(p => beetSize(p.plants.length))
  const maxBeetW = Math.max(...sizes.map(s => s.rx * 2), 200)

  // Radius so wählen, dass weder Häuser noch Beete kollidieren. Die Beete
  // liegen auf dem inneren Kreis (radius - BEET_DISTANCE), dort ist der Umfang
  // kleiner – deshalb wird dieser Kreis für die Rechnung benutzt.
  const radius = Math.max(
    520,
    (n * (maxBeetW + 90)) / (2 * Math.PI) + BEET_DISTANCE,
    (n * (HOUSE_W + 70)) / (2 * Math.PI)
  )

  const laid = plots.map((plot, i) => {
    // Eigenes Haus (Index 0) unten in der Mitte – Blickrichtung des Nutzers.
    const angle = (90 + (i * 360) / n) * (Math.PI / 180)
    const hx = CENTER + radius * Math.cos(angle)
    const hy = CENTER + radius * Math.sin(angle)

    // Richtung "nach innen" (zum Dorfplatz) – dort liegt das Beet.
    const beetX = hx - Math.cos(angle) * BEET_DISTANCE
    const beetY = hy - Math.sin(angle) * BEET_DISTANCE

    const count = plot.plants.length
    const { rows, rx, ry } = sizes[i]

    const plants = plot.plants.map((plant, idx) => {
      const r = Math.floor(idx / PLANTS_PER_ROW)
      const c = idx % PLANTS_PER_ROW
      const colsInRow = Math.min(PLANTS_PER_ROW, count - r * PLANTS_PER_ROW)
      return {
        ...plant,
        x: beetX + (c - (colsInRow - 1) / 2) * PLANT_SPACING_X,
        y: beetY + (r - (rows - 1) / 2) * PLANT_SPACING_Y,
      }
    })

    const rowYs = Array.from({ length: rows }, (_, r) => beetY + (r - (rows - 1) / 2) * PLANT_SPACING_Y)

    return { ...plot, hx, hy, beetX, beetY, beetRx: rx, beetRy: ry, plants, rowYs }
  })

  return { plots: laid, radius }
}

export default function VillageCanvas({ plots, onSelectPlant }) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [size, setSize] = useState({ w: 1, h: 1 })
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  const sizeRef = useRef(size)
  const panRef = useRef(null)
  const pinchRef = useRef(null)
  const movedRef = useRef(false)
  const fittedRef = useRef(false)

  const { plots: layout, radius: villageRadius } = useMemo(() => computeLayout(plots), [plots])

  // Sichtfenster in Weltkoordinaten – Höhe folgt dem Seitenverhältnis des
  // Containers, damit die Karte den Bildschirm immer ausfüllt.
  function viewSizeFor(zoom, s = sizeRef.current) {
    const vw = WORLD / zoom
    return { vw, vh: vw * (s.h / Math.max(s.w, 1)) }
  }

  function clamp(next) {
    const { vw, vh } = viewSizeFor(next.zoom)
    const slack = WORLD * 0.4
    return {
      zoom: next.zoom,
      x: Math.max(-slack, Math.min(WORLD - vw + slack, next.x)),
      y: Math.max(-slack, Math.min(WORLD - vh + slack, next.y)),
    }
  }

  function applyView(next) {
    const clamped = clamp(next)
    viewRef.current = clamped
    setView(clamped)
  }

  // Zoomt um einen Punkt (in Bildschirm-Anteilen 0..1), damit die Stelle unter
  // Cursor/Fingern stehen bleibt.
  function zoomAt(newZoomRaw, fracX, fracY) {
    const v = viewRef.current
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoomRaw))
    const before = viewSizeFor(v.zoom)
    const after = viewSizeFor(newZoom)
    applyView({
      zoom: newZoom,
      x: v.x + fracX * (before.vw - after.vw),
      y: v.y + fracY * (before.vh - after.vh),
    })
  }

  // Zeigt das ganze Dorf zentriert an.
  function fitVillage(s = sizeRef.current) {
    const span = (villageRadius + 200) * 2
    const zoomW = WORLD / span
    const zoomH = (WORLD * (s.h / Math.max(s.w, 1))) / span
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(zoomW, zoomH)))
    const { vw, vh } = viewSizeFor(zoom, s)
    applyView({ zoom, x: CENTER - vw / 2, y: CENTER - vh / 2 })
  }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      const next = { w: r.width, h: r.height }
      sizeRef.current = next
      setSize(next)
      if (!fittedRef.current && r.width > 0) {
        fittedRef.current = true
        fitVillage(next)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [villageRadius])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    function onWheel(e) {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomAt(
        viewRef.current.zoom * factor,
        (e.clientX - rect.left) / rect.width,
        (e.clientY - rect.top) / rect.height
      )
    }

    function onTouchMove(e) {
      const rect = svg.getBoundingClientRect()

      if (e.touches.length === 2) {
        e.preventDefault()
        movedRef.current = true
        const [t0, t1] = [e.touches[0], e.touches[1]]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        const midX = (t0.clientX + t1.clientX) / 2
        const midY = (t0.clientY + t1.clientY) / 2
        if (pinchRef.current) {
          zoomAt(
            pinchRef.current.zoom * (dist / pinchRef.current.dist),
            (midX - rect.left) / rect.width,
            (midY - rect.top) / rect.height
          )
        } else {
          pinchRef.current = { dist, zoom: viewRef.current.zoom }
        }
        return
      }

      if (e.touches.length === 1 && panRef.current) {
        e.preventDefault()
        movePan(e.touches[0].clientX, e.touches[0].clientY, rect)
      }
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  function movePan(clientX, clientY, rect) {
    const p = panRef.current
    if (!p) return
    const { vw, vh } = viewSizeFor(viewRef.current.zoom)
    const dx = clientX - p.startX
    const dy = clientY - p.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true
    applyView({
      zoom: viewRef.current.zoom,
      x: p.originX - (dx / rect.width) * vw,
      y: p.originY - (dy / rect.height) * vh,
    })
  }

  function startPan(clientX, clientY) {
    movedRef.current = false
    panRef.current = {
      startX: clientX, startY: clientY,
      originX: viewRef.current.x, originY: viewRef.current.y,
    }
  }

  function handlePlantClick(plant) {
    if (movedRef.current) return
    onSelectPlant?.(plant)
  }

  const { vw, vh } = viewSizeFor(view.zoom, size)
  const byDepth = [...layout].sort((a, b) => a.hy - b.hy)

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'grab', display: 'block' }}
        onMouseDown={e => startPan(e.clientX, e.clientY)}
        onMouseMove={e => {
          if (!panRef.current) return
          movePan(e.clientX, e.clientY, svgRef.current.getBoundingClientRect())
        }}
        onMouseUp={() => { panRef.current = null }}
        onMouseLeave={() => { panRef.current = null }}
        onTouchStart={e => {
          if (e.touches.length === 1) startPan(e.touches[0].clientX, e.touches[0].clientY)
          else pinchRef.current = null
        }}
        onTouchEnd={() => { panRef.current = null; pinchRef.current = null }}
      >
        <defs>
          <radialGradient id="villageGround" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#9BC776" />
            <stop offset="65%" stopColor="#7CAE5E" />
            <stop offset="100%" stopColor="#5A8746" />
          </radialGradient>
        </defs>

        {/* Wiese */}
        <rect x={-WORLD} y={-WORLD} width={WORLD * 3} height={WORLD * 3} fill="url(#villageGround)" />

        {/* Dorfplatz + Rundweg vor den Häusern */}
        <circle cx={CENTER} cy={CENTER} r={villageRadius - BEET_DISTANCE - 210} fill="#C9B48A" opacity="0.5" />
        <circle
          cx={CENTER} cy={CENTER} r={villageRadius - 70}
          fill="none" stroke="#C2A87E" strokeWidth="40" opacity="0.45"
        />

        {/* Brunnen auf dem Dorfplatz */}
        <g transform={`translate(${CENTER},${CENTER})`}>
          <ellipse cx="0" cy="14" rx="42" ry="13" fill="rgba(0,0,0,0.16)" />
          <ellipse cx="0" cy="0" rx="38" ry="24" fill="#9A8E7C" />
          <ellipse cx="0" cy="-3" rx="27" ry="16" fill="#5C8CA6" />
          <rect x="-30" y="-58" width="8" height="42" fill="#7A5232" />
          <rect x="22" y="-58" width="8" height="42" fill="#7A5232" />
          <path d="M-40,-56 L0,-78 L40,-56 Z" fill="#8C5A45" />
        </g>

        {/* Bäume rund ums Dorf */}
        {Array.from({ length: 30 }).map((_, i) => {
          const a = (i / 30) * Math.PI * 2 + 0.3
          const r = villageRadius + 250 + rand(i + 1) * 210
          const s = 1.1 + rand(i + 40) * 0.6
          return (
            <g key={`tree-${i}`} transform={`translate(${CENTER + r * Math.cos(a)},${CENTER + r * Math.sin(a)}) scale(${s})`}>
              <ellipse cx="0" cy="6" rx="26" ry="8" fill="rgba(0,0,0,0.16)" />
              <rect x="-5" y="-16" width="10" height="22" fill="#7A5232" />
              <polygon points="0,-86 -30,-24 30,-24" fill="#2F6B3C" />
              <polygon points="0,-64 -26,-8 26,-8" fill="#377A45" />
            </g>
          )
        })}

        {/* Steine als Deko */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2 + 1.1
          const r = villageRadius + 140 + rand(i + 70) * 130
          return (
            <g key={`rock-${i}`} transform={`translate(${CENTER + r * Math.cos(a)},${CENTER + r * Math.sin(a)})`}>
              <ellipse cx="0" cy="4" rx="18" ry="6" fill="rgba(0,0,0,0.14)" />
              <ellipse cx="0" cy="0" rx="16" ry="11" fill="#A9A296" />
              <ellipse cx="-4" cy="-3" rx="7" ry="4" fill="#BEB7AA" />
            </g>
          )
        })}

        {/* 1. Durchgang: Beete mit Pflanzen */}
        {layout.map(plot => (
          <g key={`beet-${plot.ownerId}`}>
            <ellipse cx={plot.beetX} cy={plot.beetY} rx={plot.beetRx} ry={plot.beetRy} fill="#8A6240" />
            {/* Ackerfurchen */}
            {plot.rowYs.map((ry, i) => (
              <ellipse
                key={i} cx={plot.beetX} cy={ry + 8}
                rx={plot.beetRx * 0.84} ry="13"
                fill="#7A5334" opacity="0.55"
              />
            ))}
            <ellipse
              cx={plot.beetX} cy={plot.beetY} rx={plot.beetRx} ry={plot.beetRy}
              fill="none" stroke="#6F4E33" strokeWidth="5" opacity="0.65"
            />
            {plot.plants.map(plant => (
              <g
                key={plant.id}
                transform={`translate(${plant.x - 20 * PLANT_SCALE},${plant.y - 47 * PLANT_SCALE}) scale(${PLANT_SCALE})`}
                onClick={() => handlePlantClick(plant)}
                style={{ cursor: 'pointer' }}
              >
                <PlantShape growthStage={plant.growthStage} isHarvested={plant.isHarvested} />
                {/* größere, unsichtbare Trefferfläche für Finger */}
                <rect x="0" y="0" width="40" height="50" fill="transparent" />
              </g>
            ))}
          </g>
        ))}

        {/* 2. Durchgang: Häuser + Namensschilder, von hinten nach vorne */}
        {byDepth.map(plot => (
          <g key={`house-${plot.ownerId}`}>
            <g transform={`translate(${plot.hx},${plot.hy}) scale(${HOUSE_SCALE}) translate(-60,-100)`}>
              <HouseShape isOwn={plot.isOwn} />
            </g>
            <g transform={`translate(${plot.hx},${plot.hy + 46})`}>
              <rect
                x={-Math.max(90, plot.ownerName.length * 12) / 2} y="-20"
                width={Math.max(90, plot.ownerName.length * 12)} height="32" rx="16"
                fill={plot.isOwn ? '#E8B33C' : 'rgba(255,255,255,0.92)'}
                stroke="rgba(0,0,0,0.12)" strokeWidth="2"
              />
              <text
                x="0" y="2" textAnchor="middle"
                style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, fill: '#1C1C1E' }}
              >
                {plot.ownerName}
              </text>
            </g>
          </g>
        ))}
      </svg>

      {/* Zoom-Steuerung */}
      <div style={{ position: 'absolute', right: 12, bottom: 96, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ZoomButton label="Reinzoomen" onClick={() => zoomAt(viewRef.current.zoom * 1.3, 0.5, 0.5)}>
          <Plus size={18} />
        </ZoomButton>
        <ZoomButton label="Rauszoomen" onClick={() => zoomAt(viewRef.current.zoom / 1.3, 0.5, 0.5)}>
          <Minus size={18} />
        </ZoomButton>
        <ZoomButton label="Ganzes Dorf zeigen" onClick={() => fitVillage()}>
          <Maximize2 size={16} />
        </ZoomButton>
      </div>
    </div>
  )
}

function ZoomButton({ children, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 38, height: 38, borderRadius: '50%', border: 'none',
        backgroundColor: 'rgba(255,255,255,0.9)', color: '#1C1C1E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      {children}
    </button>
  )
}
