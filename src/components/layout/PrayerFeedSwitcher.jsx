import { useNavigate } from 'react-router-dom'

/**
 * Top tab switch shared between the Gebete (/prayer) and Feed (/friends?tab=feed)
 * pages. Babyblau underline on the active tab.
 */
export default function PrayerFeedSwitcher({ active }) {
  const navigate = useNavigate()

  const tabs = [
    { key: 'feed',        label: '📰 Feed',          target: '/friends?tab=feed' },
    { key: 'prayer',      label: '🙏 Gebete',         target: '/prayer' },
    { key: 'gebet-paul',  label: '✨ Gebet (Paul)',   target: '/gebet-paul' },
  ]

  return (
    <div
      className="flex items-center"
      style={{
        gap: 0,
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {tabs.map(t => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => navigate(t.target)}
            className="flex-1"
            style={{
              padding: '12px 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: -1,
              letterSpacing: '-0.01em',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
