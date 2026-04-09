import { useState, useRef, useEffect } from 'react'
import { User, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const CONN_COLORS = [
  { label: 'Standard', hex: '#C8BFB0' },
  { label: 'Grün', hex: '#66BB6A' },
  { label: 'Rot', hex: '#EF5350' },
  { label: 'Blau', hex: '#42A5F5' },
  { label: 'Orange', hex: '#FFA726' },
  { label: 'Gelb', hex: '#FFEE58' },
  { label: 'Lila', hex: '#AB47BC' },
  { label: 'Pink', hex: '#EC407A' },
]

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
  places = [],
  placeConnections = [],
  onPersonClick,
  onPersonMoved,
  onCreateConnection,
  onOverlayPersonClick,
  onConnectionColorChange,
  onDeleteConnection,
  onAddConnectedPerson,
  onCenterLineColorChange,
  onPlaceClick,
  onPlaceMoved,
  readOnly = false,
  connectionMode = false,
  hiddenColors,
  ownerDisconnectedIds = new Set(),
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
  // Overlay person positions (local only, not persisted to DB)
  const [overlayPositions, setOverlayPositions] = useState({})
  // Dragging state
  const [dragging, setDragging] = useState(null)
  // Connection mode selection state
  const [firstSelected, setFirstSelected] = useState(null)
  // Label modal for new connection
  const [labelModal, setLabelModal] = useState(null) // { sourceId, targetId } or null
  const [labelInput, setLabelInput] = useState('')
  // "Already connected" remove modal
  const [removeModal, setRemoveModal] = useState(null) // { conn } | null
  // Add person from connection mode
  const [addPersonModal, setAddPersonModal] = useState(null) // { connectedToId } | null
  const [addPersonName, setAddPersonName] = useState('')
  const [addingPersonBusy, setAddingPersonBusy] = useState(false)
  // Connection color picker: { conn, x, y } | null
  const [connColorPicker, setConnColorPicker] = useState(null)
  // Draft color while picker is open (not yet saved)
  const [connPickerDraft, setConnPickerDraft] = useState('#C8BFB0')
  // Local connection color overrides (confirmed saves)
  const [connColors, setConnColors] = useState({})
  // Center-line color picker: { personId?, placeId?, x, y } | null
  const [centerLinePicker, setCenterLinePicker] = useState(null)
  const [centerLinePickerDraft, setCenterLinePickerDraft] = useState('#C8BFB0')
  const [centerLineColors, setCenterLineColors] = useState({})
  // Separate color overrides for place center lines
  const [placeCenterLineColors, setPlaceCenterLineColors] = useState({})

  // Place positions (local, synced from props)
  const [placePositions, setPlacePositions] = useState({})
  const debouncedPlaceMoveRef = useRef(null)

  useEffect(() => {
    setPlacePositions(prev => {
      const next = { ...prev }
      places.forEach(pl => {
        if (!(pl.id in next)) {
          next[pl.id] = { x: pl.pos_x ?? cx, y: pl.pos_y ?? cy }
        }
      })
      Object.keys(next).forEach(id => { if (!places.find(pl => pl.id === id)) delete next[id] })
      return next
    })
  }, [places, cx, cy])

  useEffect(() => {
    debouncedPlaceMoveRef.current = debounce((placeId, x, y) => {
      onPlaceMoved?.(placeId, x, y)
    }, 800)
  }, [onPlaceMoved])

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

      // First pass: 1st generation people (normal ring positions)
      people.forEach((p, i) => {
        if (p.is_secondary) return
        if (!(p.id in next)) {
          if (p.pos_x != null && p.pos_y != null) {
            next[p.id] = { x: p.pos_x, y: p.pos_y }
          } else {
            next[p.id] = getDefaultPos(i, people.length, cx, cy, ringRadius)
          }
        }
      })

      // Second pass: 2nd generation people — place in line behind their parent
      people.forEach((p) => {
        if (!p.is_secondary) return
        if (p.id in next) return
        // Respect manually dragged position
        if (p.pos_x != null && p.pos_y != null) {
          next[p.id] = { x: p.pos_x, y: p.pos_y }
          return
        }
        // Find connected parent — skip if connection not yet loaded (re-runs when connections change)
        const conn = connections.find(c =>
          c.source_person_id === p.id || c.target_person_id === p.id
        )
        if (!conn) return
        const parentId = conn.source_person_id === p.id ? conn.target_person_id : conn.source_person_id
        const parentPos = next[parentId]
        if (!parentPos) return
        // Direction vector from center through parent
        const dx = parentPos.x - cx
        const dy = parentPos.y - cy
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        // Place 110px directly behind the parent (same line as center → parent)
        next[p.id] = {
          x: parentPos.x + (dx / len) * 110,
          y: parentPos.y + (dy / len) * 110,
        }
      })

      // Remove positions for deleted people
      Object.keys(next).forEach(id => {
        if (!people.find(p => p.id === id)) delete next[id]
      })
      return next
    })
  }, [people, connections, cx, cy, ringRadius])

  // Reset selection when connection mode turns off; show banner when it turns on
  const [showActiveBanner, setShowActiveBanner] = useState(false)
  useEffect(() => {
    if (!connectionMode) {
      setFirstSelected(null)
      setLabelModal(null)
      setLabelInput('')
      setShowActiveBanner(false)
      setAddPersonModal(null)
      setAddPersonName('')
    } else {
      setShowActiveBanner(true)
      const t = setTimeout(() => setShowActiveBanner(false), 2200)
      return () => clearTimeout(t)
    }
  }, [connectionMode])

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

  // Overlay helpers
  function overlayKey(parentId, personId) {
    return `${parentId}__${personId}`
  }

  function getDefaultOverlayPos(parentPos, idx, total) {
    // Ensure nodes don't overlap: minimum circumference = total * (2*overlayR + 8)
    const overlayR = 20
    const minR = (total * (overlayR * 2 + 8)) / (2 * Math.PI)
    const r = Math.max(80, minR)
    const angle = (idx / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2
    return {
      x: parentPos.x + r * Math.cos(angle),
      y: parentPos.y + r * Math.sin(angle),
    }
  }

  function getOverlayPos(parentId, personId, parentPos, idx, total) {
    const key = overlayKey(parentId, personId)
    return overlayPositions[key] || getDefaultOverlayPos(parentPos, idx, total)
  }

  // Resolves any person ID to { person, pos } — works for both main and overlay persons
  function resolvePersonPos(personId) {
    const mainIdx = people.findIndex(p => p.id === personId)
    if (mainIdx !== -1) {
      return { person: people[mainIdx], pos: getPos(people[mainIdx], mainIdx) }
    }
    for (const od of overlayData) {
      const parentPerson = people.find(p => p.id === od.parentPersonId)
      if (!parentPerson) continue
      const parentIdx = people.indexOf(parentPerson)
      const parentPos = getPos(parentPerson, parentIdx)
      const visible = od.persons.filter(op =>
        (op.is_christian && od.showChristian) || (!op.is_christian && od.showNonChristian)
      )
      const opIdx = visible.findIndex(op => op.id === personId)
      if (opIdx !== -1) {
        return {
          person: visible[opIdx],
          pos: getOverlayPos(od.parentPersonId, personId, parentPos, opIdx, visible.length),
        }
      }
    }
    return null
  }

  function findOverlayPerson(personId) {
    for (const od of overlayData) {
      const found = od.persons.find(p => p.id === personId)
      if (found) return found
    }
    return null
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
    const minX = -(vbSize * 3)
    const minY = -(vbSize * 3)
    const maxX = vbSize - viewW + vbSize * 3
    const maxY = vbSize - viewH + vbSize * 3
    return {
      x: Math.max(minX, Math.min(maxX, ox)),
      y: Math.max(minY, Math.min(maxY, oy)),
    }
  }

  function handleWheel(e) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newZoom = Math.min(10, Math.max(0.1, zoom * factor))
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
      overlayKey: null,
      overlayPersonObj: null,
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
      overlayKey: null,
      overlayPersonObj: null,
      startSVGX: svgPos.x,
      startSVGY: svgPos.y,
      startPersonX: pos.x,
      startPersonY: pos.y,
      startTime: Date.now(),
      moved: false,
    })
  }

  function handleOverlayMouseDown(e, op, parentPersonId, pos) {
    if (connectionMode) return
    e.stopPropagation()
    e.preventDefault()
    const svgPos = clientToSVG(e.clientX, e.clientY)
    setDragging({
      id: op.id,
      overlayKey: overlayKey(parentPersonId, op.id),
      overlayPersonObj: op,
      startSVGX: svgPos.x,
      startSVGY: svgPos.y,
      startPersonX: pos.x,
      startPersonY: pos.y,
      startTime: Date.now(),
      moved: false,
    })
  }

  function handleOverlayTouchStart(e, op, parentPersonId, pos) {
    if (connectionMode) return
    e.stopPropagation()
    const touch = e.touches[0]
    const svgPos = clientToSVG(touch.clientX, touch.clientY)
    setDragging({
      id: op.id,
      overlayKey: overlayKey(parentPersonId, op.id),
      overlayPersonObj: op,
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
      const newPos = { x: dragging.startPersonX + dx, y: dragging.startPersonY + dy }
      if (dragging.isPlace) {
        setPlacePositions(prev => ({ ...prev, [dragging.id]: newPos }))
      } else if (dragging.overlayKey) {
        setOverlayPositions(prev => ({ ...prev, [dragging.overlayKey]: newPos }))
      } else {
        setPositions(prev => ({ ...prev, [dragging.id]: newPos }))
      }
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
        const newZoom = Math.min(10, Math.max(0.1, prevZoom * (dist / prevDist)))
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

    if (!dragging) {
      // Single-finger pan
      if (panning && e.touches.length === 1) {
        const touch = e.touches[0]
        const rect = svgRef.current?.getBoundingClientRect()
        if (rect) {
          const viewW = vbSize / zoom
          const viewH = vbSize / zoom
          const dxClient = touch.clientX - panning.startClientX
          const dyClient = touch.clientY - panning.startClientY
          const raw = {
            x: panning.startOriginX - dxClient / rect.width * viewW,
            y: panning.startOriginY - dyClient / rect.height * viewH,
          }
          setViewOrigin(clampOrigin(raw.x, raw.y, zoom))
        }
      }
      return
    }
    const touch = e.touches[0]
    const svgPos = clientToSVG(touch.clientX, touch.clientY)
    const dx = svgPos.x - dragging.startSVGX
    const dy = svgPos.y - dragging.startSVGY
    const dist = Math.sqrt(dx * dx + dy * dy)
    setDragging(prev => ({ ...prev, moved: dist > 5 }))
    const newPos = { x: dragging.startPersonX + dx, y: dragging.startPersonY + dy }
    if (dragging.isPlace) {
      setPlacePositions(prev => ({ ...prev, [dragging.id]: newPos }))
    } else if (dragging.overlayKey) {
      setOverlayPositions(prev => ({ ...prev, [dragging.overlayKey]: newPos }))
    } else {
      setPositions(prev => ({ ...prev, [dragging.id]: newPos }))
    }
  }

  function handleMouseUp() {
    if (dragging) {
      const elapsed = Date.now() - dragging.startTime
      const wasClick = !dragging.moved && elapsed < 200
      if (wasClick) {
        if (dragging.isPlace) {
          const place = places.find(pl => pl.id === dragging.id)
          if (place) onPlaceClick?.(place)
        } else if (dragging.overlayKey) {
          const op = dragging.overlayPersonObj || findOverlayPerson(dragging.id)
          if (op) {
            if (connectionMode) handlePersonTap({ id: dragging.id })
            else onOverlayPersonClick?.(op)
          }
        } else {
          const person = people.find(p => p.id === dragging.id)
          if (person) onPersonClick?.(person)
        }
      } else if (dragging.isPlace) {
        const pos = placePositions[dragging.id]
        if (pos) debouncedPlaceMoveRef.current?.(dragging.id, pos.x, pos.y)
      } else if (!dragging.overlayKey) {
        const pos = positions[dragging.id]
        if (pos) debouncedMoveRef.current?.(dragging.id, pos.x, pos.y)
      }
      setDragging(null)
    }
    if (panning) setPanning(null)
  }

  function handleTouchEnd() {
    pinchRef.current = null
    if (panning) setPanning(null)
    if (!dragging) return
    const elapsed = Date.now() - dragging.startTime
    const wasClick = !dragging.moved && elapsed < 200
    if (wasClick) {
      if (dragging.isPlace) {
        const place = places.find(pl => pl.id === dragging.id)
        if (place) onPlaceClick?.(place)
      } else if (dragging.overlayKey) {
        const op = dragging.overlayPersonObj || findOverlayPerson(dragging.id)
        if (op) {
          if (connectionMode) handlePersonTap({ id: dragging.id })
          else onOverlayPersonClick?.(op)
        }
      } else {
        const person = people.find(p => p.id === dragging.id)
        if (person) handlePersonTap(person)
      }
    } else if (dragging.isPlace) {
      const pos = placePositions[dragging.id]
      if (pos) debouncedPlaceMoveRef.current?.(dragging.id, pos.x, pos.y)
    } else if (!dragging.overlayKey) {
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

  function handleBackgroundTouchStart(e) {
    if (connectionMode || dragging) return
    if (e.touches.length !== 1) {
      // Multi-finger: cancel any active panning (pinch takes over)
      setPanning(null)
      return
    }
    const touch = e.touches[0]
    setPanning({
      startClientX: touch.clientX,
      startClientY: touch.clientY,
      startOriginX: viewOrigin.x,
      startOriginY: viewOrigin.y,
    })
  }

  function changeZoom(factor) {
    const newZoom = Math.min(10, Math.max(0.1, zoom * factor))
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

  function resolvePersonRadius(personId) {
    return people.find(p => p.id === personId) ? personR : 20 // overlayR = 20
  }

  function resolvePersonName(personId) {
    const main = people.find(p => p.id === personId)
    if (main) return main.name
    for (const od of overlayData) {
      const found = od.persons.find(p => p.id === personId)
      if (found) return found.name
    }
    return '?'
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
      // Check if already connected
      const existing = connections.find(c =>
        (c.source_person_id === firstSelected && c.target_person_id === person.id) ||
        (c.source_person_id === person.id && c.target_person_id === firstSelected)
      )
      if (existing) {
        setRemoveModal({ conn: existing, nameA: resolvePersonName(firstSelected), nameB: resolvePersonName(person.id) })
        setFirstSelected(null)
      } else {
        // Open label modal
        setLabelModal({ sourceId: firstSelected, targetId: person.id })
        setLabelInput('')
        setFirstSelected(null)
      }
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

  async function handleAddPersonFromMode() {
    if (!addPersonName.trim() || addingPersonBusy || !addPersonModal) return
    setAddingPersonBusy(true)
    try {
      await onAddConnectedPerson?.(addPersonName.trim(), addPersonModal.connectedToId)
      setAddPersonModal(null)
      setAddPersonName('')
      setFirstSelected(null)
    } catch {
      // ignore
    }
    setAddingPersonBusy(false)
  }

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleBackgroundMouseDown}
      onTouchStart={handleBackgroundTouchStart}
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

      {/* Connection mode banner + hint */}
      {connectionMode && (
        <div style={{
          position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          {/* "Aktiv" banner — fades out after 2s */}
          <span style={{
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700,
            color: 'white',
            backgroundColor: 'var(--color-warm-1)',
            padding: '6px 16px', borderRadius: 20,
            boxShadow: '0 2px 10px rgba(58,46,36,0.20)',
            opacity: showActiveBanner ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }}>
            Verbindungsmodus ist Aktiv
          </span>
          {/* Ongoing hint */}
          <span style={{
            fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)',
            fontStyle: 'italic', backgroundColor: 'rgba(255,253,248,0.92)',
            padding: '4px 12px', borderRadius: 12,
            boxShadow: '0 1px 6px rgba(58,46,36,0.10)',
            pointerEvents: 'none',
          }}>
            {firstSelected ? 'Wähle eine zweite Person' : 'Tippe zwei Personen an um sie zu verbinden'}
          </span>
          {/* + Person button when a person is selected */}
          {firstSelected && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                setAddPersonModal({ connectedToId: firstSelected })
                setAddPersonName('')
              }}
              style={{
                padding: '7px 18px', borderRadius: 10,
                border: 'none', backgroundColor: 'var(--color-warm-1)',
                color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(58,46,36,0.22)',
              }}
            >
              + Person
            </button>
          )}
        </div>
      )}

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

        {/* Ring um Zentrum */}
        <circle
          cx={cx} cy={cy}
          r={userR + 20}
          fill="none"
          stroke="var(--color-warm-3)"
          strokeWidth={1.2}
        />

        {/* Center-to-person Verbindungslinien (nur für direkte / 1. Generation) */}
        {people.map((p, i) => {
          if (p.is_secondary) return null
          if (ownerDisconnectedIds.has(p.id)) return null
          const pos = getPos(p, i)
          const lineColor = centerLineColors[p.id] || p.center_line_color || 'var(--color-warm-3)'
          const isPickerOpen = centerLinePicker?.personId === p.id
          return (
            <g key={p.id + '_centerline'}>
              {!readOnly && (
                <line
                  x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                  stroke="transparent" strokeWidth={14}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    if (isPickerOpen) { setCenterLinePicker(null); return }
                    setCenterLinePickerDraft(centerLineColors[p.id] || p.center_line_color || '#C8BFB0')
                    setCenterLinePicker({ personId: p.id, x: e.clientX, y: e.clientY })
                  }}
                />
              )}
              <line
                x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                stroke={lineColor}
                strokeWidth={isPickerOpen ? 2.5 : 1.5}
                style={{ pointerEvents: 'none' }}
              />
            </g>
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
            const pos = getOverlayPos(od.parentPersonId, op.id, parentPos, idx, visible.length)
            const ox = pos.x
            const oy = pos.y
            const overlayR = 20
            const strokeColor = op.is_christian ? 'var(--color-warm-1)' : 'var(--color-accent)'
            const isDraggingThis = dragging?.overlayKey === overlayKey(od.parentPersonId, op.id) && dragging?.moved
            const isSelected = firstSelected === op.id

            return (
              <g
                key={`overlay_${od.parentPersonId}_${op.id}`}
                style={{ cursor: isDraggingThis ? 'grabbing' : (connectionMode ? 'pointer' : 'grab') }}
                onMouseDown={e => handleOverlayMouseDown(e, op, od.parentPersonId, pos)}
                onTouchStart={e => handleOverlayTouchStart(e, op, od.parentPersonId, pos)}
                onClick={e => {
                  e.stopPropagation()
                  if (connectionMode) handlePersonTap({ id: op.id })
                  else onOverlayPersonClick?.(op)
                }}
              >
                {/* Line from parent to overlay person */}
                <line
                  x1={parentPos.x} y1={parentPos.y}
                  x2={ox} y2={oy}
                  stroke="var(--color-accent)"
                  strokeWidth={1}
                  opacity={0.6}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Drop shadow when dragging */}
                {isDraggingThis && (
                  <circle cx={ox} cy={oy} r={overlayR * 1.4} fill="rgba(58,46,36,0.10)" />
                )}
                {/* Overlay person circle */}
                <circle
                  cx={ox} cy={oy} r={isDraggingThis ? overlayR * 1.1 : overlayR}
                  fill="var(--color-warm-4)"
                  stroke={isSelected ? 'var(--color-gold)' : strokeColor}
                  strokeWidth={isSelected ? 3 : 1.5}
                  opacity={0.9}
                  style={{ filter: isDraggingThis ? 'drop-shadow(0 4px 8px rgba(58,46,36,0.20))' : 'none' }}
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
          const src = resolvePersonPos(conn.source_person_id)
          const tgt = resolvePersonPos(conn.target_person_id)
          if (!src || !tgt) return null
          const srcPos = src.pos
          const tgtPos = tgt.pos
          const dx = tgtPos.x - srcPos.x
          const dy = tgtPos.y - srcPos.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const ux = dx / dist
          const uy = dy / dist
          const srcR = resolvePersonRadius(conn.source_person_id)
          const tgtR = resolvePersonRadius(conn.target_person_id)
          const x1 = srcPos.x + ux * srcR
          const y1 = srcPos.y + uy * srcR
          const x2 = tgtPos.x - ux * tgtR
          const y2 = tgtPos.y - uy * tgtR
          const midX = (x1 + x2) / 2
          const midY = (y1 + y2) / 2
          const connColor = connColors[conn.id] || conn.color || '#C8BFB0'
          const isPickerOpen = connColorPicker?.conn?.id === conn.id
          return (
            <g key={conn.id}>
              {/* Wide invisible hit area for easy clicking */}
              {!readOnly && (
                <line
                  x1={x1} y1={y1}
                  x2={x2} y2={y2}
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    if (isPickerOpen) {
                      setConnColorPicker(null)
                    } else {
                      const initColor = connColors[conn.id] || conn.color || '#C8BFB0'
                      setConnPickerDraft(initColor)
                      setConnColorPicker({ conn, x: e.clientX, y: e.clientY })
                    }
                  }}
                />
              )}
              <line
                x1={x1} y1={y1}
                x2={x2} y2={y2}
                stroke={connColor}
                strokeWidth={isPickerOpen ? 2.5 : 1.5}
                style={{ pointerEvents: 'none' }}
              />
              {conn.label && (
                <text
                  x={midX} y={midY}
                  textAnchor="middle"
                  dy="-4"
                  fill={connColor}
                  fontSize={9}
                  fontFamily="Lora, Georgia, serif"
                  fontStyle="italic"
                  style={{ pointerEvents: 'none' }}
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

        {/* Center-to-place lines (start at edge of center circle, like person lines) */}
        {places.map(pl => {
          const pos = placePositions[pl.id]
          if (!pos) return null
          const dx = pos.x - cx
          const dy = pos.y - cy
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const ux = dx / dist
          const uy = dy / dist
          const x1 = cx + ux * userR
          const y1 = cy + uy * userR
          const lineColor = placeCenterLineColors[pl.id] || pl.color || 'var(--color-warm-3)'
          const isPickerOpen = centerLinePicker?.placeId === pl.id
          return (
            <g key={`cpl_${pl.id}`}>
              {!readOnly && (
                <line
                  x1={x1} y1={y1} x2={pos.x} y2={pos.y}
                  stroke="transparent" strokeWidth={14}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    if (isPickerOpen) { setCenterLinePicker(null); return }
                    setCenterLinePickerDraft(placeCenterLineColors[pl.id] || pl.color || '#C8BFB0')
                    setCenterLinePicker({ placeId: pl.id, x: e.clientX, y: e.clientY })
                  }}
                />
              )}
              <line
                x1={x1} y1={y1} x2={pos.x} y2={pos.y}
                stroke={lineColor}
                strokeWidth={isPickerOpen ? 2.5 : 1.5}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )
        })}

        {/* Place-to-person dashed lines */}
        {placeConnections.map(conn => {
          const placePos = placePositions[conn.place_id]
          const personIdx = people.findIndex(p => p.id === conn.person_id)
          if (!placePos || personIdx === -1) return null
          const personPos = getPos(people[personIdx], personIdx)
          const pl = places.find(p => p.id === conn.place_id)
          return (
            <line
              key={`pc_${conn.id}`}
              x1={placePos.x} y1={placePos.y}
              x2={personPos.x} y2={personPos.y}
              stroke={pl?.color || '#8A7060'}
              strokeWidth={1}
              strokeDasharray="5 4"
              opacity={0.55}
              style={{ pointerEvents: 'none' }}
            />
          )
        })}

        {/* Place nodes (rounded rectangles) */}
        {places.map(pl => {
          const pos = placePositions[pl.id] || { x: cx, y: cy }
          const isDraggingThis = dragging?.id === pl.id && dragging?.isPlace && dragging?.moved
          const w = 84, h = 46, rx = 9
          const connCount = placeConnections.filter(c => c.place_id === pl.id).length
          const TYPE_EMOJIS = { sport: '🏋️', work: '💼', school: '🏫', church: '⛪', place: '📍', other: '🗺️' }
          const emoji = TYPE_EMOJIS[pl.type] || '📍'
          const plName = pl.name.length > 9 ? pl.name.slice(0, 8) + '…' : pl.name
          return (
            <g
              key={pl.id}
              style={{ cursor: isDraggingThis ? 'grabbing' : 'grab', opacity: 0.9 }}
              onMouseDown={e => {
                if (connectionMode) return
                e.stopPropagation(); e.preventDefault()
                const svgPos = clientToSVG(e.clientX, e.clientY)
                setDragging({ id: pl.id, isPlace: true, overlayKey: null, overlayPersonObj: null, startSVGX: svgPos.x, startSVGY: svgPos.y, startPersonX: pos.x, startPersonY: pos.y, startTime: Date.now(), moved: false })
              }}
              onTouchStart={e => {
                if (connectionMode) return
                e.stopPropagation()
                const touch = e.touches[0]
                const svgPos = clientToSVG(touch.clientX, touch.clientY)
                setDragging({ id: pl.id, isPlace: true, overlayKey: null, overlayPersonObj: null, startSVGX: svgPos.x, startSVGY: svgPos.y, startPersonX: pos.x, startPersonY: pos.y, startTime: Date.now(), moved: false })
              }}
              onClick={e => { e.stopPropagation(); if (!dragging?.moved) onPlaceClick?.(pl) }}
            >
              {isDraggingThis && (
                <rect x={pos.x - w / 2 - 4} y={pos.y - h / 2 - 4} width={w + 8} height={h + 8} rx={rx + 4} fill="rgba(58,46,36,0.10)" />
              )}
              <rect
                x={pos.x - w / 2} y={pos.y - h / 2}
                width={w} height={h} rx={rx}
                fill={pl.color || '#8A7060'}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.5}
                style={{ filter: isDraggingThis ? 'drop-shadow(0 4px 10px rgba(58,46,36,0.25))' : 'drop-shadow(0 2px 4px rgba(58,46,36,0.15))' }}
              />
              {/* Emoji icon left */}
              <text x={pos.x - w / 2 + 12} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={13} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {emoji}
              </text>
              {/* Place name */}
              <text
                x={pos.x + 4} y={pos.y}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={9}
                fontFamily="Lora, Georgia, serif"
                fontWeight="600"
                style={{ pointerEvents: 'none' }}
              >
                {plName}
              </text>
              {/* Person count badge bottom-right */}
              {connCount > 0 && (
                <g>
                  <circle cx={pos.x + w / 2 - 1} cy={pos.y + h / 2 - 1} r={8} fill="white" stroke={pl.color || '#8A7060'} strokeWidth={1.5} />
                  <text x={pos.x + w / 2 - 1} y={pos.y + h / 2 - 1} textAnchor="middle" dominantBaseline="middle" fill={pl.color || '#8A7060'} fontSize={7} fontFamily="Lora, Georgia, serif" fontWeight="700" style={{ pointerEvents: 'none' }}>
                    {connCount}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* Personen */}
        {people.map((p, i) => {
          const personColor = p.circle_color || '#E8E4DC'
          if (hiddenColors && hiddenColors.size > 0 && hiddenColors.has(personColor)) return null

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
              data-person-id={p.id}
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
                fill={p.circle_color || '#E8E4DC'}
                stroke={isFirstSelected ? 'var(--color-gold)' : (p.circle_color ? p.circle_color : 'var(--color-warm-3)')}
                strokeWidth={isFirstSelected ? 4 : 1.5}
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
                fill={p.name_color || '#3A2E24'}
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

      {/* Add person from connection mode modal */}
      {addPersonModal && (
        <>
          <div
            onClick={() => { setAddPersonModal(null); setAddPersonName('') }}
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
              Person hinzufügen
            </h3>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Wird verbunden mit: <strong>{resolvePersonName(addPersonModal.connectedToId)}</strong>
            </p>
            <input
              type="text"
              value={addPersonName}
              onChange={e => setAddPersonName(e.target.value)}
              placeholder="Name der Person…"
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid var(--color-warm-3)',
                backgroundColor: 'var(--color-white)',
                fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)',
                display: 'block', boxSizing: 'border-box', marginBottom: 14,
              }}
              onKeyDown={e => { if (e.key === 'Enter' && addPersonName.trim()) handleAddPersonFromMode() }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setAddPersonModal(null); setAddPersonName('') }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1px solid var(--color-warm-3)', background: 'none',
                  fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddPersonFromMode}
                disabled={!addPersonName.trim() || addingPersonBusy}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 10,
                  border: 'none',
                  backgroundColor: addPersonName.trim() && !addingPersonBusy ? 'var(--color-warm-1)' : 'var(--color-warm-3)',
                  color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                {addingPersonBusy ? 'Wird hinzugefügt…' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Remove connection modal */}
      {removeModal && (
        <>
          <div
            onClick={() => setRemoveModal(null)}
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
              Bereits verbunden
            </h3>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              {removeModal.nameA} und {removeModal.nameB} sind bereits verbunden. Verbindung entfernen?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setRemoveModal(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1px solid var(--color-warm-3)', background: 'none',
                  fontFamily: 'Lora, serif', fontSize: 13, cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                Nein
              </button>
              <button
                onClick={() => {
                  onDeleteConnection?.(removeModal.conn.id)
                  setRemoveModal(null)
                }}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 10,
                  border: 'none', backgroundColor: '#C0392B',
                  color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ja, entfernen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Connection color picker */}
      {connColorPicker && (() => {
        const pickerW = 232
        const vw = window.innerWidth
        const vh = window.innerHeight
        const left = Math.min(connColorPicker.x + 8, vw - pickerW - 12)
        const top = Math.min(connColorPicker.y + 8, vh - 200)
        return (
          <>
            <div
              onClick={() => setConnColorPicker(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            />
            <div
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'fixed', left, top: Math.max(8, top),
                width: pickerW, zIndex: 51,
                backgroundColor: 'var(--color-white)',
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(58,46,36,0.18)',
                border: '1px solid var(--color-warm-3)',
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                  Verbindungsfarbe
                </span>
                <button onClick={() => setConnColorPicker(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--color-text-muted)' }}>
                  <X size={15} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {CONN_COLORS.map(c => (
                  <button
                    key={c.hex}
                    title={c.label}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => {
                      setConnPickerDraft(c.hex)
                      setConnColors(prev => ({ ...prev, [connColorPicker.conn.id]: c.hex }))
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', backgroundColor: c.hex,
                      border: connPickerDraft === c.hex ? '3px solid var(--color-text)' : '2px solid rgba(0,0,0,0.12)',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      boxShadow: connPickerDraft === c.hex ? '0 0 0 2px white inset' : 'none',
                    }}
                  />
                ))}
              </div>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => {
                  onConnectionColorChange?.(connColorPicker.conn.id, connPickerDraft)
                  setConnColorPicker(null)
                }}
                style={{
                  width: '100%',
                  padding: '10px 0', borderRadius: 10,
                  border: 'none', backgroundColor: 'var(--color-warm-1)',
                  color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Speichern
              </button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => {
                  onDeleteConnection?.(connColorPicker.conn.id)
                  setConnColorPicker(null)
                }}
                style={{
                  marginTop: 8, width: '100%',
                  padding: '9px 0', borderRadius: 10,
                  border: '1px solid #E8C0B8', backgroundColor: 'transparent',
                  color: '#C0392B', fontFamily: 'Lora, serif', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Verbindung entfernen
              </button>
            </div>
          </>
        )
      })()}

      {/* Center-line color picker */}
      {centerLinePicker && (() => {
        const pickerW = 232
        const vw = window.innerWidth
        const vh = window.innerHeight
        const left = Math.min(centerLinePicker.x + 8, vw - pickerW - 12)
        const top = Math.min(centerLinePicker.y + 8, vh - 200)
        return (
          <>
            <div onClick={() => setCenterLinePicker(null)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
            <div
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'fixed', left, top: Math.max(8, top),
                width: pickerW, zIndex: 51,
                backgroundColor: 'var(--color-white)',
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(58,46,36,0.18)',
                border: '1px solid var(--color-warm-3)',
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                  Linienfarbe
                </span>
                <button onClick={() => setCenterLinePicker(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--color-text-muted)' }}>
                  <X size={15} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {CONN_COLORS.map(c => (
                  <button
                    key={c.hex}
                    title={c.label}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => {
                      setCenterLinePickerDraft(c.hex)
                      if (centerLinePicker.placeId) {
                        setPlaceCenterLineColors(prev => ({ ...prev, [centerLinePicker.placeId]: c.hex }))
                      } else {
                        setCenterLineColors(prev => ({ ...prev, [centerLinePicker.personId]: c.hex }))
                      }
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', backgroundColor: c.hex,
                      border: centerLinePickerDraft === c.hex ? '3px solid var(--color-text)' : '2px solid rgba(0,0,0,0.12)',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      boxShadow: centerLinePickerDraft === c.hex ? '0 0 0 2px white inset' : 'none',
                    }}
                  />
                ))}
              </div>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => {
                  if (!centerLinePicker.placeId) {
                    onCenterLineColorChange?.(centerLinePicker.personId, centerLinePickerDraft)
                  }
                  setCenterLinePicker(null)
                }}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10,
                  border: 'none', backgroundColor: 'var(--color-warm-1)',
                  color: 'white', fontFamily: 'Lora, serif', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Speichern
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
}
