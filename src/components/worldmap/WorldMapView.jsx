import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Plus, Navigation, ZoomIn, ZoomOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useWorldMap } from '../../hooks/useWorldMap'
import { useToast } from '../../context/ToastContext'
import UserPinSheet from './UserPinSheet'
import ActivitySheet from './ActivitySheet'
import CreateActivitySheet from './CreateActivitySheet'

// ─── Utilities ───────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Custom Marker Icons ─────────────────────────────────
function createUserIcon(avatarUrl, initials, isOwn, isChristian) {
  const size = isOwn ? 50 : 36
  const borderColor = isOwn ? '#C4974A' : (isChristian !== false ? '#4A6741' : '#E8865A')
  const bg = avatarUrl ? 'transparent' : borderColor

  const imgOrInitials = avatarUrl
    ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="font-family:Lora,serif;font-size:${Math.floor(size / 3)}px;font-weight:600;color:#fff;user-select:none;">${initials}</span>`

  const pulseRing = isOwn
    ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(196,151,74,0.6);animation:oikosPinPulse 2s ease-in-out infinite;pointer-events:none;"></div>`
    : ''

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${isOwn ? 3 : 2}px solid ${borderColor};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;">
          ${imgOrInitials}
        </div>
        ${pulseRing}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

function createActivityIcon(emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="width:44px;height:44px;border-radius:50%;background:#fff;border:2px solid #C4974A;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.18);font-size:20px;cursor:pointer;">${emoji || '📍'}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
  })
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount()
  return L.divIcon({
    className: '',
    html: `<div style="width:44px;height:44px;border-radius:50%;background:#4A6741;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);"><span style="font-family:Lora,serif;font-size:14px;font-weight:700;color:#fff;">${count}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
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

// ─── Main Component ───────────────────────────────────────
export default function WorldMapView({ onNavigateToProfile }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    visibleUsers, activities, nearbyUsers, myProfile,
    loading, createActivity, joinActivity, joinActivityChat, leaveActivity, deleteActivity,
  } = useWorldMap()

  const mapRef = useRef(null)
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
  const filteredActivities = (() => {
    if (filter === 'all') return activities
    if (filter === 'own') return activities.filter(a => a.author_id === user?.id)
    return activities.filter(a => a.activity_type?.toLowerCase().includes(filter.toLowerCase()))
  })()

  const defaultCenter = myProfile?.latitude ? [myProfile.latitude, myProfile.longitude] : [51.1657, 10.4515]
  const defaultZoom = myProfile?.latitude ? 10 : 6

  if (loading) {
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
        <MapContainer
          ref={mapRef}
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />

          {/* Own pin */}
          {myProfile?.latitude && (
            <Marker
              position={[myProfile.latitude, myProfile.longitude]}
              icon={createUserIcon(myProfile.avatar_url, getInitials(myProfile.full_name), true, true)}
              zIndexOffset={1000}
            >
              <Popup>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 13 }}>Das bist du 📍</span>
              </Popup>
            </Marker>
          )}

          {/* Other user pins */}
          {showUsers && visibleUsers.length > 0 && (
            <MarkerClusterGroup
              iconCreateFunction={createClusterIcon}
              chunkedLoading
              maxClusterRadius={50}
            >
              {visibleUsers.map(u => (
                <Marker
                  key={u.id}
                  position={[u.latitude, u.longitude]}
                  icon={createUserIcon(u.avatar_url, getInitials(u.full_name), false, u.is_christian)}
                  eventHandlers={{ click: () => setSelectedUser(u) }}
                />
              ))}
            </MarkerClusterGroup>
          )}

          {/* Activity pins */}
          {filteredActivities.map(a => (
            <Marker
              key={a.id}
              position={[a.latitude, a.longitude]}
              icon={createActivityIcon(a.activity_emoji)}
              eventHandlers={{ click: () => setSelectedActivity(a) }}
            />
          ))}
        </MapContainer>

        {/* Filter bar overlay */}
        <FilterBar filter={filter} onFilter={setFilter} />

        {/* Custom map controls */}
        <div style={{ position: 'absolute', bottom: 160, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 500 }}>
          {myProfile?.latitude && (
            <button
              onClick={() => mapRef.current?.flyTo([myProfile.latitude, myProfile.longitude], 12, { duration: 1 })}
              style={mapBtnStyle}
              title="Zu meinem Standort"
            >
              <Navigation size={17} />
            </button>
          )}
          <button onClick={() => mapRef.current?.zoomIn()} style={mapBtnStyle} title="Vergrößern"><ZoomIn size={17} /></button>
          <button onClick={() => mapRef.current?.zoomOut()} style={mapBtnStyle} title="Verkleinern"><ZoomOut size={17} /></button>
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
            const { error } = await createActivity(data)
            if (!error) {
              showToast('Aktivität gepostet 📍')
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

const mapBtnStyle = {
  width: 40, height: 40, borderRadius: 12,
  background: '#fff', border: '1px solid #D8D2C5',
  boxShadow: '0 2px 8px rgba(58,46,36,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#4A6741', padding: 0,
}
