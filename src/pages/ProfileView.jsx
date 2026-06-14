import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings, Camera, MapPin, Church, Map as MapIcon, Newspaper, HandHeart,
  Lock, Globe, Users as UsersIcon, Home as HomeIcon, Loader2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useProfileTabs } from '../hooks/useProfileTabs'
import { useToast } from '../context/ToastContext'

// ─── Helpers ──────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ profile, size = 80, uploading }) {
  const initials = getInitials(profile?.full_name || profile?.username)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
      {uploading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2 size={24} color="white" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}
    </div>
  )
}

function VisibilityIcon({ visibility }) {
  if (visibility === 'private') return <Lock size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  if (visibility === 'public') return <Globe size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  if (visibility === 'all_siblings') return <UsersIcon size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  if (visibility === 'community') return <HomeIcon size={12} style={{ color: 'var(--color-text-tertiary)' }} />
  return null
}

function POST_TYPE_EMOJI(type) {
  return {
    bible: '📖',
    testimony: '🙌',
    question: '❓',
    photo: '📷',
    text: '💬',
  }[type] || '💬'
}

// ─── Sub-components ───────────────────────────────────────────
function MapsGrid({ maps, ownerId }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isOwn = ownerId === user?.id

  if (maps.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        {isOwn ? 'Noch keine Maps erstellt' : 'Keine Maps verfügbar'}
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 px-3 py-3">
      {maps.map(m => (
        <button
          key={m.id}
          onClick={() => navigate(isOwn ? '/' : `/user/${ownerId}/map/${m.id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 6,
            padding: '14px 12px',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 22 }}>🗺</span>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {m.name}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {m.personCount || 0} {m.personCount === 1 ? 'Person' : 'Personen'}
          </p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
            }}
          >
            <VisibilityIcon visibility={m.visibility} />
            {{
              private: 'Privat',
              all_siblings: 'Geschwister',
              specific_include: 'Geschwister',
              specific_exclude: 'Geschwister',
              community: 'Community',
            }[m.visibility] || 'Privat'}
          </span>
        </button>
      ))}
    </div>
  )
}

function PostsGrid({ posts, isOwn }) {
  const navigate = useNavigate()

  if (posts.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Noch keine Posts
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 px-3 py-3">
      {posts.map(p => (
        <button
          key={p.id}
          onClick={() => navigate(`/feed/post/${p.id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '10px 10px',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            background: 'var(--color-bg)',
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 88,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{POST_TYPE_EMOJI(p.type)}</span>
            {!p.is_public && isOwn && (
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Nur Community</span>
            )}
          </div>
          {p.photo_url && (
            <img src={p.photo_url} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6 }} />
          )}
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {p.title || p.body || p.bible_reference || '…'}
          </p>
        </button>
      ))}
    </div>
  )
}

function PrayerList({ prayers }) {
  if (prayers.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Noch keine Gebetsanliegen geteilt
      </p>
    )
  }
  const active = prayers.filter(p => !p.is_answered)
  const answered = prayers.filter(p => p.is_answered)
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      {active.map(p => (
        <div
          key={p.id}
          style={{
            padding: '12px 14px',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg)',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
            {p.category ? `${p.category} ` : ''}{p.title}
          </p>
          {p.description && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {p.description}
            </p>
          )}
        </div>
      ))}
      {answered.map(p => (
        <div
          key={p.id}
          style={{
            padding: '12px 14px',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg)',
            opacity: 0.7,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)', textDecoration: 'line-through' }}>
              {p.title}
            </p>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
                backgroundColor: 'var(--color-gold-light)',
                color: '#7C5A00',
                flexShrink: 0,
              }}
            >
              ✓ Erhört
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function ProfileView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading: profileLoading, uploadAvatar } = useProfile()
  const { maps, posts, prayerRequests, connectionsCount, loading: tabsLoading } = useProfileTabs(user?.id)
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('maps')
  const [avatarUploading, setAvatarUploading] = useState(false)

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
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
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

          {/* Connections column */}
          <button
            onClick={() => navigate('/profile/connections')}
            className="flex flex-col items-center justify-center"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
              {connectionsCount}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Geschwister
            </span>
          </button>
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
        className="flex"
        style={{
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
          {activeTab === 'maps' && <MapsGrid maps={maps} ownerId={user?.id} />}
          {activeTab === 'posts' && <PostsGrid posts={posts} isOwn />}
          {activeTab === 'prayers' && <PrayerList prayers={prayerRequests} />}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
