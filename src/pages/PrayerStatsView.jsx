import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { usePrayerStats } from '../hooks/usePrayerStats'

// ─── Helpers ──────────────────────────────────────────────────
function formatSeconds(secs) {
  if (!secs || secs < 60) return `${secs || 0} Sek.`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m > 0 ? m + 'min' : ''}`.trim()
  return `${m} Minuten`
}

function formatAvgSecs(secs) {
  if (!secs || secs < 60) return `${secs || 0} Sek.`
  return `${Math.floor(secs / 60)} Minuten`
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', mb = 0 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 8,
      backgroundColor: 'var(--color-warm-4)',
      animation: 'pulse 1.5s ease-in-out infinite',
      marginBottom: mb,
    }} />
  )
}

// ─── Stat Tile ────────────────────────────────────────────────
function StatTile({ icon, value, label }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-white)',
      borderRadius: 16, padding: '16px 14px',
      boxShadow: '0 2px 8px rgba(58,46,36,0.06)',
      border: '1px solid var(--color-warm-3)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 28, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
        {label}
      </p>
    </div>
  )
}

// ─── Weekly Bar Chart ─────────────────────────────────────────
function WeeklyBarChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
      {data.map(({ date, day, count, isToday }) => (
        <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: '100%',
            height: Math.max((count / max) * 68, count > 0 ? 5 : 2),
            backgroundColor: isToday ? '#D4A853' : count > 0 ? '#C8956A' : 'var(--color-warm-3)',
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.4s ease',
          }} />
          <span style={{
            fontFamily: 'Lora, serif', fontSize: 10,
            color: isToday ? '#C8956A' : 'var(--color-text-muted)',
            fontWeight: isToday ? 700 : 400,
          }}>
            {day}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────
function CategoryChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
        Noch keine Kategorien zugewiesen
      </p>
    )
  }

  if (data.length === 1) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <span style={{ fontSize: 20 }}>{data[0].emoji}</span>
        <span style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', fontWeight: 600 }}>
          {data[0].name} ({data[0].count})
        </span>
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.count, 0)

  // Build conic gradient
  let parts = []
  let cumulative = 0
  for (const d of data) {
    const pct = (d.count / total) * 100
    parts.push(`${d.color} ${cumulative.toFixed(1)}% ${(cumulative + pct).toFixed(1)}%`)
    cumulative += pct
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      {/* Donut */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: `conic-gradient(${parts.join(', ')})`,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 64, height: 64, borderRadius: '50%',
          backgroundColor: 'var(--color-bg)',
        }} />
      </div>

      {/* Legend */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {data.slice(0, 5).map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: d.color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text)', flex: 1 }}>
              {d.emoji} {d.name}
            </span>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Monthly Answered Bars ────────────────────────────────────
function MonthlyAnsweredChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
        Noch keine erhörten Gebete eingetragen
      </p>
    )
  }

  const max = Math.max(...data.map(d => d.count))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(({ key, label, count }) => (
        <div key={key}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {label}
            </span>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: '#2ECC71' }}>
              {count} erhört
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--color-warm-3)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${(count / max) * 100}%`,
              backgroundColor: '#2ECC71',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-white)',
      borderRadius: 16, padding: '18px 16px',
      marginBottom: 12,
      boxShadow: '0 2px 8px rgba(58,46,36,0.06)',
      border: '1px solid var(--color-warm-3)',
    }}>
      {title && (
        <h3 style={{
          fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
          color: 'var(--color-text)', margin: '0 0 14px',
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

// ─── PrayerStatsView ──────────────────────────────────────────
export default function PrayerStatsView() {
  const navigate = useNavigate()
  const {
    stats,
    weeklyActivity,
    categoryBreakdown,
    monthlyAnswered,
    totalPrayerTime,
    weekPrayerTime,
    monthPrayerTime,
    peopleCount,
    answeredCount,
    encouragement,
    loading,
  } = usePrayerStats()

  const avgSessionTime = stats && totalPrayerTime > 0
    ? Math.round(totalPrayerTime / Math.max(weeklyActivity.filter(d => d.count > 0).length, 1))
    : 0

  const hasEnoughData = stats?.last_prayer_date != null

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      minHeight: '100%',
      paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
      maxWidth: 640,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid var(--color-warm-3)',
        padding: '14px 16px',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Meine Gebetsreise
          </h2>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic' }}>
            Deine persönliche Geschichte mit Gott
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: 16, border: '1px solid var(--color-warm-3)' }}>
                  <Skeleton h={20} w={30} mb={8} />
                  <Skeleton h={32} w={50} mb={6} />
                  <Skeleton h={12} w="70%" />
                </div>
              ))}
            </div>
            {[1, 2].map(i => (
              <div key={i} style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: 18, marginBottom: 12, border: '1px solid var(--color-warm-3)' }}>
                <Skeleton h={16} w={120} mb={12} />
                <Skeleton h={80} />
              </div>
            ))}
          </>
        ) : !hasEnoughData ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🌱</span>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
              Kommt bald
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
              Deine Statistiken erscheinen sobald du deine ersten Gebete eingetragen hast.
            </p>
          </div>
        ) : (
          <>
            {/* Abschnitt 1: Übersicht */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <StatTile icon="🔥" value={stats?.current_streak || 0} label="Tage Streak" />
              <StatTile icon="🙏" value={stats?.total_prayers || weeklyActivity.reduce((s, d) => s + d.count, 0)} label="Gebete gesamt" />
              <StatTile icon="👥" value={peopleCount} label="Menschen gebetet" />
              <StatTile icon="🎉" value={answeredCount} label="Erhörte Gebete" />
            </div>

            {/* Abschnitt 2: Aktivitäts-Diagramm */}
            <SectionCard title="📅 Letzte 7 Tage">
              <WeeklyBarChart data={weeklyActivity} />
            </SectionCard>

            {/* Abschnitt 3: Gebetszeit */}
            {totalPrayerTime > 0 && (
              <SectionCard title="⏱ Gebetszeit">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['Diese Woche', weekPrayerTime],
                    ['Diesen Monat', monthPrayerTime],
                    ['Gesamt', totalPrayerTime],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--color-warm-3)' }}>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</span>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{formatSeconds(val)}</span>
                    </div>
                  ))}
                  {avgSessionTime > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)' }}>⌀ Pro Gebetszeit</span>
                      <span style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{formatAvgSecs(avgSessionTime)}</span>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Abschnitt 4: Kategorien */}
            {categoryBreakdown.length > 0 && (
              <SectionCard title="🏷 Kategorien">
                <CategoryChart data={categoryBreakdown} />
              </SectionCard>
            )}

            {/* Abschnitt 5: Erhörte Gebete pro Monat */}
            {monthlyAnswered.length > 0 && (
              <SectionCard title="🎉 Erhörte Gebete">
                <MonthlyAnsweredChart data={monthlyAnswered} />
              </SectionCard>
            )}

            {/* Abschnitt 6: Ermutigungs-Karte */}
            <div style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: 16, padding: '18px 16px',
              marginBottom: 12,
            }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💛 Für dich
              </p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: '#78350F', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                „{encouragement}"
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  )
}
