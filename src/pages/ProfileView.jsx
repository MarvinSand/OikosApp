import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings, Camera, MapPin, Church, Map as MapIcon, Newspaper, HandHeart,
  Loader2, Maximize2, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useProfileTabs } from '../hooks/useProfileTabs'
import { useOikosMaps } from '../hooks/useOikosMaps'
import { usePublicMap } from '../hooks/usePublicMap'
import { useToast } from '../context/ToastContext'
import MapCanvas from '../components/map/MapCanvas'
import MapSettingsSheet from '../components/map/MapSettingsSheet'
import ProfileListOverlay from '../components/feed/ProfileListOverlay'
import ConnectionsOverlay from '../components/feed/ConnectionsOverlay'
import { Avatar, MapsTab, PostsTab, PrayersTab } from '../components/profile/ProfileTabs'

// ─── Inline map preview ───────────────────────────────────────
function InlineMapPreview({ ownerId, mapId, onClose, onFullscreen }) {
  const { people, connections, ownerName, loading } = usePublicMap(ownerId, mapId)

  return (
    <div
      style={{
        position: 'relative',
        height: 320,
        margin: '12px',
        borderRadius: 12,
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      {loading ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={22} style={{ color: 'var(--color-text-tertiary)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <MapCanvas
          userName={ownerName}
          people={people}
          connections={connections}
          readOnly
          ownerDisconnectedIds={new Set(people.filter(p => p.owner_disconnected).map(p => p.id))}
        />
      )}

      {/* Close button (top-right) */}
      <button
        onClick={onClose}
        aria-label="Schließen"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text)',
        }}
      >
        <X size={16} />
      </button>

      {/* Fullscreen button (bottom-right) */}
      <button
        onClick={onFullscreen}
        aria-label="Vollbild"
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-accent)',
        }}
      >
        <Maximize2 size={18} />
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function ProfileView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading: profileLoading, uploadAvatar } = useProfile()
  const {
    maps, posts, prayerRequests, connectionsCount, publicCommunities,
    loading: tabsLoading, reload, reactToPost, deletePost,
  } = useProfileTabs(user?.id)
  const { updateMap, deleteMap, createMap } = useOikosMaps()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('maps')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [settingsMap, setSettingsMap] = useState(null)
  const [overlay, setOverlay] = useState(null) // 'siblings' | 'communities' | null

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
      showToast('Profilbild aktualisiert ✓')
    } catch {
      showToast('Fehler beim Hochladen', 'error')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeletePost(postId) {
    if (!window.confirm('Post wirklich löschen?')) return
    await deletePost(postId)
    showToast('Post gelöscht', 'info')
  }

  if (profileLoading) {
    return (
      <div className="bg-bg min-h-full">
        <div style={{ padding: 16 }}>
          <div style={{ height: 140, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)' }} />
        </div>
      </div>
    )
  }

  const cityVisible = profile?.show_city !== false && profile?.city
  const churchVisible = profile?.show_church !== false && profile?.church_name
  const bioVisible = profile?.show_bio !== false && profile?.bio_text
  const displayName = profile?.full_name || profile?.username || '—'

  return (
    <div
      className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full"
      style={{ position: 'relative' }}
    >
      {/* Header bar */}
      <header
        className="flex items-center justify-between px-4"
        style={{
          height: 52,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
          @{profile?.username || '…'}
        </h2>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Einstellungen"
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={22} />
        </button>
      </header>

      {/* Profile section */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar with edit button */}
          <div style={{ position: 'relative' }}>
            <Avatar profile={profile} uploading={avatarUploading} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Profilbild ändern"
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: '2px solid var(--color-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={12} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          {/* Counts (siblings + communities) */}
          <div className="flex-1 flex items-start gap-6">
            <button
              onClick={() => setOverlay('siblings')}
              className="flex flex-col items-center justify-center"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px 4px' }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
                {connectionsCount}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Geschwister
              </span>
            </button>

            <button
              onClick={() => setOverlay('communities')}
              className="flex flex-col items-center justify-center"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px 4px' }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
                {publicCommunities.length}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Communities
              </span>
            </button>
          </div>
        </div>

        {/* Name */}
        <p style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
          {displayName}
        </p>
        {profile?.username && (
          <p style={{ marginTop: 1, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            @{profile.username}
          </p>
        )}

        {/* Location + Church */}
        {(cityVisible || churchVisible) && (
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {cityVisible && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} /> {profile.city}
              </span>
            )}
            {cityVisible && churchVisible && <span aria-hidden> · </span>}
            {churchVisible && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Church size={13} /> {profile.church_name}
              </span>
            )}
          </p>
        )}

        {/* Bio */}
        {bioVisible && (
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: 'var(--color-text)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}
          >
            {profile.bio_text}
          </p>
        )}
      </div>

      {/* Category tabs */}
      <div
        className="flex sticky z-10"
        style={{
          top: 52,
          backgroundColor: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {[
          { key: 'maps',    icon: MapIcon,   label: 'OIKOS Map' },
          { key: 'posts',   icon: Newspaper, label: 'Posts' },
          { key: 'prayers', icon: HandHeart, label: 'Gebete' },
        ].map(t => {
          const isActive = activeTab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex-1"
              style={{
                padding: '10px 0 8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tabsLoading ? (
        <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          Lade…
        </p>
      ) : (
        <>
          {activeTab === 'maps' && (
            <MapsTab
              maps={maps}
              onOpen={(m) => navigate(`/map/${m.id}`)}
              onSettings={setSettingsMap}
              onCreateMap={async () => {
                try {
                  const newMap = await createMap('Meine Map')
                  if (newMap?.id) navigate(`/map/${newMap.id}`)
                } catch {
                  showToast('Fehler beim Erstellen', 'error')
                }
              }}
            />
          )}
          {activeTab === 'posts' && (
            <PostsTab
              posts={posts}
              currentUserId={user?.id}
              onReact={reactToPost}
              onDelete={handleDeletePost}
            />
          )}
          {activeTab === 'prayers' && <PrayersTab prayers={prayerRequests} />}
        </>
      )}

      {settingsMap && (
        <MapSettingsSheet
          map={settingsMap}
          updateMap={updateMap}
          deleteMap={async (id) => { await deleteMap(id); setSettingsMap(null); reload() }}
          onClose={() => { setSettingsMap(null); reload() }}
        />
      )}

      {overlay === 'siblings' && (
        <ConnectionsOverlay onClose={() => setOverlay(null)} />
      )}

      {overlay === 'communities' && (
        <ProfileListOverlay
          title={`Communities (${publicCommunities.length})`}
          items={publicCommunities.map(c => ({
            id: c.id,
            title: c.name,
            subtitle: 'Öffentliche Community',
          }))}
          emptyText="In keiner öffentlichen Community"
          onClose={() => setOverlay(null)}
          onSelect={(it) => {
            setOverlay(null)
            navigate(`/community/${it.id}`)
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
