import { useState } from 'react'
import { useDailyPrayer } from '../../hooks/useDailyPrayer'
import GuidedPrayerMode from '../prayer/GuidedPrayerMode'

// Gebet des Tages – prominent auf der Home-Seite.
export default function DailyPrayerCard() {
  const { daily, participantCount, hasPrayedToday, loading, reload } = useDailyPrayer()
  const [showPrayer, setShowPrayer] = useState(false)

  if (loading) {
    return <div style={{ height: 160, borderRadius: 18, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
  }
  if (!daily) return null

  const prayItems = [{
    type: 'topic',
    request: { id: daily.id, title: daily.title, description: daily.description, icon: daily.icon },
    ampel: null,
  }]

  return (
    <>
      <div style={{
        borderRadius: 18, padding: '20px 20px',
        background: 'linear-gradient(160deg, #1A1208 0%, #2A1B0A 100%)',
        boxShadow: '0 8px 28px rgba(58,46,36,0.22)', position: 'relative', overflow: 'hidden',
      }}>
        {/* dezenter Lichtschein */}
        <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: '#D4A853', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px' }}>
            🕊 Gebet des Tages
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 34, lineHeight: 1 }}>{daily.icon || '🙏'}</span>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: '#F0EDE6', margin: 0, lineHeight: 1.25 }}>
              {daily.title}
            </h2>
          </div>

          {daily.description && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'rgba(240,237,230,0.7)', lineHeight: 1.6, margin: '0 0 12px' }}>
              {daily.description}
            </p>
          )}

          {daily.scripture_text && (
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'rgba(240,237,230,0.55)', fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 16px', borderLeft: '2px solid rgba(212,168,83,0.4)', paddingLeft: 12 }}>
              „{daily.scripture_text}"{daily.scripture_ref ? ` — ${daily.scripture_ref}` : ''}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'rgba(240,237,230,0.6)' }}>
              🙏 {participantCount} {participantCount === 1 ? 'Geschwister betet' : 'Geschwister beten'} heute mit
            </span>
            <button
              onClick={() => setShowPrayer(true)}
              style={{
                flexShrink: 0, padding: '10px 18px', borderRadius: 50, border: 'none',
                backgroundColor: hasPrayedToday ? 'rgba(212,168,83,0.25)' : '#D4A853',
                color: hasPrayedToday ? '#D4A853' : '#1A1208',
                fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {hasPrayedToday ? 'Nochmal beten' : '🙏 Ich bete mit'}
            </button>
          </div>
        </div>
      </div>

      {showPrayer && (
        <GuidedPrayerMode
          items={prayItems}
          dailyPrayerId={daily.id}
          onClose={() => { setShowPrayer(false); reload() }}
        />
      )}
    </>
  )
}
