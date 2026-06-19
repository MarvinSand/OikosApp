import PrayerFeedSwitcher from '../components/layout/PrayerFeedSwitcher'

export default function GebetPaul() {
  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      <PrayerFeedSwitcher active="gebet-paul" />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          gap: 16,
          color: 'var(--color-text-tertiary)',
        }}
      >
        <span style={{ fontSize: 48 }}>✨</span>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0, textAlign: 'center' }}>
          Gebet (Paul)
        </p>
        <p style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
          Hier ist Platz für deinen Gedanken.
        </p>
      </div>
    </div>
  )
}
