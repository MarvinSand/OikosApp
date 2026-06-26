import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { Plus, Navigation, Users, CalendarDays } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useWorldMap } from '../../hooks/useWorldMap'
import { useToast } from '../../context/ToastContext'
import { GOOGLE_MAPS_LOADER_OPTIONS, DEFAULT_MAP_ID } from '../../lib/googleMaps'
import AdvancedMarker from './AdvancedMarker'
import UserPinSheet from './UserPinSheet'
import ActivitySheet from './ActivitySheet'
import CreateActivitySheet from './CreateActivitySheet'

// ─── Palette (Phase 27: schwarz/weiß + babyblauer Akzent) ──
const C = {
  accent: 'var(--color-accent)',
  accentDark: 'var(--color-accent-dark)',
  accentLight: 'var(--color-accent-light)',
  text: 'var(--color-text)',
  textSec: 'var(--color-text-secondary)',
  textTer: 'var(--color-text-tertiary)',
  border: 'var(--color-border)',
  bg: 'var(--color-bg)',
  bgSec: 'var(--color-bg-secondary)',
  error: 'var(--color-error)',
  surfaceBlur: 'var(--color-surface-blur)',
}

// ─── Utilities ───────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Haptisches Zoom-Verhalten: rauszoomen (kleiner Zoom-Wert) → Pins größer,
// reinzoomen (großer Zoom-Wert) → Pins kleiner.
function pinScale(zoom) {
  const z = Math.max(3, Math.min(16, zoom ?? 10))
  const t = (z - 3) / (16 - 3)        // 0 (weit raus) … 1 (nah dran)
  return +(1.55 - t * (1.55 - 0.8)).toFixed(3)  // 1.55 … 0.8
}

// Zählt, wie viele andere Pins im Umkreis von ~radiusPx Bildschirm-Pixeln liegen.
// Grundlage: Web-Mercator – Welt ist bei Zoom z genau 256·2^z px breit.
function countNeighbors(lat, lng, positions, zoom, radiusPx = 64) {
  const worldPx = 256 * Math.pow(2, zoom)
  const radDeg = radiusPx * (360 / worldPx)
  const cosLat = Math.cos((lat * Math.PI) / 180) || 1
  let n = 0
  for (const p of positions) {
    const dLat = p.lat - lat
    const dLng = (p.lng - lng) * cosLat
    if (dLat === 0 && dLng === 0) continue          // sich selbst nicht mitzählen
    if (Math.abs(dLat) > radDeg || Math.abs(dLng) > radDeg) continue
    if (Math.sqrt(dLat * dLat + dLng * dLng) < radDeg) n++
  }
  return n
}

// Je mehr Nachbarn in der Nähe, desto kleiner der Pin – damit alle erkennbar bleiben.
function densityScale(neighbors) {
  return Math.max(0.55, 1 - neighbors * 0.09)
}

// Wendet kombinierten Zoom- + Dichte-Maßstab auf jeden Pin an.
function applyPinScales(markerData, positions, zoom) {
  const base = pinScale(zoom)
  for (const d of markerData) {
    const layer = d.marker.content?.querySelector?.('[data-pin-scale]')
    if (!layer) continue
    const n = countNeighbors(d.lat, d.lng, positions, zoom)
    layer.style.transform = `scale(${(base * densityScale(n)).toFixed(3)})`
  }
}

// ─── Pin DOM builders ────────────────────────────────────
function buildUserPinElement(user, { isOwn = false, zoom } = {}) {
  const size = isOwn ? 58 : 48
  const borderColor = isOwn ? C.accentDark : C.accent
  const bg = user.avatar_url ? 'transparent' : borderColor
  const initials = getInitials(user.full_name)

  // Äußerer Wrapper = fixe Basisgröße, hält den Anker stabil
  const wrap = document.createElement('div')
  wrap.style.cssText = `position:relative;width:${size}px;height:${size}px;transform:translateY(50%);`

  // Innerer Layer wird je nach Zoom skaliert (haptisches Wachsen/Schrumpfen)
  const scaleLayer = document.createElement('div')
  scaleLayer.dataset.pinScale = '1'
  scaleLayer.style.cssText = `position:relative;width:100%;height:100%;transform-origin:50% 50%;transform:scale(${pinScale(zoom)});transition:transform 0.18s ease;`

  const circle = document.createElement('div')
  circle.style.cssText = `width:100%;height:100%;border-radius:50%;background:${bg};border:${isOwn ? 3 : 2.5}px solid ${borderColor};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.22);cursor:pointer;`

  if (user.avatar_url) {
    const img = document.createElement('img')
    img.src = user.avatar_url
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;'
    img.referrerPolicy = 'no-referrer'
    circle.appendChild(img)
  } else {
    const span = document.createElement('span')
    span.style.cssText = `font-size:${Math.floor(size / 3)}px;font-weight:700;color:#fff;user-select:none;`
    span.textContent = initials
    circle.appendChild(span)
  }
  scaleLayer.appendChild(circle)

  if (isOwn) {
    const pulse = document.createElement('div')
    pulse.style.cssText = 'position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(90,200,250,0.6);animation:oikosPinPulse 2s ease-in-out infinite;pointer-events:none;'
    scaleLayer.appendChild(pulse)
  }
  wrap.appendChild(scaleLayer)
  return wrap
}

function buildActivityPinElement(emoji, { zoom } = {}) {
  const size = 58
  const radius = '34%'  // abgerundetes Quadrat (squircle) statt Kreis

  // Äußerer Wrapper hält den Anker stabil
  const wrap = document.createElement('div')
  wrap.style.cssText = `position:relative;width:${size}px;height:${size}px;transform:translateY(50%);cursor:pointer;`

  // Skalierungs-Layer fürs haptische Zoom-Verhalten
  const scaleLayer = document.createElement('div')
  scaleLayer.dataset.pinScale = '1'
  scaleLayer.style.cssText = `position:relative;width:100%;height:100%;transform-origin:50% 50%;transform:scale(${pinScale(zoom)});transition:transform 0.18s ease;`

  // Drei gestaffelte Radar-Ping-Ringe → starkes, auffälliges Pulsieren
  ;[0, 0.6, 1.2].forEach(delay => {
    const ring = document.createElement('div')
    ring.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:rgba(90,200,250,0.35);border:2px solid rgba(90,200,250,0.55);animation:eventPinPulse 1.8s ease-out ${delay}s infinite;pointer-events:none;`
    scaleLayer.appendChild(ring)
  })

  // The pin square itself (rounded corners) – schlägt wie ein Herzschlag
  const square = document.createElement('div')
  square.style.cssText = `position:absolute;inset:4px;border-radius:${radius};background:${C.accent};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(90,200,250,0.7);font-size:24px;transform-origin:50% 50%;animation:eventPinBeat 1.2s ease-in-out infinite;`
  square.textContent = emoji || '📍'
  scaleLayer.appendChild(square)

  wrap.appendChild(scaleLayer)
  return wrap
}

function buildClusterElement(count, color) {
  const wrap = document.createElement('div')
  wrap.style.cssText = `width:44px;height:44px;border-radius:50%;background:${color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);transform:translateY(50%);`
  const span = document.createElement('span')
  span.style.cssText = 'font-size:14px;font-weight:700;color:#fff;'
  span.textContent = String(count)
  wrap.appendChild(span)
  return wrap
}

// ─── Privacy Banner ──────────────────────────────────────
const PRIVACY_KEY = 'oikos_worldmap_privacy_seen'

function PrivacyBanner({ onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: C.bg, borderRadius: '20px 20px 0 0', paddingTop: 28, paddingLeft: 20, paddingRight: 20, paddingBottom: 'max(28px, calc(84px + env(safe-area-inset-bottom, 0px)))', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ fontSize: 42, textAlign: 'center', marginBottom: 12 }}>🌍</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 8 }}>
          Willkommen auf der Weltkarte
        </h3>
        <p style={{ fontSize: 13, color: C.textSec, textAlign: 'center', lineHeight: 1.65, marginBottom: 22 }}>
          Hier siehst du deine verbundenen Geschwister und Events in deiner Nähe. Dein Standort wird anderen nur angezeigt, wenn du das in deinen Profil-Einstellungen aktivierst.
        </p>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 14, background: C.accent, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Verstanden ✓
        </button>
      </div>
    </div>
  )
}

// ─── User-pin clusterer ───────────────────────────────────
function useUserClusterer({ map, users, onUserClick, enabled, zoom, allPositions }) {
  const clustererRef = useRef(null)
  const markersRef = useRef([])
  const markerDataRef = useRef([])
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const positionsRef = useRef(allPositions)
  positionsRef.current = allPositions

  // Pins bei Zoom-/Dichte-Änderung live skalieren (ohne Marker neu zu bauen)
  useEffect(() => {
    applyPinScales(markerDataRef.current, allPositions, zoom)
  }, [zoom, allPositions])

  useEffect(() => {
    if (!map || !enabled || !window.google?.maps?.marker?.AdvancedMarkerElement) {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers()
        clustererRef.current = null
      }
      markersRef.current.forEach(m => { m.map = null })
      markersRef.current = []
      markerDataRef.current = []
      return
    }

    const newMarkers = users.map(u => {
      const content = buildUserPinElement(u, { isOwn: false, zoom: zoomRef.current })
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: u.latitude, lng: u.longitude },
        content,
        gmpClickable: true,
      })
      marker.addListener('gmp-click', () => onUserClick(u))
      return marker
    })
    markersRef.current = newMarkers
    markerDataRef.current = users.map((u, i) => ({ marker: newMarkers[i], lat: u.latitude, lng: u.longitude }))
    applyPinScales(markerDataRef.current, positionsRef.current, zoomRef.current)

    const clusterer = new MarkerClusterer({
      map,
      markers: newMarkers,
      renderer: {
        render: ({ count, position }) => {
          return new window.google.maps.marker.AdvancedMarkerElement({
            position,
            content: buildClusterElement(count, C.accent),
            zIndex: 100 + count,
          })
        },
      },
    })
    clustererRef.current = clusterer

    return () => {
      clusterer.clearMarkers()
      newMarkers.forEach(m => { m.map = null })
      clustererRef.current = null
      markersRef.current = []
      markerDataRef.current = []
    }
  }, [map, users, enabled, onUserClick])
}

// ─── Activity-pin clusterer ───────────────────────────────
function useActivityClusterer({ map, activities, onActivityClick, enabled, zoom, allPositions }) {
  const clustererRef = useRef(null)
  const markersRef = useRef([])
  const markerDataRef = useRef([])
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const positionsRef = useRef(allPositions)
  positionsRef.current = allPositions

  // Pins bei Zoom-/Dichte-Änderung live skalieren (ohne Marker neu zu bauen)
  useEffect(() => {
    applyPinScales(markerDataRef.current, allPositions, zoom)
  }, [zoom, allPositions])

  useEffect(() => {
    if (!map || !enabled || !window.google?.maps?.marker?.AdvancedMarkerElement) {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers()
        clustererRef.current = null
      }
      markersRef.current.forEach(m => { m.map = null })
      markersRef.current = []
      return
    }

    const newMarkers = activities.map(a => {
      const content = buildActivityPinElement(a.activity_emoji, { zoom: zoomRef.current })
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: a.latitude, lng: a.longitude },
        content,
        gmpClickable: true,
      })
      marker.addListener('gmp-click', () => onActivityClick(a))
      return marker
    })
    markersRef.current = newMarkers
    markerDataRef.current = activities.map((a, i) => ({ marker: newMarkers[i], lat: a.latitude, lng: a.longitude }))
    applyPinScales(markerDataRef.current, positionsRef.current, zoomRef.current)

    const clusterer = new MarkerClusterer({
      map,
      markers: newMarkers,
      renderer: {
        render: ({ count, position }) => {
          return new window.google.maps.marker.AdvancedMarkerElement({
            position,
            content: buildClusterElement(count, C.accentDark),
            zIndex: 50 + count,
          })
        },
      },
    })
    clustererRef.current = clusterer

    return () => {
      clusterer.clearMarkers()
      newMarkers.forEach(m => { m.map = null })
      clustererRef.current = null
      markersRef.current = []
      markerDataRef.current = []
    }
  }, [map, activities, enabled, onActivityClick])
}

// ─── Snapchat-style Zoom Sidebar ─────────────────────────
// Zoom levels 2–20 mapped to emojis like Snapchat's travel modes
const ZOOM_ICONS = [
  { minZoom: 2,  emoji: '🌌', label: 'Weltall'    },
  { minZoom: 4,  emoji: '🌍', label: 'Welt'       },
  { minZoom: 6,  emoji: '🗺️', label: 'Kontinent'  },
  { minZoom: 8,  emoji: '✈️', label: 'Land'       },
  { minZoom: 10, emoji: '🚂', label: 'Region'     },
  { minZoom: 12, emoji: '🚗', label: 'Stadt'      },
  { minZoom: 14, emoji: '🛵', label: 'Viertel'    },
  { minZoom: 16, emoji: '🚶', label: 'Straße'     },
  { minZoom: 18, emoji: '🔍', label: 'Nahansicht' },
]

function getZoomIcon(zoom) {
  let best = ZOOM_ICONS[0]
  for (const z of ZOOM_ICONS) {
    if (zoom >= z.minZoom) best = z
  }
  return best
}

function useSnapchatZoom({ map, minZoom = 2 }) {
  const trackRef     = useRef(null)
  const draggingRef  = useRef(false)
  const startYRef    = useRef(0)
  const startZoomRef = useRef(0)
  const [currentZoom, setCurrentZoom] = useState(10)

  // Sync zoom state when Google Maps changes zoom externally
  useEffect(() => {
    if (!map) return
    const listener = map.addListener('zoom_changed', () => setCurrentZoom(map.getZoom()))
    setCurrentZoom(map.getZoom())
    return () => window.google.maps.event.removeListener(listener)
  }, [map])

  // Global move/up listeners so dragging outside the track still works (PC + Mobile)
  useEffect(() => {
    function move(e) {
      if (!draggingRef.current || !map || !trackRef.current) return
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const dy = startYRef.current - clientY   // up = positive = zoom in
      const trackH = trackRef.current.getBoundingClientRect().height || 220
      const zoomRange = 20 - minZoom
      const delta = (dy / trackH) * zoomRange
      const newZoom = Math.min(20, Math.max(minZoom, startZoomRef.current + delta))
      map.setZoom(Math.round(newZoom))
    }
    function up() { draggingRef.current = false }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend',  up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup',   up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend',  up)
    }
  }, [map, minZoom])

  function onDragStart(e) {
    if (!map) return
    draggingRef.current = true
    startYRef.current   = e.touches ? e.touches[0].clientY : e.clientY
    startZoomRef.current = map.getZoom()
    e.preventDefault?.()
  }

  return { trackRef, currentZoom, onDragStart }
}

// ─── Main Component ───────────────────────────────────────
export default function WorldMapView({ onNavigateToProfile }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    visibleUsers, activities, myProfile,
    loading, createActivity, joinActivity, joinActivityChat, leaveActivity, deleteActivity,
  } = useWorldMap()

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS)

  const [map, setMap] = useState(null)
  const minZoomRef = useRef(2)
  const snapZoom = useSnapchatZoom({ map, minZoom: minZoomRef.current })
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false)
  // Zwei unabhängige Ebenen – beide können gleichzeitig aktiv sein
  const [showGeschwister, setShowGeschwister] = useState(true)
  const [showEvents, setShowEvents] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem(PRIVACY_KEY)) setShowPrivacyBanner(true)
  }, [])

  function closePrivacyBanner() {
    localStorage.setItem(PRIVACY_KEY, '1')
    setShowPrivacyBanner(false)
  }

  const usersForMap = useMemo(() => (showGeschwister ? visibleUsers : []), [showGeschwister, visibleUsers])
  const activitiesForMap = useMemo(() => (showEvents ? activities : []), [showEvents, activities])

  // Alle Pin-Positionen (Personen + Events + eigener Standort) für die
  // dichte-abhängige Skalierung – so bleiben Pins auch in Ballungen erkennbar.
  const allPinPositions = useMemo(() => {
    const arr = []
    usersForMap.forEach(u => arr.push({ lat: u.latitude, lng: u.longitude }))
    activitiesForMap.forEach(a => arr.push({ lat: a.latitude, lng: a.longitude }))
    if (myProfile?.latitude) arr.push({ lat: myProfile.latitude, lng: myProfile.longitude })
    return arr
  }, [usersForMap, activitiesForMap, myProfile?.latitude, myProfile?.longitude])

  const defaultCenter = myProfile?.latitude
    ? { lat: myProfile.latitude, lng: myProfile.longitude }
    : { lat: 51.1657, lng: 10.4515 }
  const defaultZoom = myProfile?.latitude ? 10 : 6

  function handleMapLoad(mapInstance) {
    setMap(mapInstance)
    const container = mapInstance.getDiv()
    const w = container.offsetWidth || window.innerWidth
    const h = container.offsetHeight || window.innerHeight
    const minZ = Math.max(
      Math.ceil(Math.log2(w / 256)),
      Math.ceil(Math.log2(h / 256)),
      2
    )
    minZoomRef.current = minZ
    mapInstance.setOptions({ minZoom: minZ })
  }

  const handleUserClick = useMemo(() => (u) => setSelectedUser(u), [])
  const handleActivityClick = useMemo(() => (a) => setSelectedActivity(a), [])

  useUserClusterer({
    map,
    users: usersForMap,
    onUserClick: handleUserClick,
    enabled: showGeschwister && isLoaded,
    zoom: snapZoom.currentZoom,
    allPositions: allPinPositions,
  })

  useActivityClusterer({
    map,
    activities: activitiesForMap,
    onActivityClick: handleActivityClick,
    enabled: showEvents && isLoaded,
    zoom: snapZoom.currentZoom,
    allPositions: allPinPositions,
  })

  if (loading || !isLoaded) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgSec }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bgSec, overflow: 'hidden' }}>
      <style>{`
        @keyframes oikosPinPulse  { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 0; } }
        /* Radar-Ping: Ring wächst kräftig nach außen und verblasst */
        @keyframes eventPinPulse  { 0% { transform: scale(0.7); opacity: 0.85; } 100% { transform: scale(2.4); opacity: 0; } }
        /* Herzschlag des Event-Pins selbst – fällt sofort ins Auge */
        @keyframes eventPinBeat   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.14); } }
      `}</style>

      {/* Map area */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={defaultCenter}
          zoom={defaultZoom}
          onLoad={handleMapLoad}
          onUnmount={() => setMap(null)}
          options={{
            mapId: DEFAULT_MAP_ID,
            disableDefaultUI: true,
            gestureHandling: 'greedy',
            clickableIcons: false,
            keyboardShortcuts: false,
            minZoom: 2,
            restriction: {
              latLngBounds: { north: 85.051, south: -85.051, west: -180, east: 180 },
              strictBounds: true,
            },
          }}
        >
          {/* Own pin (never clustered, always on top) – immer sichtbar */}
          {myProfile?.latitude && (
            <AdvancedMarker
              map={map}
              position={{ lat: myProfile.latitude, lng: myProfile.longitude }}
              zIndex={9999}
            >
              <OwnPinContent user={myProfile} zoom={snapZoom.currentZoom} allPositions={allPinPositions} />
            </AdvancedMarker>
          )}
        </GoogleMap>

        {/* Two-layer toggle pills – top center */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 501, display: 'flex', gap: 8,
          background: C.surfaceBlur, padding: 5, borderRadius: 999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.10)', backdropFilter: 'blur(8px)',
          border: `1px solid ${C.border}`,
        }}>
          <LayerToggle active={showGeschwister} onClick={() => setShowGeschwister(v => !v)} icon={<Users size={15} />} label="Geschwister" />
          <LayerToggle active={showEvents} onClick={() => setShowEvents(v => !v)} icon={<CalendarDays size={15} />} label="Events" />
        </div>

        {/* Snapchat-style zoom sidebar – right edge, drag up = zoom in */}
        <ZoomSidebar
          snapZoom={snapZoom}
          minZoom={minZoomRef.current}
          onCenterSelf={myProfile?.latitude ? () => {
            if (!map) return
            map.panTo({ lat: myProfile.latitude, lng: myProfile.longitude })
            map.setZoom(13)
          } : null}
        />

        {/* No location hint */}
        {!myProfile?.latitude && (
          <div style={{
            position: 'absolute', bottom: 100, left: 12, right: 72, zIndex: 500,
            background: C.surfaceBlur, borderRadius: 12,
            padding: '10px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>
                Kein Standort gesetzt
              </p>
              <p style={{ fontSize: 11, color: C.textTer, margin: '1px 0 0' }}>
                Füge einen Standort im Profil hinzu.
              </p>
            </div>
            {onNavigateToProfile && (
              <button onClick={onNavigateToProfile} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Profil
              </button>
            )}
          </div>
        )}

        {/* Create Event FAB */}
        <button
          onClick={() => setShowCreateSheet(true)}
          style={{
            position: 'absolute', bottom: 90, right: 12, zIndex: 500,
            width: 56, height: 56, borderRadius: '50%',
            background: C.accent, border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(90,200,250,0.5)', cursor: 'pointer',
          }}
          title="Event hosten"
        >
          <Plus size={26} />
        </button>

        {/* Privacy banner */}
        {showPrivacyBanner && <PrivacyBanner onClose={closePrivacyBanner} />}
      </div>

      {/* Bottom Sheets */}
      {selectedUser && (
        <UserPinSheet user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
      {selectedActivity && (
        <ActivitySheet
          activity={selectedActivity}
          currentUserId={user?.id}
          onClose={() => setSelectedActivity(null)}
          onJoin={joinActivity}
          onJoinChat={joinActivityChat}
          onLeave={leaveActivity}
          onDelete={(id) => { deleteActivity(id); setSelectedActivity(null) }}
        />
      )}
      {showCreateSheet && (
        <CreateActivitySheet
          myProfile={myProfile}
          onClose={() => setShowCreateSheet(false)}
          onSubmit={async (data) => {
            const { error, chatError } = await createActivity(data)
            if (!error) {
              if (chatError) {
                showToast('Event erstellt, Chat konnte nicht angelegt werden', 'error')
              } else {
                showToast('Event gehostet 📍')
              }
              setShowCreateSheet(false)
            } else {
              showToast('Fehler beim Erstellen', 'error')
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Layer toggle pill ───────────────────────────────────
function LayerToggle({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 15px', borderRadius: 999, border: 'none',
        background: active ? C.accent : 'transparent',
        color: active ? '#fff' : C.textSec,
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Own Pin Content (React-rendered into AdvancedMarker) ─
function OwnPinContent({ user, zoom, allPositions }) {
  const size = 58
  const borderColor = C.accentDark
  const bg = user?.avatar_url ? 'transparent' : borderColor
  const neighbors = user?.latitude != null
    ? countNeighbors(user.latitude, user.longitude, allPositions || [], zoom)
    : 0
  const scale = pinScale(zoom) * densityScale(neighbors)
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: 'translateY(50%)' }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformOrigin: '50% 50%', transform: `scale(${scale})`,
        transition: 'transform 0.18s ease',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', background: bg,
          border: `3px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: '0 3px 10px rgba(0,0,0,0.22)', cursor: 'pointer',
        }}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          ) : (
            <span style={{ fontSize: Math.floor(size / 3), fontWeight: 700, color: '#fff', userSelect: 'none' }}>
              {getInitials(user?.full_name)}
            </span>
          )}
        </div>
        <div style={{
          position: 'absolute', inset: -5, borderRadius: '50%',
          border: '2px solid rgba(90,200,250,0.6)',
          animation: 'oikosPinPulse 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}

// ─── Snapchat Zoom Sidebar Component ─────────────────────
function ZoomSidebar({ snapZoom, minZoom, onCenterSelf }) {
  const { trackRef, currentZoom, onDragStart } = snapZoom
  const maxZoom = 20
  const zoomRange = maxZoom - minZoom
  const progress = Math.max(0, Math.min(1, (currentZoom - minZoom) / zoomRange))
  const currentIcon = getZoomIcon(currentZoom)

  return (
    <div style={{
      position: 'absolute',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {/* Mein Standort button */}
      {onCenterSelf && (
        <button
          onClick={onCenterSelf}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: C.surfaceBlur,
            border: `1px solid ${C.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.accentDark, padding: 0,
            backdropFilter: 'blur(6px)',
          }}
          title="Zu meinem Standort"
        >
          <Navigation size={17} />
        </button>
      )}

      {/* Current zoom emoji – no label */}
      <div style={{ fontSize: 22, lineHeight: 1, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}>
        {currentIcon.emoji}
      </div>

      {/* Drag track – schmaler & länger, global mouse/touch listeners handle the drag */}
      <div
        ref={trackRef}
        style={{
          width: 22,
          height: 320,
          borderRadius: 11,
          background: C.surfaceBlur,
          border: `1px solid ${C.border}`,
          boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
          backdropFilter: 'blur(8px)',
          position: 'relative',
          touchAction: 'none',
          cursor: 'ns-resize',
          overflow: 'hidden',
        }}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
      >
        {/* Filled bar – grows from bottom as you zoom in */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: `${progress * 100}%`,
          background: `linear-gradient(to top, ${C.accentDark}, ${C.accent})`,
          borderRadius: 11,
        }} />

        {/* Thumb knob */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: `calc(${progress * 100}% - 11px)`,
          transform: 'translateX(-50%)',
          width: 22, height: 22,
          borderRadius: '50%',
          background: C.bg,
          border: `2.5px solid ${C.accent}`,
          boxShadow: '0 2px 8px rgba(90,200,250,0.4)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}

const mapBtnStyle = {
  width: 40, height: 40, borderRadius: 12,
  background: C.surfaceBlur, border: `1px solid ${C.border}`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: C.accentDark, padding: 0,
}
