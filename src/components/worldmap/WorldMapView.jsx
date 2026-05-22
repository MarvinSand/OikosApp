import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { Plus, Navigation, ZoomIn, ZoomOut, X, ChevronRight } from 'lucide-react'
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

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Pin DOM builders ────────────────────────────────────
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

function buildActivityClusterElement(count) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#C4974A;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);transform:translate(-50%,-50%);cursor:pointer;'
  const span = document.createElement('span')
  span.style.cssText = 'font-family:Lora,serif;font-size:14px;font-weight:700;color:#fff;'
  span.textContent = String(count)
  wrap.appendChild(span)
  return wrap
}

// ─── Filter Bar ──────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: '📋 Alle' },
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

// ─── Activity List Sheet ──────────────────────────────────
function ActivityListSheet({ activities, onClose, onSelectActivity }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,22,0.4)' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#FBF8F3', borderRadius: '20px 20px 0 0',
        maxHeight: '75%', display: 'flex', flexDirection: 'column',
        animation: 'worldSheetUp 0.25s ease-out',
        boxShadow: '0 -4px 24px rgba(58,46,36,0.15)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D8D2C5', margin: '14px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px 10px', flexShrink: 0, borderBottom: '1px solid #EBE5D9',
        }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700, color: '#2C2416', margin: 0 }}>
            Aktivitäten ({activities.length})
          </p>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A1927F', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 14px', paddingBottom: 'max(16px, calc(80px + env(safe-area-inset-bottom, 0px)))' }}>
          {activities.length === 0 && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#A1927F', textAlign: 'center', padding: '32px 0', fontStyle: 'italic', margin: 0 }}>
              Keine Aktivitäten gefunden
            </p>
          )}
          {activities.map(a => {
            const participantCount = a.participants?.length ?? 0
            const dateStr = a.starts_at
              ? new Date(a.starts_at).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : null
            return (
              <button
                key={a.id}
                onClick={() => { onClose(); onSelectActivity(a) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '11px 10px',
                  background: '#fff', border: '1px solid #EBE5D9',
                  borderRadius: 14, marginBottom: 8, cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: '#FBF8F3', border: '2px solid #C4974A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {a.activity_emoji || '📍'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: '#2C2416', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </p>
                    <span style={{
                      padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                      background: '#EBF2EA', color: '#4A6741',
                      fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600,
                    }}>
                      {a.activity_type}
                    </span>
                  </div>
                  {dateStr && (
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#706351', margin: '0 0 2px' }}>
                      📅 {dateStr}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {a.location_name && (
                      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        📍 {a.location_name}
                      </p>
                    )}
                    <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#A1927F', margin: 0, flexShrink: 0 }}>
                      👥 {participantCount}{a.max_participants ? `/${a.max_participants}` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} color="#A1927F" style={{ flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
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
      <div style={{ width: '100%', background: '#FBF8F3', borderRadius: '20px 20px 0 0', paddingTop: 28, paddingLeft: 20, paddingRight: 20, paddingBottom: 'max(28px, calc(84px + env(safe-area-inset-bottom, 0px)))', boxShadow: '0 -4px 24px rgba(58,46,36,0.15)' }}>
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
            content: buildActivityClusterElement(count),
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
  const [showActivityList, setShowActivityList] = useState(false)
  const [showGeschwister, setShowGeschwister] = useState(false)
  const [geschwisterRadius, setGeschwisterRadius] = useState(50)

  useEffect(() => {
    if (!localStorage.getItem(PRIVACY_KEY)) setShowPrivacyBanner(true)
  }, [])

  function closePrivacyBanner() {
    localStorage.setItem(PRIVACY_KEY, '1')
    setShowPrivacyBanner(false)
  }

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities
    if (filter === 'own') return activities.filter(a => a.author_id === user?.id)
    return activities.filter(a => a.activity_type?.toLowerCase().includes(filter.toLowerCase()))
  }, [activities, filter, user?.id])

  const usersForMap = useMemo(() => {
    if (!showGeschwister) return []
    if (!myProfile?.latitude || !myProfile?.longitude) return visibleUsers
    if (geschwisterRadius >= 300) return visibleUsers
    return visibleUsers.filter(u =>
      haversine(myProfile.latitude, myProfile.longitude, u.latitude, u.longitude) <= geschwisterRadius
    )
  }, [showGeschwister, visibleUsers, myProfile?.latitude, myProfile?.longitude, geschwisterRadius])

  const defaultCenter = myProfile?.latitude
    ? { lat: myProfile.latitude, lng: myProfile.longitude }
    : { lat: 51.1657, lng: 10.4515 }
  const defaultZoom = myProfile?.latitude ? 10 : 6

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
    activities: filteredActivities,
    onActivityClick: handleActivityClick,
    enabled: isLoaded,
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
      <style>{`@keyframes geschwisterPanelDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

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
          {/* Activity pins and user pins are managed imperatively by clusterers */}
        </GoogleMap>

        {/* Filter bar overlay */}
        <FilterBar filter={filter} onFilter={setFilter} />

        {/* Geschwister Toggle Button */}
        <button
          onClick={() => setShowGeschwister(v => !v)}
          style={{
            position: 'absolute', top: 90, right: 10, zIndex: 501,
            padding: '6px 14px', borderRadius: 20, border: 'none',
            background: showGeschwister ? '#4A6741' : 'rgba(255,255,255,0.92)',
            color: showGeschwister ? '#fff' : '#2C2416',
            fontFamily: 'Lora, serif', fontSize: 12,
            fontWeight: showGeschwister ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(58,46,36,0.12)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          👥 Geschwister {showGeschwister && usersForMap.length > 0 ? `(${usersForMap.length})` : ''}
        </button>

        {/* Radius Slider Panel */}
        {showGeschwister && (
          <div style={{
            position: 'absolute', top: 128, left: 10, right: 10, zIndex: 500,
            background: 'rgba(255,255,255,0.97)', borderRadius: 16,
            padding: '12px 16px',
            boxShadow: '0 4px 16px rgba(58,46,36,0.14)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #D8D2C5',
            animation: 'geschwisterPanelDown 0.2s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: '#2C2416' }}>
                Umkreis
              </span>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: '#4A6741' }}>
                {geschwisterRadius >= 300 ? 'Unbegrenzt' : `${geschwisterRadius} km`}
                {' '}
                <span style={{ fontWeight: 400, color: '#A1927F', fontSize: 11 }}>
                  · {usersForMap.length} {usersForMap.length === 1 ? 'Geschwister' : 'Geschwister'}
                </span>
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={geschwisterRadius}
              onChange={e => setGeschwisterRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#4A6741', cursor: 'pointer', display: 'block' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: '#A1927F' }}>5 km</span>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 10, color: '#A1927F' }}>Unbegrenzt</span>
            </div>
            {!myProfile?.latitude && (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: '#E8865A', margin: '8px 0 0', textAlign: 'center' }}>
                Kein Standort gesetzt – alle Geschwister werden angezeigt
              </p>
            )}
          </div>
        )}

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

        {/* Liste Button – bottom center */}
        <button
          onClick={() => setShowActivityList(true)}
          style={{
            position: 'absolute', bottom: 155, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 500, padding: '9px 20px',
            borderRadius: 24, border: 'none',
            background: 'rgba(255,255,255,0.95)',
            color: '#2C2416',
            fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: '0 3px 12px rgba(58,46,36,0.16)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>☰</span>
          Liste ({filteredActivities.length})
        </button>

        {/* Create Activity FAB */}
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

      {/* Nearby section – only shown when Geschwister mode is active */}
      {showGeschwister && nearbyUsers.length > 0 && (
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
      {showActivityList && (
        <ActivityListSheet
          activities={filteredActivities}
          onClose={() => setShowActivityList(false)}
          onSelectActivity={setSelectedActivity}
        />
      )}
    </div>
  )
}

// ─── Own Pin Content (React-rendered into AdvancedMarker) ─
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

const mapBtnStyle = {
  width: 40, height: 40, borderRadius: 12,
  background: '#fff', border: '1px solid #D8D2C5',
  boxShadow: '0 2px 8px rgba(58,46,36,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#4A6741', padding: 0,
}
