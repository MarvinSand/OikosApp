import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../../i18n'

// Compact month calendar for picking a date range (from / to).
// value: { from: 'YYYY-MM-DD'|null, to: 'YYYY-MM-DD'|null }
// onChange({ from, to }) – first tap sets `from`, second tap sets `to`.

const localeOf = lang => (lang === 'en' ? 'en-US' : 'de-DE')

function toKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function MiniCalendar({ value = {}, onChange }) {
  const { t, lang } = useT()
  const locale = localeOf(lang)
  // Montag-basiert (2024-01-01 war ein Montag)
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 2))
  const initial = value.from ? new Date(value.from) : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7 // Monday-based
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayKey = toKey(new Date())

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function handlePick(date) {
    const key = toKey(date)
    if (!value.from || (value.from && value.to)) {
      // Start a new range
      onChange({ from: key, to: null })
    } else {
      // Complete the range
      if (key < value.from) onChange({ from: key, to: value.from })
      else onChange({ from: value.from, to: key })
    }
  }

  function cellState(date) {
    if (!date) return 'empty'
    const key = toKey(date)
    if (value.from && value.to) {
      if (key === value.from || key === value.to) return 'edge'
      if (key > value.from && key < value.to) return 'inRange'
    } else if (value.from && key === value.from) {
      return 'edge'
    }
    return 'normal'
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: 14, padding: 12, marginTop: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} aria-label={t('Vorheriger Monat')} style={navBtn}>
          <ChevronLeft size={18} color="var(--color-text-secondary)" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
          {new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, { month: 'long' })} {viewYear}
        </span>
        <button onClick={nextMonth} aria-label={t('Nächster Monat')} style={navBtn}>
          <ChevronRight size={18} color="var(--color-text-secondary)" />
        </button>
      </div>

      {/* Weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {weekdays.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>{w}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />
          const state = cellState(date)
          const key = toKey(date)
          const isToday = key === todayKey
          const bg = state === 'edge' ? 'var(--color-accent)'
            : state === 'inRange' ? 'var(--color-accent-light)'
            : 'transparent'
          const color = state === 'edge' ? '#fff'
            : 'var(--color-text)'
          return (
            <button
              key={key}
              onClick={() => handlePick(date)}
              style={{
                aspectRatio: '1 / 1', minHeight: 30, border: 'none', cursor: 'pointer',
                borderRadius: state === 'inRange' ? 6 : 8,
                backgroundColor: bg, color,
                fontSize: 12.5, fontWeight: state === 'edge' ? 700 : 500,
                outline: isToday && state === 'normal' ? '1.5px solid var(--color-accent)' : 'none',
                outlineOffset: -2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {value.from && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          {value.to
            ? `${formatShort(value.from, locale)} – ${formatShort(value.to, locale)}`
            : t('Ab {date} · zweites Datum wählen', { date: formatShort(value.from, locale) })}
        </div>
      )}
    </div>
  )
}

function formatShort(key, locale) {
  const d = new Date(key)
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

const navBtn = {
  border: 'none', background: 'none', cursor: 'pointer', padding: 4,
  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
