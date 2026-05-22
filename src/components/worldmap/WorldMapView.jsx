import { useState, useEffect, useRef, useMemo } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { Plus, Navigation, ZoomIn, ZoomOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useWorldMap } from '../../hooks/useWorldMap'
import { useToast } from '../../context/ToastContext'
import { GOOGLE_MAPS_LOADER_OPTIONS, DEFAULT_MAP_ID } from '../../lib/googleMaps'
import AdvancedMarker from './AdvancedMarker'
import UserPinSheet from './UserPinSheet'
import ActivitySheet from './ActivitySheet'
import CreateActivitySheet from './CreateActivitySheet'

// ─── Utilities ───────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Pin DOM builders (vanilla, used both inside <AdvancedMarker> children and for clusterer markers) ──
function buildUserPinElement(user, { isOwn = false } = {}) {
  const size = isOwn ? 50 : 36
  const isChristian = user.is_christian !== false
  const borderColor = isOwn ? '#C4974A' : (isChristian ? '#4A6741' : '#E8865A')
  const bg = user.avatar_url ? 'transparent' : borderColor
  const initials = getInitials(user.full_name)

  const wrap = document.createElement('div')
  wrap.style.cssText = `position:relative;width:${size}px;height:${size}px;transform:translate(-50%,-50%);`

  const circle = document.createElement('div')
  circle.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${isOwn ? 3 : 2}px solid ${borderColor};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;`

  if (user.avatar_url) {
    const img = document.createElement('img')
    img.src = user.avatar_url
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;'
    img.referrerPolicy = 'no-referrer'
    circle.appendChild(img)
  } else {
    const span = document.createElement('span')
    span.style.cssText = `font-family:Lora,serif;font-size:${Math.floor(size / 3)}px;font-weight:600;color:#fff;user-select:none;`
    span.textContent = initials
    circle.appendChild(span)
  }
  wrap.appendChild(circle)

  if (isOwn) {
    const pulse = document.createElement('div')
    pulse.style.cssText = 'position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(196,151,74,0.6);animation:oikosPinPulse 2s ease-in-out infinite;pointer-events:none;'
    wrap.appendChild(pulse)
  }
  return wrap
}

function buildActivityPinElement(emoji) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#fff;border:2px solid #C4974A;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.18);font-size:20px;cursor:pointer;transform:translate(-50%,-50%);'
  wrap.textContent = emoji || '📍'
  return wrap
}

function buildClusterElement(count) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#4A6741;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);transform:translate(-50%,-50%);'
  const span = document.createElement('span')
  span.style.cssText = 'font-family:Lora,serif;font-size:14px;font-weight:700;color:#fff;'
  span.textContent = String(count)
  wrap.appendChild(span)
  return wrap
}

// ─── Filter Bar ──────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: '👥 Alle' },
  { key: 'Gebetstreffen', label: '🙏 Gebete' },
  { key: 'Bibelstudie', label: '📖 Bibelstudie' },
  { key: 'Evangelisation', label: '📢 Evangelisation' },
  { key: 'Hauskreis', label: '🏠 Hauskreis' },
  { key: 'own', label: '➕ Eigene' },
]

function FilterBar({ filter, onFilter }) {
  return (
    <div style={{
      position: 'absolute', top: 52, left: 0, right: 0, zIndex: 500,
      display: 'flex', gap: 6, padding: '0 10px',
      overflowX: 'auto', scrollbarWidth: 'none',
    }}>
      {FILTERS.map(f => (
        <button
          key={f.key}
          onClick={() => onFilter(f.key)}
          style={{
            padding: '6px 14px', borderRadius: 20, border: 'none',
            background: filter === f.key ? '#4A6741' : 'rgba(255,255,255,0.92)',
            color: filter === f.key ? '#fff' : '#2C2416',
            fontFamily: 'Lora, serif', fontSize: 12,
            fontWeight: filter === f.key ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            boxShadow: '0 2px 6px rgba(58,46,36,0.12)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.15s',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ─── Nearby Christians Section ───────────────────────────
function NearbySection({ users, onUserClick }) {
  return (
    <div style={{
      borderTop: '1px solid #D8D2C5',
      overflowY: 'auto',
      maxHeight: 200,
      padding: '12px 12px 0',
    }}>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: '#2C2416', marginBottom: 10 }}>
        👥 Christen in deiner Nähe
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12 }}>
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => onUserClick(u)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', background: '#fff',
              border: '1px solid #D8D2C5', borderRadius: 12,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: u.avatar_url ? 'transparent' : (u.is_christian !== false ? '#4A6741' : '#E8865A'),
              border: `2px solid ${u.is_christian !== false ? '#4A6741' : '#E8865A'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {u.avatar_url
                ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: '#fff' }}>{getInitials(u.full_name)}</span>
              }
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: '#2C2416', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.full_name || u.username}
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: '1px 0 0' }}>
                {u.city ? `${u.city} · ` : ''}{u.distance < 1 ? '< 1 km' : `${Math.round(u.distance)} km`} entfernt
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Privacy Banner ──────────────────────────────────────
const PRIVACY_KEY = 'oikos_worldmap_privacy_seen'

function PrivacyBanner({ onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 600, background: 'rgba(44,36,22,0.5)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#FBF8F3', borderRadius: '20px 20px 0 0', padding: '28px 20px 40px', boxShadow: '0 -4px 24px rgba(58,46,36,0.15)' }}>
        <div style={{ fontSize: 42, textAlign: 'center', marginBottom: 12 }}>🌍</div>
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: '#2C2416', textAlign: 'center', marginBottom: 8 }}>
          Willkommen auf der Weltkarte
        </h3>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#706351', textAlign: 'center', lineHeight: 1.65, marginBottom: 22 }}>
          Hier siehst du Christen und Aktivitäten in deiner Nähe. Dein Standort wird anderen nur angezeigt, wenn du das in deinen Profil-Einstellungen aktivierst. Die Anzeige erfolgt auf Stadt-Ebene – keine genaue Adresse.
        </p>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 14, background: '#4A6741', color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Verstanden ✓
        </button>
      </div>
    </div>
  )
}

// ─── User-pin clusterer effect (imperative because clusterer manages marker.map) ──
function useUserClusterer({ map, users, onUserClick, enabled }) {
  const clustererRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!map || !enabled || !window.google?.maps?.marker?.AdvancedMarkerElement) {
      // Tear down any existing clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers()
        clustererRef.current = null
      }
      markersRef.current.forEach(m => { m.map = null })
      markersRef.current = []
      return
    }

    // Build markers
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

    // Build clusterer with custom renderer
    const clusterer = new MarkerClusterer({
      map,
      markers: newMarkers,
      renderer: {
        render: ({ count, position }) => {
          return new window.google.maps.marker.AdvancedMarkerElement({
            position,
            content: buildClusterElement(count),
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

// ─── Main Component ───────────────────────────────────────
export default function WorldMapView({ onNavigateToProfile }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    visibleUsers, activities, nearbyUsers, myProfile,
    loading, createActivity, joinActivity, joinActivityChat, leaveActivity, deleteActivity,
  } = useWorldMap()

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS)

  const [map, setMap] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(PRIVACY_KEY)) setShowPrivacyBanner(true)
  }, [])

  function closePrivacyBanner() {
    localStorage.setItem(PRIVACY_KEY, '1')
    setShowPrivacyBanner(false)
  }

  const showUsers = filter === 'all'
  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities
    if (filter === 'own') return activities.filter(a => a.author_id === user?.id)
    return activities.filter(a => a.activity_type?.toLowerCase().includes(filter.toLowerCase()))
  }, [activities, filter, user?.id])

  const defaultCenter = myProfile?.latitude
    ? { lat: myProfile.latitude, lng: myProfile.longitude }
    : { lat: 51.1657, lng: 10.4515 }
  const defaultZoom = myProfile?.latitude ? 10 : 6

  // Cluster other users (memoize handler so the effect doesn't re-run unnecessarily)
  const handleUserClick = useMemo(() => (u) => setSelectedUser(u), [])
  useUserClusterer({
    map,
    users: showUsers ? visibleUsers : [],
    onUserClick: handleUserClick,
    enabled: showUsers && isLoaded,
  })

  if (loading || !isLoaded) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F3EC' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #D8D2C5', borderTopColor: '#4A6741', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F3EC', overflow: 'hidden' }}>
      {/* Map area */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={defaultCenter}
          zoom={defaultZoom}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          options={{
            mapId: DEFAULT_MAP_ID,
            disableDefaultUI: true,
            gestureHandling: 'greedy',
            clickableIcons: false,
            keyboardShortcuts: false,
          }}
        >
          {/* Own pin (never clustered, always on top) */}
          {myProfile?.latitude && (
            <AdvancedMarker
              map={map}
              position={{ lat: myProfile.latitude, lng: myProfile.longitude }}
              zIndex={9999}
            >
              <OwnPinContent user={myProfile} />
            </AdvancedMarker>
          )}

          {/* Activity pins (not clustered) */}
          {filteredActivities.map(a => (
            <AdvancedMarker
              key={a.id}
              map={map}
              position={{ lat: a.latitude, lng: a.longitude }}
              onClick={() => setSelectedActivity(a)}
            >
              <ActivityPinContent emoji={a.activity_emoji} />
            </AdvancedMarker>
          ))}
          {/* Other user pins are managed imperatively by useUserClusterer */}
        </GoogleMap>

        {/* Filter bar overlay */}
        <FilterBar filter={filter} onFilter={setFilter} />

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
          <button onClick={() => map && map.setZoom(map.getZoom() - 1)} style={mapBtnStyle} title="Verkleinern"><ZoomOut size={17} /></button>
        </div>

        {/* No location hint */}
        {!myProfile?.latitude && (
          <div style={{
            position: 'absolute', bottom: 100, left: 12, right: 72, zIndex: 500,
            background: 'rgba(255,255,255,0.95)', borderRadius: 12,
            padding: '10px 12px', boxShadow: '0 2px 10px rgba(58,46,36,0.12)',
            border: '1px solid #D8D2C5', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: '#2C2416', margin: 0 }}>
                Kein Standort gesetzt
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: '1px 0 0' }}>
                Füge einen Standort im Profil hinzu.
              </p>
            </div>
            {onNavigateToProfile && (
              <button onClick={onNavigateToProfile} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#4A6741', color: '#fff', fontFamily: 'Lora, serif', fontSize: 11, cursor: 'pointer' }}>
                Profil
              </button>
            )}
          </div>
        )}

        {/* Create Activity FAB – bottom offset accounts for mobile BottomNav (~70px) */}
        <button
          onClick={() => setShowCreateSheet(true)}
          style={{
            position: 'absolute', bottom: 90, right: 12, zIndex: 500,
            width: 52, height: 52, borderRadius: '50%',
            background: '#4A6741', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(74,103,65,0.4)', cursor: 'pointer',
          }}
          title="Aktivität erstellen"
        >
          <Plus size={24} />
        </button>

        {/* Privacy banner */}
        {showPrivacyBanner && <PrivacyBanner onClose={closePrivacyBanner} />}
      </div>

      {/* Nearby section */}
      {nearbyUsers.length > 0 && filter === 'all' && (
        <NearbySection users={nearbyUsers} onUserClick={setSelectedUser} />
      )}

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
                showToast('Aktivität gepostet, Chat konnte nicht angelegt werden', 'error')
              } else {
                showToast('Aktivität gepostet 📍')
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

// ─── Pin Content Components (React-rendered into AdvancedMarker.children) ──
function OwnPinContent({ user }) {
  const size = 50
  const borderColor = '#C4974A'
  const bg = user?.avatar_url ? 'transparent' : borderColor
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: 'translate(-50%, -50%)' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: bg,
        border: `3px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer',
      }}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        ) : (
          <span style={{ fontFamily: 'Lora, serif', fontSize: Math.floor(size / 3), fontWeight: 600, color: '#fff', userSelect: 'none' }}>
            {getInitials(user?.full_name)}
          </span>
        )}
      </div>
      <div style={{
        position: 'absolute', inset: -5, borderRadius: '50%',
        border: '2px solid rgba(196,151,74,0.6)',
        animation: 'oikosPinPulse 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

function ActivityPinContent({ emoji }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', background: '#fff',
      border: '2px solid #C4974A', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.18)', fontSize: 20, cursor: 'pointer',
      transform: 'translate(-50%, -50%)',
    }}>
      {emoji || '📍'}
    </div>
  )
}

const mapBtnStyle = {
  width: 40, height: 40, borderRadius: 12,
  background: '#fff', border: '1px solid #D8D2C5',
  boxShadow: '0 2px 8px rgba(58,46,36,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#4A6741', padding: 0,
}
