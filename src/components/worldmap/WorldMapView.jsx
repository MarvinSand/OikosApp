import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { Plus, Navigation } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useWorldMap, haversine } from '../../hooks/useWorldMap'
import { useToast } from '../../context/ToastContext'
import { GOOGLE_MAPS_LOADER_OPTIONS, DEFAULT_MAP_ID } from '../../lib/googleMaps'
import AdvancedMarker from './AdvancedMarker'
import UserPinSheet from './UserPinSheet'
import ActivitySheet from './ActivitySheet'
import CreateActivitySheet from './CreateActivitySheet'
import MapDrawer, { DRAWER_PEEK } from './MapDrawer'

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

// Wendet einheitlichen Zoom-Maßstab auf alle Pin-Scale-Layer an.
function applyPinScales(markers, zoom) {
  const k = pinScale(zoom)
  for (const m of markers) {
    const layer = m.content?.querySelector?.('[data-pin-scale]')
    if (layer) layer.style.transform = `scale(${k})`
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

// participants = array of { profile: { avatar_url, full_name } }
function buildActivityPinElement(emoji, participants, { zoom } = {}) {
  const size = 58
  const radius = '34%'  // abgerundetes Quadrat (squircle)

  const wrap = document.createElement('div')
  // Etwas höher als size, damit kleine Teilnehmer-Avatare unten noch Platz haben
  wrap.style.cssText = `position:relative;width:${size}px;height:${size + 18}px;transform:translateY(calc(50% - 9px));cursor:pointer;`

  // Skalierungs-Layer fürs haptische Zoom-Verhalten
  const scaleLayer = document.createElement('div')
  scaleLayer.dataset.pinScale = '1'
  scaleLayer.style.cssText = `position:relative;width:${size}px;height:${size}px;transform-origin:50% 50%;transform:scale(${pinScale(zoom)});transition:transform 0.18s ease;`

  // Drei gestaffelte Radar-Ping-Ringe → starkes, auffälliges Pulsieren
  ;[0, 0.6, 1.2].forEach(delay => {
    const ring = document.createElement('div')
    ring.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:rgba(90,200,250,0.35);border:2px solid rgba(90,200,250,0.55);animation:eventPinPulse 1.8s ease-out ${delay}s infinite;pointer-events:none;`
    scaleLayer.appendChild(ring)
  })

  // Event-Quadrat selbst – schlägt wie ein Herzschlag
  const square = document.createElement('div')
  square.style.cssText = `position:absolute;inset:4px;border-radius:${radius};background:${C.accent};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(90,200,250,0.7);font-size:24px;transform-origin:50% 50%;animation:eventPinBeat 1.2s ease-in-out infinite;`
  square.textContent = emoji || '📍'
  scaleLayer.appendChild(square)
  wrap.appendChild(scaleLayer)

  // Kleine Teilnehmer-Avatare als Add-On unter dem Event-Pin (max 3)
  const shown = (participants || []).slice(0, 3)
  if (shown.length > 0) {
    const avatarRow = document.createElement('div')
    const avatarSize = 16
    const overlap = 5
    const rowW = shown.length * avatarSize - (shown.length - 1) * overlap
    avatarRow.style.cssText = `position:absolute;bottom:0;left:${(size - rowW) / 2}px;display:flex;flex-direction:row;pointer-events:none;`
    shown.forEach((p, i) => {
      const profile = p.profile || p
      const av = document.createElement('div')
      av.style.cssText = `width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;border:1.5px solid #fff;overflow:hidden;background:${C.accent};display:flex;align-items:center;justify-content:center;margin-left:${i > 0 ? -overlap : 0}px;box-shadow:0 1px 3px rgba(0,0,0,0.22);`
      if (profile?.avatar_url) {
        const img = document.createElement('img')
        img.src = profile.avatar_url
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;'
        img.referrerPolicy = 'no-referrer'
        av.appendChild(img)
      } else {
        const initEl = document.createElement('span')
        initEl.style.cssText = 'font-size:7px;font-weight:700;color:#fff;'
        initEl.textContent = getInitials(profile?.full_name)
        av.appendChild(initEl)
      }
      avatarRow.appendChild(av)
    })
    wrap.appendChild(avatarRow)
  }

  return wrap
}

// Cluster-Icon: zeigt Personenhaufen, Event-Symbol oder beides
function buildClusterElement(count, isMixed, hasEvent) {
  const wrap = document.createElement('div')
  wrap.style.cssText = `position:relative;width:52px;height:52px;transform:translateY(50%);`

  const bg = isMixed
    ? `linear-gradient(135deg, ${C.accent} 50%, ${C.accentDark} 50%)`
    : hasEvent ? C.accent : C.accentDark

  const circle = document.createElement('div')
  circle.style.cssText = `width:52px;height:52px;border-radius:50%;background:${bg};border:2.5px solid #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.22);gap:1px;`

  // Anzahl
  const num = document.createElement('span')
  num.style.cssText = 'font-size:14px;font-weight:800;color:#fff;line-height:1;'
  num.textContent = String(count)
  circle.appendChild(num)

  // Icon-Zeile: Person + Kalender wenn gemischt, sonst nur eins
  const icons = document.createElement('span')
  icons.style.cssText = 'font-size:9px;color:rgba(255,255,255,0.9);line-height:1;'
  icons.textContent = isMixed ? '👤 📅' : hasEvent ? '📅' : '👤'
  circle.appendChild(icons)

  wrap.appendChild(circle)
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

// ─── Combined pin clusterer (Personen + Events in einem Cluster) ─────────────
// Events bekommen höheren zIndex → übertrumpfen Personen-Pins bei Überlappung.
// Das Cluster-Icon zeigt an, ob nur Personen, nur Events oder beides drin sind.
function useCombinedClusterer({ map, users, activities, onUserClick, onActivityClick, showUsers, showEvents, zoom }) {
  const clustererRef = useRef(null)
  const allMarkersRef = useRef([])
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  // Pins bei Zoom-Änderung live skalieren (ohne Marker neu zu bauen)
  useEffect(() => {
    applyPinScales(allMarkersRef.current, zoom)
  }, [zoom])

  useEffect(() => {
    if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) {
      if (clustererRef.current) { clustererRef.current.clearMarkers(); clustererRef.current = null }
      allMarkersRef.current.forEach(m => { m.map = null })
      allMarkersRef.current = []
      return
    }

    const userMarkers = showUsers ? users.map(u => {
      const content = buildUserPinElement(u, { isOwn: false, zoom: zoomRef.current })
      content.dataset.pinType = 'user'
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: u.latitude, lng: u.longitude },
        content,
        zIndex: 10,
        gmpClickable: true,
      })
      marker.addListener('gmp-click', () => onUserClick(u))
      return marker
    }) : []

    const actMarkers = showEvents ? activities.map(a => {
      const content = buildActivityPinElement(a.activity_emoji, a.participants || [], { zoom: zoomRef.current })
      content.dataset.pinType = 'activity'
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: a.latitude, lng: a.longitude },
        content,
        zIndex: 50,   // Events immer über Personen
        gmpClickable: true,
      })
      marker.addListener('gmp-click', () => onActivityClick(a))
      return marker
    }) : []

    const allMarkers = [...userMarkers, ...actMarkers]
    allMarkersRef.current = allMarkers

    const clusterer = new MarkerClusterer({
      map,
      markers: allMarkers,
      renderer: {
        render: ({ count, position, markers }) => {
          const hasEvent = markers.some(m => m.content?.dataset?.pinType === 'activity')
          const hasUser  = markers.some(m => m.content?.dataset?.pinType === 'user')
          const content  = buildClusterElement(count, hasEvent && hasUser, hasEvent)
          return new window.google.maps.marker.AdvancedMarkerElement({
            position, content, zIndex: 200 + count,
          })
        },
      },
    })
    clustererRef.current = clusterer

    return () => {
      clusterer.clearMarkers()
      allMarkers.forEach(m => { m.map = null })
      clustererRef.current = null
      allMarkersRef.current = []
    }
  }, [map, users, activities, showUsers, showEvents, onUserClick, onActivityClick])
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
  const navigate = useNavigate()
  const { showToast } = useToast()
  const {
    visibleUsers, activities, myProfile,
    loading, createActivity, joinActivity, joinActivityChat, leaveActivity, deleteActivity, updateActivity,
  } = useWorldMap()

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS)

  const [map, setMap] = useState(null)
  const minZoomRef = useRef(2)
  const didInitCenterRef = useRef(false)
  const snapZoom = useSnapchatZoom({ map, minZoom: minZoomRef.current })
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState(null)
  // Merkt sich, ob das aktuell offene Detail (Person/Event) aus der
  // Drawer-Liste heraus geöffnet wurde. Falls ja, springt das Drawer beim
  // Schließen (X) wieder zurück zur vollen Liste statt eingeklappt zu bleiben.
  const openedFromListRef = useRef(false)
  const [reopenListKey, setReopenListKey] = useState(0)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false)
  // Zwei unabhängige Ebenen – beide können gleichzeitig aktiv sein.
  // ?layer=siblings (z.B. von "Auf der Map suchen") → nur Geschwister, keine Events.
  const [searchParams] = useSearchParams()
  const siblingsOnly = searchParams.get('layer') === 'siblings'
  const [showGeschwister, setShowGeschwister] = useState(true)
  const [showEvents, setShowEvents] = useState(!siblingsOnly)
  // Drawer: welcher Inhalt (Geschwister/Events) unten im hochziehbaren Menü angezeigt wird
  const [drawerTab, setDrawerTab] = useState('siblings')
  // Umkreis in km (null = weltweit) – filtert Liste UND Karten-Pins
  const [radiusKm, setRadiusKm] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem(PRIVACY_KEY)) setShowPrivacyBanner(true)
  }, [])

  function closePrivacyBanner() {
    localStorage.setItem(PRIVACY_KEY, '1')
    setShowPrivacyBanner(false)
  }

  const hasOwnLocation = !!(myProfile?.latitude && myProfile?.longitude)

  const usersWithDistance = useMemo(() => {
    if (!hasOwnLocation) return visibleUsers
    return visibleUsers.map(u => ({
      ...u,
      distance: haversine(myProfile.latitude, myProfile.longitude, u.latitude, u.longitude),
    }))
  }, [visibleUsers, hasOwnLocation, myProfile?.latitude, myProfile?.longitude]) // eslint-disable-line react-hooks/exhaustive-deps

  const activitiesWithDistance = useMemo(() => {
    if (!hasOwnLocation) return activities
    return activities.map(a => ({
      ...a,
      distance: haversine(myProfile.latitude, myProfile.longitude, a.latitude, a.longitude),
    }))
  }, [activities, hasOwnLocation, myProfile?.latitude, myProfile?.longitude]) // eslint-disable-line react-hooks/exhaustive-deps

  const usersInRadius = useMemo(
    () => usersWithDistance.filter(u => radiusKm == null || u.distance == null || u.distance <= radiusKm),
    [usersWithDistance, radiusKm]
  )
  const activitiesInRadius = useMemo(
    () => activitiesWithDistance.filter(a => radiusKm == null || a.distance == null || a.distance <= radiusKm),
    [activitiesWithDistance, radiusKm]
  )

  const usersForMap = useMemo(() => (showGeschwister ? usersInRadius : []), [showGeschwister, usersInRadius])
  const activitiesForMap = useMemo(() => (showEvents ? activitiesInRadius : []), [showEvents, activitiesInRadius])

  // Erster Tap wählt die Ebene (und den Drawer-Tab), zweiter Tap auf die
  // bereits ausgewählte Ebene blendet sie aus.
  function handlePillTap(tabKey) {
    if (tabKey === 'siblings') {
      if (!showGeschwister) { setShowGeschwister(true); setDrawerTab('siblings') }
      else if (drawerTab !== 'siblings') setDrawerTab('siblings')
      else { setShowGeschwister(false); if (showEvents) setDrawerTab('events') }
    } else {
      if (!showEvents) { setShowEvents(true); setDrawerTab('events') }
      else if (drawerTab !== 'events') setDrawerTab('events')
      else { setShowEvents(false); if (showGeschwister) setDrawerTab('siblings') }
    }
  }

  function focusOn(lat, lng) {
    if (!map || lat == null || lng == null) return
    map.panTo({ lat, lng })
    if (map.getZoom() < 11) map.setZoom(11)
  }

  // Stabile Identität: nur neu berechnet, wenn sich der eigene Standort ändert –
  // sonst würde der Map-`center`-Prop bei jedem Render (z.B. Zoom) zurückspringen.
  const defaultCenter = useMemo(
    () => (myProfile?.latitude
      ? { lat: myProfile.latitude, lng: myProfile.longitude }
      : { lat: 51.1657, lng: 10.4515 }),
    [myProfile?.latitude, myProfile?.longitude]
  )
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
    // Initial-Position nur EINMAL setzen. Danach bleibt die Karte unkontrolliert,
    // damit Zoomen/Verschieben nicht zum eigenen Standort zurückspringt.
    if (!didInitCenterRef.current) {
      mapInstance.setCenter(defaultCenter)
      mapInstance.setZoom(defaultZoom)
      didInitCenterRef.current = true
    }
  }

  const handleUserClick = useMemo(() => (u) => setSelectedUser(u), [])
  const handleActivityClick = useMemo(() => (a) => setSelectedActivity(a), [])

  useCombinedClusterer({
    map,
    users: visibleUsers,
    activities,
    onUserClick: handleUserClick,
    onActivityClick: handleActivityClick,
    showUsers: showGeschwister && isLoaded,
    showEvents: showEvents && isLoaded,
    zoom: snapZoom.currentZoom,
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
          onLoad={handleMapLoad}
          onUnmount={() => { setMap(null); didInitCenterRef.current = false }}
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
          {myProfile?.latitude && showGeschwister && (
            <AdvancedMarker
              map={map}
              position={{ lat: myProfile.latitude, lng: myProfile.longitude }}
              zIndex={9999}
            >
              <OwnPinContent user={myProfile} zoom={snapZoom.currentZoom} />
            </AdvancedMarker>
          )}
        </GoogleMap>

        {/* Rechter Bedien-Stapel: Zoom-Leiste + "Event hosten"-Button fest
            untereinander mit festem Abstand – überlappen dadurch nie, egal
            wie klein der sichtbare Kartenbereich ist. Bottom-verankert über
            der schwebenden Ebenen-Kapsel statt vertikal zentriert. */}
        <div style={{
          position: 'absolute', right: 12,
          bottom: `calc(var(--bottom-nav-h, 64px) + ${DRAWER_PEEK}px + 14px)`,
          zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <ZoomSidebar
            snapZoom={snapZoom}
            minZoom={minZoomRef.current}
            onCenterSelf={myProfile?.latitude ? () => {
              if (!map) return
              map.panTo({ lat: myProfile.latitude, lng: myProfile.longitude })
              map.setZoom(13)
            } : null}
          />

          {/* Create Event FAB */}
          <button
            onClick={() => setShowCreateSheet(true)}
            style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: C.accent, border: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(90,200,250,0.5)', cursor: 'pointer',
            }}
            title="Event hosten"
          >
            <Plus size={26} />
          </button>
        </div>

        {/* No location hint */}
        {!myProfile?.latitude && (
          <div style={{
            position: 'absolute', bottom: `calc(var(--bottom-nav-h, 64px) + ${DRAWER_PEEK}px + 12px)`, left: 12, right: 80, zIndex: 500,
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
                Hinterlege deine Adresse in den Einstellungen.
              </p>
            </div>
            <button onClick={() => navigate('/settings?section=privacy')} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Standort
            </button>
          </div>
        )}

        {/* Hochziehbares Menü (Google-Maps-Stil) mit Ebenen-Buttons, Suche, Filter & Umkreis */}
        <MapDrawer
          tab={drawerTab}
          showGeschwister={showGeschwister}
          showEvents={showEvents}
          onPillTap={handlePillTap}
          users={usersInRadius}
          activities={activitiesInRadius}
          myProfile={myProfile}
          hasOwnLocation={hasOwnLocation}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          reopenListKey={reopenListKey}
          onSelectUser={(u) => { focusOn(u.latitude, u.longitude); openedFromListRef.current = true; setSelectedUser(u) }}
          onSelectActivity={(a) => { focusOn(a.latitude, a.longitude); openedFromListRef.current = true; setSelectedActivity(a) }}
        />

        {/* Privacy banner */}
        {showPrivacyBanner && <PrivacyBanner onClose={closePrivacyBanner} />}
      </div>

      {/* Bottom Sheets */}
      {selectedUser && (
        <UserPinSheet user={selectedUser} onClose={() => {
          setSelectedUser(null)
          if (openedFromListRef.current) { openedFromListRef.current = false; setReopenListKey(k => k + 1) }
        }} />
      )}
      {selectedActivity && (
        <ActivitySheet
          activity={selectedActivity}
          currentUserId={user?.id}
          onClose={() => {
            setSelectedActivity(null)
            if (openedFromListRef.current) { openedFromListRef.current = false; setReopenListKey(k => k + 1) }
          }}
          onJoin={joinActivity}
          onJoinChat={joinActivityChat}
          onLeave={leaveActivity}
          onDelete={(id) => { deleteActivity(id); setSelectedActivity(null) }}
          onEdit={async (id, updates) => {
            const { error } = await updateActivity(id, updates)
            if (error) { showToast('Änderung fehlgeschlagen', 'error'); return false }
            setSelectedActivity(prev => prev ? { ...prev, ...updates } : prev)
            showToast('Event aktualisiert ✓')
            return true
          }}
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
              console.error('createActivity failed:', error)
              const detail = error.message || error.details || error.hint || error.code || 'Unbekannter Fehler'
              showToast(`Fehler beim Erstellen: ${detail}`, 'error')
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Own Pin Content (React-rendered into AdvancedMarker) ─
function OwnPinContent({ user }) {
  // Gleiche Größe wie Geschwister-Pins; bewusst KEINE Zoom-Skalierung,
  // damit der eigene Pin beim Rauszoomen nicht größer wird.
  const size = 48
  const borderColor = C.accentDark
  const bg = user?.avatar_url ? 'transparent' : borderColor
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: 'translateY(50%)' }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', background: bg,
          border: `3px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: '0 3px 10px rgba(0,0,0,0.25)', cursor: 'pointer',
        }}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          ) : (
            <span style={{ fontSize: Math.floor(size / 3), fontWeight: 700, color: '#fff', userSelect: 'none' }}>
              {getInitials(user?.full_name)}
            </span>
          )}
        </div>
        {/* Markierung: eigener Pin */}
        <div style={{
          position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
          background: C.accentDark, color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1,
          padding: '2px 6px', borderRadius: 999, border: '1.5px solid #fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          Du
        </div>
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
