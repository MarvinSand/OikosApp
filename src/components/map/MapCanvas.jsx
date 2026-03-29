import { useState, useRef, useEffect } from 'react'
import { Link, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Debounce helper
function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { fn(...args); timer = null }, delay)
  }
}

export default function MapCanvas({
  userName,
  people,
  connections = [],
  overlayData = [],
  onPersonClick,
  onPersonMoved,
  onCreateConnection,
  onOverlayPersonClick,
}) {
  const navigate = useNavigate()
  const n = people.length
  const ringRadius = n === 0 ? 150 : Math.max(150, n * 18)
  const pad = 70
  const vbSize = ringRadius * 2 + pad * 2
  const cx = vbSize / 2
  const cy = vbSize / 2
  const userR = 48
  const personR = 38

  // Local positions state (initialized/updated from people prop)
  const [positions, setPositions] = useState({})
  // Dragging state
  const [dragging, setDragging] = useState(null)
  // Connection mode
  const [connectionMode, setConnectionMode] = useState(false)
  const [firstSelected, setFirstSelected] = useState(null)
  // Label modal for new connection
  const [labelModal, setLabelModal] = useState(null) // { sourceId, targetId } or null
  const [labelInput, setLabelInput] = useState('')
  // Inline add connection in sheet (not used here but connection mode handled here)

  // Zoom + pan
  const [zoom, setZoom] = useState(1)
  const [viewOrigin, setViewOrigin] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(null) // { startClientX, startClientY, startOriginX, startOriginY }
  const pinchRef = useRef(null) // { dist, svgMidX, svgMidY, zoom, originX, originY }

  const svgRef = useRef(null)
  const debouncedMoveRef = useRef(null)

  // Sync positions from people prop for newly added people
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }
      people.forEach((p, i) => {
        if (!(p.id in next)) {
          // Initialize from DB or compute default ring position
          if (p.pos_x != null && p.pos_y != null) {
            next[p.id] = { x: p.pos_x, y: p.pos_y }
          } else {
            next[p.id] = getDefaultPos(i, people.length, cx, cy, ringRadius)
          }
        }
      })
      // Remove positions for deleted people
      Object.keys(next).forEach(id => {
        if (!people.find(p => p.id === id)) delete next[id]
      })
      return next
    })
  }, [people, cx, cy, ringRadius])

  // Setup debounced save
  useEffect(() => {
    debouncedMoveRef.current = debounce((personId, x, y) => {
      onPersonMoved?.(personId, x, y)
    }, 800)
  }, [onPersonMoved])

  function getDefaultPos(index, total, centerX, centerY, radius) {
    const angle = (index * 2 * Math.PI / Math.max(total, 1)) - Math.PI / 2
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  }

  function getPos(person, index) {
    if (positions[person.id]) return positions[person.id]
    return getDefaultPos(index, people.length, cx, cy, ringRadius)
  }

  function shortName(name) {
    if (!name) return '?'
    const first = name.trim().split(' ')[0]
    return first.length > 9 ? first.slice(0, 8) + '…' : first
  }

  // Convert client coordinates to SVG coordinates (accounts for zoom/pan)
  function clientToSVG(clientX, clientY) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const viewW = vbSize / zoom
    const viewH = vbSize / zoom
    return {
      x: viewOrigin.x + (clientX - rect.left) / rect.width * viewW,
      y: viewOrigin.y + (clientY - rect.top) / rect.height * viewH,
    }
  }

  function clampOrigin(ox, oy, z) {
    const viewW = vbSize / z
    const viewH = vbSize / z
    const minX = -(vbSize * 0.3)
    const minY = -(vbSize * 0.3)
    const maxX = vbSize - viewW + vbSize * 0.3
    const maxY = vbSize - viewH + vbSize * 0.3
    return {
      x: Math.max(minX, Math.min(maxX, ox)),
      y: Math.max(minY, Math.min(maxY, oy)),
    }
  }

  function handleWheel(e) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newZoom = Math.min(5, Math.max(0.4, zoom * factor))
    const rect = svgRef.current.getBoundingClientRect()
    const viewW = vbSize / zoom
    const viewH = vbSize / zoom
    const cursorSVGX = viewOrigin.x + (e.clientX - rect.left) / rect.width * viewW
    const cursorSVGY = viewOrigin.y + (e.clientY - rect.top) / rect.height * viewH
    const newViewW = vbSize / newZoom
    const newViewH = vbSize / newZoom
    const fracX = (e.clientX - rect.left) / rect.width
    const fracY = (e.clientY - rect.top) / rect.height
    const raw = {
      x: cursorSVGX - fracX * newViewW,
      y: cursorSVGY - fracY * newViewH,
    }
    const clamped = clampOrigin(raw.x, raw.y, newZoom)
    setZoom(newZoom)
    setViewOrigin(clamped)
  }

  // --- Drag handlers ---
  function handlePersonMouseDown(e, person) {
    if (connectionMode) return
    e.stopPropagation()
    e.preventDefault()
    const pos = positions[person.id] || getDefaultPos(people.findIndex(p => p.id === person.id), people.length, cx, cy, ringRadius)
    const svgPos = clientToSVG(e.clientX, e.clientY)
    setDragging({
      id: person.id,
      startSVGX: svgPos.x,
      startSVGY: svgPos.y,
      startPersonX: pos.x,
      startPersonY: pos.y,
      startTime: Date.now(),
      moved: false,
    })
  }

  function handlePersonTouchStart(e, person) {
    if (connectionMode) return
    e.stopPropagation()
    const touch = e.touches[0]
    const pos = positions[person.id] || getDefaultPos(people.findIndex(p => p.id === person.id), people.length, cx, cy, ringRadius)
    const svgPos = clientToSVG(touch.clientX, touch.clientY)
    setDragging({
      id: person.id,
      startSVGX: svgPos.x,
      startSVGY: svgPos.y,
      startPersonX: pos.x,
      startPersonY: pos.y,
      startTime: Date.now(),
      moved: false,
    })
  }

  function handleMouseMove(e) {
    if (dragging) {
      const svgPos = clientToSVG(e.clientX, e.clientY)
      const dx = svgPos.x - dragging.startSVGX
      const dy = svgPos.y - dragging.startSVGY
      const dist = Math.sqrt(dx * dx + dy * dy)
      setDragging(prev => ({ ...prev, moved: dist > 5 }))
      setPositions(prev => ({ ...prev, [dragging.id]: {
        x: dragging.startPersonX + dx,
        y: dragging.startPersonY + dy,
      }}))
    } else if (panning) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const viewW = vbSize / zoom
      const viewH = vbSize / zoom
      const dxClient = e.clientX - panning.startClientX
      const dyClient = e.clientY - panning.startClientY
      const raw = {
        x: panning.startOriginX - dxClient / rect.width * viewW,
        y: panning.startOriginY - dyClient / rect.height * viewH,
      }
      setViewOrigin(clampOrigin(raw.x, raw.y, zoom))
    }
  }

  function handleTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 2) {
      // Pinch zoom
      const t0 = e.touches[0]
      const t1 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
      const midClientX = (t0.clientX + t1.clientX) / 2
      const midClientY = (t0.clientY + t1.clientY) / 2

      if (pinchRef.current) {
        const { dist: prevDist, zoom: prevZoom, originX, originY } = pinchRef.current
        const newZoom = Math.min(5, Math.max(0.4, prevZoom * (dist / prevDist)))
        const rect = svgRef.current?.getBoundingClientRect()
        if (rect) {
          const prevViewW = vbSize / prevZoom
          const prevViewH = vbSize / prevZoom
          const svgMidX = originX + (midClientX - rect.left) / rect.width * prevViewW
          const svgMidY = originY + (midClientY - rect.top) / rect.height * prevViewH
          const newViewW = vbSize / newZoom
          const newViewH = vbSize / newZoom
          const raw = {
            x: svgMidX - (midClientX - rect.left) / rect.width * newViewW,
            y: svgMidY - (midClientY - rect.top) / rect.height * newViewH,
          }
          const clamped = clampOrigin(raw.x, raw.y, newZoom)
          setZoom(newZoom)
          setViewOrigin(clamped)
          pinchRef.current = { dist, zoom: newZoom, originX: clamped.x, originY: clamped.y }
        }
      } else {
        pinchRef.current = { dist, zoom, originX: viewOrigin.x, originY: viewOrigin.y }
      }
      return
    }

    if (!dragging) return
    const touch = e.touches[0]
    const svgPos = clientToSVG(touch.clientX, touch.clientY)
    const dx = svgPos.x - dragging.startSVGX
    const dy = svgPos.y - dragging.startSVGY
    const dist = Math.sqrt(dx * dx + dy * dy)
    setDragging(prev => ({ ...prev, moved: dist > 5 }))
    setPositions(prev => ({ ...prev, [dragging.id]: {
      x: dragging.startPersonX + dx,
      y: dragging.startPersonY + dy,
    }}))
  }

  function handleMouseUp() {
    if (dragging) {
      const elapsed = Date.now() - dragging.startTime
      const wasClick = !dragging.moved && elapsed < 200
      if (wasClick) {
        const person = people.find(p => p.id === dragging.id)
        if (person) onPersonClick?.(person)
      } else {
        const pos = positions[dragging.id]
        if (pos) debouncedMoveRef.current?.(dragging.id, pos.x, pos.y)
      }
      setDragging(null)
    }
    if (panning) setPanning(null)
  }

  function handleTouchEnd() {
    pinchRef.current = null
    if (!dragging) return
    const elapsed = Date.now() - dragging.startTime
    const wasClick = !dragging.moved && elapsed < 200
    if (wasClick) {
      const person = people.find(p => p.id === dragging.id)
      if (person) handlePersonTap(person)
    } else {
      const pos = positions[dragging.id]
      if (pos) debouncedMoveRef.current?.(dragging.id, pos.x, pos.y)
    }
    setDragging(null)
  }

  function handleBackgroundMouseDown(e) {
    if (connectionMode || dragging) return
    setPanning({
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOriginX: viewOrigin.x,
      startOriginY: viewOrigin.y,
    })
  }

  function changeZoom(factor) {
    const newZoom = Math.min(5, Math.max(0.4, zoom * factor))
    const newViewW = vbSize / newZoom
    const newViewH = vbSize / newZoom
    // Zoom toward center
    const raw = {
      x: viewOrigin.x + (vbSize / zoom - newViewW) / 2,
      y: viewOrigin.y + (vbSize / zoom - newViewH) / 2,
    }
    setZoom(newZoom)
    setViewOrigin(clampOrigin(raw.x, raw.y, newZoom))
  }

  // --- Connection mode tap ---
  function handlePersonTap(person) {
    if (!connectionMode) {
      onPersonClick?.(person)
      return
    }
    if (firstSelected === null) {
      setFirstSelected(person.id)
    } else if (firstSelected === person.id) {
      setFirstSelected(null)
    } else {
      // Open label modal
      setLabelModal({ sourceId: firstSelected, targetId: person.id })
      setLabelInput('')
      setFirstSelected(null)
    }
  }

  function handlePersonClick(e, person) {
    if (dragging) return
    handlePersonTap(person)
  }

  async function handleCreateConnectionWithLabel(label) {
    if (!labelModal) return
    try {
      await onCreateConnection?.(labelModal.sourceId, labelModal.targetId, label || null)
    } catch (err) {
      // ignore
    }
    setLabelModal(null)
    setLabelInput('')
  }

  function toggleConnectionMode() {
    setConnectionMode(prev => !prev)
    setFirstSelected(null)
  }

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleBackgroundMouseDown}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Zoom buttons */}
      <div style={{ position: 'absolute', bottom: 106, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        {[['＋', 1.3], ['－', 1 / 1.3]].map(([label, factor]) => (
          <button
            key={label}
            onMouseDown={e => e.stopPropagation()}
            onClick={() => changeZoom(factor)}
            style={{
              width: 38, height: 38, borderRadius: 12,
              border: '1.5px solid var(--color-warm-3)',
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-text)',
              fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(58,46,36,0.10)',
              lineHeight: 1,
            }}
          >{label}</button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'none',
      }}>
        <button
          onClick={toggleConnectionMode}
          style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20,
            border: connectionMode ? 'none' : '1.5px solid var(--color-warm-3)',
            backgroundColor: connectionMode ? 'var(--color-warm-1)' : 'var(--color-white)',
            color: connectionMode ? 'white' : 'var(--color-text-muted)',
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(58,46,36,0.10)',
          }}
        >
          <Link size={14} />
          Verbindungsmodus
        </button>
        {connectionMode && (
          <span style={{
            fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)',
            fontStyle: 'italic', backgroundColor: 'rgba(255,253,248,0.9)',
            padding: '3px 10px', borderRadius: 12,
            pointerEvents: 'none',
          }}>
            {firstSelected ? 'Wähle eine zweite Person' : 'Tippe zwei Personen an um sie zu verbinden'}
          </span>
        )}
      </div>

      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`${viewOrigin.x} ${viewOrigin.y} ${vbSize / zoom} ${vbSize / zoom}`}
        style={{ width: '100%', height: '100%', cursor: dragging?.moved ? 'grabbing' : panning ? 'grabbing' : 'grab' }}
        xmlns="http://www.w3.org/2000/svg"
        onWheel={handleWheel}
      >
        {/* Transparent background to catch pan gestures */}
        <rect
          x={viewOrigin.x} y={viewOrigin.y}
          width={vbSize / zoom} height={vbSize / zoom}
          fill="transparent"
          onMouseDown={e => { e.stopPropagation(); handleBackgroundMouseDown(e) }}
        />

        {/* Gestrichelter Ring um Zentrum */}
        <circle
          cx={cx} cy={cy}
          r={userR + 20}
          fill="none"
          stroke="var(--color-warm-3)"
          strokeWidth={1.2}
          strokeDasharray="5 5"
        />

        {/* Center-to-person Verbindungslinien */}
        {people.map((p, i) => {
          const pos = getPos(p, i)
          return (
            <line
              key={p.id + '_line'}
              x1={cx} y1={cy}
              x2={pos.x} y2={pos.y}
              stroke="var(--color-warm-3)"
              strokeWidth={1.5}
            />
          )
        })}

        {/* Overlay persons (from linked accounts' public maps) */}
        {overlayData.flatMap(od => {
          const parentPerson = people.find(p => p.id === od.parentPersonId)
          if (!parentPerson) return []
          const parentIdx = people.indexOf(parentPerson)
          const parentPos = getPos(parentPerson, parentIdx)

          const visible = od.persons.filter(op =>
            (op.is_christian && od.showChristian) ||
            (!op.is_christian && od.showNonChristian)
          )

          return visible.map((op, idx) => {
            const angle = (idx / Math.max(visible.length, 1)) * 2 * Math.PI - Math.PI / 2
            const r = 68
            const ox = parentPos.x + r * Math.cos(angle)
            const oy = parentPos.y + r * Math.sin(angle)
            const overlayR = 20
            const fillColor = op.is_christian ? '#D4EDDA' : 'var(--color-warm-4)'
            const strokeColor = op.is_christian ? '#4E7A53' : '#C9A84C'

            return (
              <g
                key={`overlay_${od.parentPersonId}_${op.id}`}
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onOverlayPersonClick?.(op) }}
              >
                {/* Line from parent to overlay person */}
                <line
                  x1={parentPos.x} y1={parentPos.y}
                  x2={ox} y2={oy}
                  stroke="#C9A84C"
                  strokeWidth={1}
                  strokeDasharray="4,3"
                  opacity={0.5}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Overlay person circle */}
                <circle
                  cx={ox} cy={oy} r={overlayR}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray="3,2"
                  opacity={0.9}
                />
                {/* Name */}
                <text
                  x={ox} y={oy}
                  textAnchor="middle" dy="0.35em"
                  fill="var(--color-text-muted)"
                  fontSize={8}
                  fontFamily="Lora, Georgia, serif"
                  fontStyle="italic"
                  style={{ pointerEvents: 'none' }}
                >
                  {shortName(op.name)}
                </text>
              </g>
            )
          })
        })}

        {/* Inter-person connections */}
        {connections.map(conn => {
          const srcPerson = people.find(p => p.id === conn.source_person_id)
          const tgtPerson = people.find(p => p.id === conn.target_person_id)
          if (!srcPerson || !tgtPerson) return null
          const srcIdx = people.indexOf(srcPerson)
          const tgtIdx = people.indexOf(tgtPerson)
          const srcPos = getPos(srcPerson, srcIdx)
          const tgtPos = getPos(tgtPerson, tgtIdx)
          const midX = (srcPos.x + tgtPos.x) / 2
          const midY = (srcPos.y + tgtPos.y) / 2
          return (
            <g key={conn.id}>
              <line
                x1={srcPos.x} y1={srcPos.y}
                x2={tgtPos.x} y2={tgtPos.y}
                stroke="var(--color-warm-3)"
                strokeWidth={1.5}
                strokeDasharray="5,4"
              />
              {conn.label && (
                <text
                  x={midX} y={midY}
                  textAnchor="middle"
                  dy="-4"
                  fill="var(--color-text-muted)"
                  fontSize={9}
                  fontFamily="Lora, Georgia, serif"
                  fontStyle="italic"
                >
                  {conn.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Zentrum – User */}
        <circle cx={cx} cy={cy} r={userR} fill="var(--color-warm-1)" />
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dy="0.35em"
          fill="#FFFDF8"
          fontSize={13}
          fontFamily="Lora, Georgia, serif"
          fontWeight="600"
        >
          {shortName(userName)}
        </text>

        {/* Personen */}
        {people.map((p, i) => {
          const pos = getPos(p, i)
          const isDraggingThis = dragging?.id === p.id && dragging?.moved
          const isFirstSelected = firstSelected === p.id
          const stageColor = p.impact_stage >= 5
            ? 'var(--color-accent)'
            : p.impact_stage >= 3
              ? 'var(--color-gold)'
              : 'var(--color-warm-1)'

          return (
            <g
              key={p.id}
              style={{ cursor: isDraggingThis ? 'grabbing' : (connectionMode ? 'pointer' : 'grab') }}
              onMouseDown={e => handlePersonMouseDown(e, p)}
              onTouchStart={e => handlePersonTouchStart(e, p)}
              onClick={e => { e.stopPropagation(); handlePersonClick(e, p) }}
            >
              {/* Drop shadow when dragging */}
              {isDraggingThis && (
                <circle
                  cx={pos.x} cy={pos.y}
                  r={personR * 1.15}
                  fill="rgba(58,46,36,0.10)"
                />
              )}
              <circle
                cx={pos.x} cy={pos.y}
                r={isDraggingThis ? personR * 1.1 : personR}
                fill="var(--color-warm-4)"
                stroke={isFirstSelected ? 'var(--color-gold)' : 'var(--color-warm-3)'}
                strokeWidth={isFirstSelected ? 4 : 1.5}
                strokeDasharray={isFirstSelected ? '6,3' : 'none'}
                style={{
                  transition: 'r 0.15s ease',
                  filter: isDraggingThis ? 'drop-shadow(0 4px 8px rgba(58,46,36,0.20))' : 'none',
                }}
              />
              {/* Stufen-Bogen */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isDraggingThis ? personR * 1.1 : personR}
                fill="none"
                stroke={stageColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${(p.impact_stage / 6) * 2 * Math.PI * (isDraggingThis ? personR * 1.1 : personR)} 1000`}
                transform={`rotate(-90 ${pos.x} ${pos.y})`}
                opacity={0.8}
              />
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle"
                dy="0.35em"
                fill="var(--color-text)"
                fontSize={10}
                fontFamily="Lora, Georgia, serif"
              >
                {shortName(p.name)}
              </text>

              {/* Linked account indicator */}
              {p.linked_user_id && (
                <g
                  onClick={e => { e.stopPropagation(); navigate(`/user/${p.linked_user_id}`) }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={pos.x + personR * 0.707}
                    cy={pos.y + personR * 0.707}
                    r={7}
                    fill="white"
                    stroke="var(--color-warm-3)"
                    strokeWidth={1}
                  />
                  <foreignObject
                    x={pos.x + personR * 0.707 - 4}
                    y={pos.y + personR * 0.707 - 4}
                    width={8}
                    height={8}
                    style={{ pointerEvents: 'none' }}
                  >
                    <User size={8} color="var(--color-text)" />
                  </foreignObject>
                </g>
              )}
            </g>
          )
        })}

        {/* Leerer Zustand */}
        {n === 0 && (
          <text
            x={cx} y={cy + userR + 44}
            textAnchor="middle"
            fill="var(--color-text-light)"
            fontSize={12}
            fontFamily="Lora, Georgia, serif"
            fontStyle="italic"
          >
            Tippe „+ Person" um zu beginnen
          </text>
        )}
      </svg>

      {/* Label Modal for new connection */}
      {labelModal && (
        <>
          <div
            onClick={() => { setLabelModal(null); setLabelInput('') }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--color-white)',
            borderRadius: 16, padding: 24, width: 300, maxWidth: '90vw',
            zIndex: 70, boxShadow: '0 8px 32px rgba(58,46,36,0.18)',
          }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
              Verbindung hinzufügen
            </h3>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              {people.find(p => p.id === labelModal.sourceId)?.name} ↔ {people.find(p => p.id === labelModal.targetId)?.name}
            </p>
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              placeholder="Wie sind sie verbunden? (optional)"
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid var(--color-warm-3)',
                backgroundColor: 'var(--color-white)',
                fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)',
                display: 'block', boxSizing: 'border-box', marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleCreateConnectionWithLabel(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1px solid var(--color-warm-3)', background: 'none',
                  fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                Überspringen
              </button>
              <button
                onClick={() => handleCreateConnectionWithLabel(labelInput.trim())}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 10,
                  border: 'none', backgroundColor: 'var(--color-warm-1)',
                  color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Verbinden
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
