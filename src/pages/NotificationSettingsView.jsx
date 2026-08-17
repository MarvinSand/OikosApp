import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { useFriendships } from '../hooks/useFriendships'
import { useAllNotificationPrefs } from '../hooks/useAllNotificationPrefs'
import { useEmailNotificationPrefs } from '../hooks/useEmailNotificationPrefs'
import { NOTIFICATION_PREF_FIELDS } from '../lib/notificationPrefFields'
import { NOTIFICATION_TYPE_META } from '../lib/notificationTypeMeta'

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ name, size = 44 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700, border: '1px solid var(--color-border)',
      }}
    >
      {getInitials(name)}
    </div>
  )
}

// Wird für die E-Mail-Sektion angeboten: alle Typen, die tatsächlich beim
// Empfänger landen (Freundschaftsanfragen, Gebete, Erinnerungen, …).
const EMAILABLE_TYPES = Object.keys(NOTIFICATION_TYPE_META)

export default function NotificationSettingsView() {
  const navigate = useNavigate()
  const { friends, loading: friendsLoading } = useFriendships()
  const { getPrefs, loading: prefsLoading } = useAllNotificationPrefs()
  const { emailTypes, loading: emailLoading, toggleType } = useEmailNotificationPrefs()

  const loading = friendsLoading || prefsLoading

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-2"
        style={{
          height: 52, borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
          position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Zurück"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          Benachrichtigungs-Einstellungen
        </h2>
      </header>

      {/* Per E-Mail benachrichtigen */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={15} color="var(--color-accent)" />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Per E-Mail benachrichtigen
          </p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
          Zusätzlich zur Benachrichtigung in der App auch per E-Mail informiert werden.
        </p>
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 12, padding: '2px 14px' }}>
          {EMAILABLE_TYPES.map(type => {
            const meta = NOTIFICATION_TYPE_META[type]
            const enabled = emailTypes.includes(type)
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 15 }}>{meta.icon}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>{meta.label}</span>
                </div>
                <button
                  disabled={emailLoading}
                  onClick={() => toggleType(type, !enabled)}
                  style={{ width: 40, height: 24, borderRadius: 12, border: 'none', backgroundColor: enabled ? 'var(--color-accent)' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: enabled ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Von wem bekomme ich was */}
      <div className="px-4 pt-6">
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px' }}>
          Von wem bekomme ich was
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
          Tippe auf eine Person, um die Einstellungen für sie anzupassen.
        </p>

        {loading && (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Lade…</p>
        )}
        {!loading && friends.length === 0 && (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            Noch keine Geschwister verbunden.
          </p>
        )}
        {!loading && friends.map(f => {
          const prefs = getPrefs(f.otherUser?.id)
          const activeCount = NOTIFICATION_PREF_FIELDS.filter(({ field }) => prefs[field]).length
          return (
            <button
              key={f.id}
              onClick={() => navigate(`/user/${f.otherUser?.id}?openNotifPrefs=1`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 8px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}
            >
              <Avatar name={f.otherUser?.full_name || f.otherUser?.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.otherUser?.full_name || f.otherUser?.username || '—'}
                </p>
                {f.otherUser?.username && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>@{f.otherUser.username}</p>
                )}
              </div>
              <span
                style={{
                  fontSize: 11.5, fontWeight: 700, padding: '4px 9px', borderRadius: 20, flexShrink: 0,
                  backgroundColor: activeCount > 0 ? 'rgba(122,158,126,0.12)' : 'var(--color-bg-secondary)',
                  color: activeCount > 0 ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                }}
              >
                {activeCount}/{NOTIFICATION_PREF_FIELDS.length} aktiv
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
