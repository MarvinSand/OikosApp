import { useState, useEffect, useRef, useMemo } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { Plus, Navigation, ZoomIn, ZoomOut, Users, CalendarDays } from 'lucide-react'
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
  accent: '#5AC8FA',
  accentDark: '#0A84FF',
  accentLight: '#E5F6FE',
  text: '#000000',
  textSec: '#6E6E73',
  textTer: '#AEAEB2',
  border: '#E5E5EA',
  bg: '#FFFFFF',
  bgSec: '#F5F5F7',
  error: '#FF3B30',
}

// ─── Utilities ───────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Pin DOM builders ────────────────────────────────────
function buildUserPinElement(user, { isOwn = false } = {}) {
  const size = isOwn ? 50 : 38
  const borderColor = isOwn ? C.accentDark : C.accent
  const bg = user.avatar_url ? 'transparent' : borderColor
  const initials = getInitials(user.full_name)

  const wrap = document.createElement('div')
  wrap.style.cssText = `position:relative;width:${size}px;height:${size}px;transform:translateY(50%);`

  const circle = document.createElement('div')
  circle.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${isOwn ? 3 : 2}px solid ${borderColor};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.18);cursor:pointer;`

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
  wrap.appendChild(circle)

  if (isOwn) {
    const pulse = document.createElement('div')
    pulse.style.cssText = 'position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(90,200,250,0.6);animation:oikosPinPulse 2s ease-in-out infinite;pointer-events:none;'
    wrap.appendChild(pulse)
  }
  return wrap
}

function buildActivityPinElement(emoji) {
  const wrap = document.createElement('div')
  wrap.style.cssText = `width:44px;height:44px;border-radius:50%;background:#fff;border:2px solid ${C.accent};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.16);font-size:20px;cursor:pointer;transform:translateY(50%);`
  wrap.textContent = emoji || '📍'
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
function useUserClusterer({ map, users, onUserClick, enabled }) {
  const clustererRef = useRef(null)
  const markersRef = useRef([])

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

    const newMarkers = users.map(u => {
      const content = buildUserPinElement(u, { isOwn: false })
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: u.latitude, lng: u.longitude },
        content,
        gmpClickable: true,
      })
      marker.addListener('gmp-click', () => onUserClick(u))
      return marker
    })
    markersRef.current = newMarkers

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
    }
  }, [map, users, enabled, onUserClick])
}

// ─── Activity-pin clusterer ───────────────────────────────
function useActivityClusterer({ map, activities, onActivityClick, enabled }) {
  const clustererRef = useRef(null)
  const markersRef = useRef([])

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
      const content = buildActivityPinElement(a.activity_emoji)
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: a.latitude, lng: a.longitude },
        content,
        gmpClickable: true,
      })
      marker.addListener('gmp-click', () => onActivityClick(a))
      return marker
    })
    markersRef.current = newMarkers

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
    }
  }, [map, activities, enabled, onActivityClick])
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
  })

  useActivityClusterer({
    map,
    activities: activitiesForMap,
    onActivityClick: handleActivityClick,
    enabled: showEvents && isLoaded,
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
      <style>{`@keyframes oikosPinPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 0; } }`}</style>

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
          {/* Own pin (never clustered, always on top) */}
          {myProfile?.latitude && showGeschwister && (
            <AdvancedMarker
              map={map}
              position={{ lat: myProfile.latitude, lng: myProfile.longitude }}
              zIndex={9999}
            >
              <OwnPinContent user={myProfile} />
            </AdvancedMarker>
          )}
        </GoogleMap>

        {/* Two-layer toggle pills – top center */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 501, display: 'flex', gap: 8,
          background: 'rgba(255,255,255,0.92)', padding: 5, borderRadius: 999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.10)', backdropFilter: 'blur(8px)',
          border: `1px solid ${C.border}`,
        }}>
          <LayerToggle active={showGeschwister} onClick={() => setShowGeschwister(v => !v)} icon={<Users size={15} />} label="Geschwister" />
          <LayerToggle active={showEvents} onClick={() => setShowEvents(v => !v)} icon={<CalendarDays size={15} />} label="Events" />
        </div>

        {/* Custom map controls */}
        <div style={{ position: 'absolute', bottom: 160, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 500 }}>
          {myProfile?.latitude && (
            <button
              onClick={() => {
                if (!map) return
                map.panTo({ lat: myProfile.latitude, lng: myProfile.longitude })
                map.setZoom(12)
              }}
              style={mapBtnStyle}
              title="Zu meinem Standort"
            >
              <Navigation size={17} />
            </button>
          )}
          <button onClick={() => map && map.setZoom(map.getZoom() + 1)} style={mapBtnStyle} title="Vergrößern"><ZoomIn size={17} /></button>
          <button onClick={() => map && map.setZoom(Math.max(map.getZoom() - 1, minZoomRef.current))} style={mapBtnStyle} title="Verkleinern"><ZoomOut size={17} /></button>
        </div>

        {/* No location hint */}
        {!myProfile?.latitude && (
          <div style={{
            position: 'absolute', bottom: 100, left: 12, right: 72, zIndex: 500,
            background: 'rgba(255,255,255,0.96)', borderRadius: 12,
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
function OwnPinContent({ user }) {
  const size = 50
  const borderColor = C.accentDark
  const bg = user?.avatar_url ? 'transparent' : borderColor
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: 'translateY(50%)' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: bg,
        border: `3px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer',
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
  )
}

const mapBtnStyle = {
  width: 40, height: 40, borderRadius: 12,
  background: '#fff', border: `1px solid ${C.border}`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: C.accentDark, padding: 0,
}
