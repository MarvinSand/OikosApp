import { usePersonPrayerTimeline } from '../../hooks/usePrayerLogs'

function formatDayLabel(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Heute'
  if (dateStr === yesterday) return 'Gestern'
  const [year, month, day] = dateStr.split('-')
  return `${parseInt(day)}. ${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][parseInt(month) - 1]}`
}

export default function PrayerTimeline({ personId, personName }) {
  const { grouped, loading, userId, loadMore } = usePersonPrayerTimeline(personId)
  const days = Object.keys(grouped).sort().reverse()
  const totalLogs = Object.values(grouped).flat().length

  return (
    <div style={{ marginBottom: 32 }}>
      <h4 style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 14 }}>
        Gebetsgeschichte
      </h4>

      {loading ? (
        <div style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : totalLogs === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-light)', fontStyle: 'italic', lineHeight: 1.5 }}>
            Noch niemand hat für {personName} gebetet.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Vertikale Linie */}
          <div style={{ position: 'absolute', left: 7, top: 8, bottom: 0, width: 1, backgroundColor: 'var(--color-warm-3)' }} />

          {days.map(day => (
            <div key={day} style={{ marginBottom: 16 }}>
              {/* Tages-Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: 'var(--color-gold)', flexShrink: 0, zIndex: 1 }} />
                <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {formatDayLabel(day)} ({grouped[day].length})
                </span>
              </div>

              {/* Log-Einträge des Tages */}
              <div style={{ marginLeft: 25, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {grouped[day].map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🙏</span>
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {log.user_id === userId ? 'Du hast' : 'Jemand hat'} für {log.prayer_requests?.title ? `„${log.prayer_requests.title}"` : 'ein Anliegen'} gebetet
                    </span>
                    <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-light)', marginLeft: 'auto', flexShrink: 0 }}>
                      {new Date(log.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {totalLogs >= 30 && (
            <button
              onClick={loadMore}
              style={{ width: '100%', padding: '8px 0', marginTop: 4, border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', fontStyle: 'italic' }}
            >
              Mehr anzeigen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
