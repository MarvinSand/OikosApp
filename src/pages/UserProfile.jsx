import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, UserCheck, UserPlus, Clock, X, MessageCircle, Bell,
  MapPin, Church, Map as MapIcon, Newspaper, HandHeart,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFriendships } from '../hooks/useFriendships'
import { useToast } from '../context/ToastContext'
import { useNotificationPrefs } from '../hooks/useNotificationPrefs'
import { useProfileTabs } from '../hooks/useProfileTabs'
import { countryToFlag, COUNTRIES } from '../lib/countries'
import { Avatar, MapsTab, PostsTab, PrayersTab } from '../components/profile/ProfileTabs'
import ProfileListOverlay from '../components/feed/ProfileListOverlay'

// ─── Helpers ─────────────────────────────────────────────────
function formatLastActive(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const minutes = diff / 60000
  const hours = minutes / 60
  const days = hours / 24
  if (minutes < 60) return 'Gerade aktiv 🟢'
  if (hours < 24) return 'Heute aktiv'
  if (days < 2) return 'Gestern aktiv'
  if (days < 7) return `Vor ${Math.floor(days)} Tagen aktiv`
  return null
}

function isBirthdayToday(birthdayStr) {
  if (!birthdayStr) return false
  const today = new Date()
  const [, m, d] = birthdayStr.split('-')
  return parseInt(m) === today.getMonth() + 1 && parseInt(d) === today.getDate()
}

function formatBirthdayDisplay(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  const d = new Date(2000, parseInt(month) - 1, parseInt(day))
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

// ─── UserProfile (Main) ──────────────────────────────────────
export default function UserProfile() {
  const { id: targetId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { getFriendshipStatus, getFriendship, sendRequest, acceptRequest, declineRequest } = useFriendships()
  const {
    maps, posts, prayerRequests, connectionsCount, publicCommunities,
    loading: tabsLoading, reactToPost,
  } = useProfileTabs(targetId)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [showNotifPrefs, setShowNotifPrefs] = useState(false)
  const [activeTab, setActiveTab] = useState('maps')
  const [overlay, setOverlay] = useState(null) // 'communities' | null
  const { prefs, updatePref } = useNotificationPrefs(targetId)
  const birthdayBannerKey = `birthday_banner_${targetId}_${new Date().toDateString()}`
  const [bannerDismissed, setBannerDismissed] = useState(() => !!localStorage.getItem(birthdayBannerKey))

  useEffect(() => {
    if (user && targetId === user.id) navigate('/profile', { replace: true })
  }, [user, targetId])

  useEffect(() => {
    if (!targetId || !user) return
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, user?.id])

  async function loadProfile() {
    setLoading(true)
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetId).single()
    setProfile(profileData || null)
    setLoading(false)
  }

  async function handleStartChat() {
    setChatLoading(true)
    try {
      const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: targetId })
      if (error) throw error
      navigate(`/chat/${convId}`)
    } catch {
      showToast('Fehler beim Öffnen des Chats', 'error')
    } finally {
      setChatLoading(false)
    }
  }

  async function handleFriendAction() {
    const status = getFriendshipStatus(targetId)
    setActionLoading(true)
    try {
      if (status === 'none') {
        await sendRequest(targetId)
        showToast('Anfrage gesendet ✓')
      } else if (status === 'received') {
        const f = getFriendship(targetId)
        if (f) { await acceptRequest(f.id); showToast('Verbunden ✓') }
      } else if (status === 'sent') {
        const f = getFriendship(targetId)
        if (f) { await declineRequest(f.id); showToast('Anfrage zurückgezogen') }
      }
    } catch (e) {
      showToast(e.message || 'Fehler', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const status = getFriendshipStatus(targetId)
  const hasNotifPrefs = prefs.notify_prayer_requests || prefs.notify_oikos_entries || prefs.notify_prayers_for_oikos || prefs.notify_storyline_entries

  function dismissBanner() {
    localStorage.setItem(birthdayBannerKey, '1')
    setBannerDismissed(true)
  }

  if (loading) {
    return (
      <div className="bg-bg min-h-full">
        <div style={{ padding: 16 }}>
          <div style={{ height: 140, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)' }} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-bg min-h-full">
        <header className="flex items-center gap-2 px-4" style={headerBarStyle}>
          <button onClick={() => navigate(-1)} aria-label="Zurück" style={iconBtnStyle}><ArrowLeft size={20} /></button>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>Nicht gefunden</h2>
        </header>
        <p style={{ padding: 24, fontSize: 14, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
          Dieser Nutzer existiert nicht.
        </p>
      </div>
    )
  }

  const displayName = profile.full_name || profile.username || 'Unbekannt'
  const countryObj = COUNTRIES.find(c => c.code === profile.country)
  const flag = countryObj ? countryToFlag(countryObj.code) : ''
  const cityLabel = [profile.city, countryObj?.name].filter(Boolean).join(' · ')
  const cityVisible = profile.show_city !== false && (cityLabel || flag)
  const churchVisible = profile.show_church !== false && profile.church_name
  const bioVisible = profile.show_bio !== false && (profile.bio_text || profile.bio)
  const bioText = profile.bio_text || profile.bio
  const lastActiveText = profile.show_last_active ? formatLastActive(profile.last_active_at) : null
  const showBirthdayBanner = profile.show_birthday && isBirthdayToday(profile.birthday) && !bannerDismissed

  function FriendButton() {
    if (status === 'friends') return (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 14, color: 'var(--color-text)', fontWeight: 600 }}>
        <UserCheck size={15} /> Verbunden
      </div>
    )
    if (status === 'sent') return (
      <button onClick={handleFriendAction} disabled={actionLoading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'none', fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
        <Clock size={14} /> Ausstehend
      </button>
    )
    if (status === 'received') return (
      <button onClick={handleFriendAction} disabled={actionLoading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <UserCheck size={15} /> Annehmen
      </button>
    )
    return (
      <button onClick={handleFriendAction} disabled={actionLoading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <UserPlus size={15} /> {actionLoading ? '…' : 'Anfragen'}
      </button>
    )
  }

  return (
    <div
      className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full"
      style={{ position: 'relative' }}
    >
      {/* Header bar */}
      <header className="flex items-center justify-between px-4" style={headerBarStyle}>
        <div className="flex items-center gap-1" style={{ minWidth: 0 }}>
          <button onClick={() => navigate(-1)} aria-label="Zurück" style={iconBtnStyle}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            @{profile.username || '…'}
          </h2>
        </div>
        <button
          onClick={() => setShowNotifPrefs(true)}
          aria-label="Benachrichtigungen"
          title="Benachrichtigungen"
          style={{ ...iconBtnStyle, position: 'relative', color: hasNotifPrefs ? 'var(--color-accent)' : 'var(--color-text)' }}
        >
          <Bell size={20} />
          {hasNotifPrefs && (
            <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} />
          )}
        </button>
      </header>

      {/* Geburtstags-Banner */}
      {showBirthdayBanner && (
        <div style={{ margin: '12px 16px 0', padding: '16px', borderRadius: 16, background: 'linear-gradient(135deg, #FFF8E1, #FFECB3)', border: '1.5px solid #F9A825', position: 'relative' }}>
          <button onClick={dismissBanner} aria-label="Schließen" style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'none', cursor: 'pointer', color: '#795548', padding: 4 }}>
            <X size={16} />
          </button>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#795548', margin: '0 0 4px' }}>
            🎂 Heute hat {displayName} Geburtstag!
          </p>
          <p style={{ fontSize: 13, color: '#8D6E63', margin: '0 0 12px' }}>
            Schreib ihm/ihr eine Nachricht
          </p>
          {status === 'friends' && (
            <button onClick={handleStartChat} disabled={chatLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', backgroundColor: '#F9A825', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <MessageCircle size={14} /> Gratulieren
            </button>
          )}
        </div>
      )}

      {/* Profile section */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start gap-4">
          <Avatar profile={profile} />

          {/* Counts (siblings + communities) */}
          <div className="flex-1 flex items-start gap-6">
            <button
              onClick={() => navigate(`/user/${targetId}/connections`)}
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
        {profile.username && (
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
                <MapPin size={13} /> {flag && `${flag} `}{cityLabel}
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

        {/* Birthday + last active */}
        {(profile.show_birthday && profile.birthday || lastActiveText) && (
          <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {profile.show_birthday && profile.birthday && (
              <span>🎂 {formatBirthdayDisplay(profile.birthday)}</span>
            )}
            {profile.show_birthday && profile.birthday && lastActiveText && <span aria-hidden> · </span>}
            {lastActiveText && <span>{lastActiveText}</span>}
          </p>
        )}

        {/* Bio */}
        {bioVisible && (
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {bioText}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
          <FriendButton />
          {status === 'friends' && (
            <button
              onClick={handleStartChat}
              disabled={chatLoading}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'none', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}
            >
              <MessageCircle size={15} /> Nachricht
            </button>
          )}
        </div>
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
              onOpen={(m) => navigate(`/user/${targetId}/map/${m.id}`)}
            />
          )}
          {activeTab === 'posts' && (
            <PostsTab
              posts={posts}
              currentUserId={user?.id}
              onReact={reactToPost}
            />
          )}
          {activeTab === 'prayers' && <PrayersTab prayers={prayerRequests} />}
        </>
      )}

      {/* Communities overlay */}
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

      {/* Notification Preferences Sheet */}
      {showNotifPrefs && (
        <>
          <div onClick={() => setShowNotifPrefs(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', zIndex: 50, padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)', margin: '0 auto 18px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Bell size={18} color="var(--color-accent)" />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Benachrichtigungen für {displayName}
              </h3>
            </div>
            {[
              { field: 'notify_prayer_requests', label: 'Neue Gebetsanliegen', desc: 'Wenn neue Anliegen hinzugefügt werden' },
              { field: 'notify_oikos_entries', label: 'Neue OIKOS-Einträge', desc: 'Wenn Personen zur OIKOS-Map hinzugefügt werden' },
              { field: 'notify_prayers_for_oikos', label: 'Gebetsanliegen für OIKOS', desc: 'Wenn ein neues Gebetsanliegen für eine Person im OIKOS gepostet wird' },
              { field: 'notify_storyline_entries', label: 'Neue Story-Line Einträge', desc: 'Wenn ein neuer Story-Line Eintrag für eine OIKOS-Person hinzugefügt wird' },
            ].map(({ field, label, desc }) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{desc}</p>
                </div>
                <button onClick={() => updatePref(field, !prefs[field])} style={{ width: 44, height: 26, borderRadius: 13, border: 'none', backgroundColor: prefs[field] ? 'var(--color-accent)' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: prefs[field] ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            ))}
            <button onClick={() => setShowNotifPrefs(false)} style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginTop: 20, backgroundColor: 'var(--color-accent)', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Fertig
            </button>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Styles
const headerBarStyle = {
  height: 52,
  borderBottom: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
}
const iconBtnStyle = {
  width: 40,
  height: 40,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: 'var(--color-text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}
