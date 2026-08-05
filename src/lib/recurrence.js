// ─── Wiederkehrende Events: Berechnung & Anzeige ──────────────────────────
// Events speichern nur die ANKER-Termin-Daten (starts_at/ends_at) plus eine
// Wiederholungsregel. Der jeweils nächste Termin wird bei Bedarf im Frontend
// berechnet (nextOccurrence) statt einzelne Termine in der DB zu materialisieren.

export const RECURRENCE_FREQ_OPTIONS = [
  { key: null,      label: 'Einmalig' },
  { key: 'daily',   label: 'Täglich' },
  { key: 'weekly',  label: 'Wöchentlich' },
  { key: 'monthly', label: 'Monatlich' },
  { key: 'yearly',  label: 'Jährlich' },
]

// value = JS Date.getDay() (0 = Sonntag … 6 = Samstag), Anzeige Montag-first
export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' },
]

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const mondayFirst = (d) => (d + 6) % 7

export function intervalUnitLabel(freq, interval) {
  const n = Number(interval) || 1
  const map = {
    daily:   n === 1 ? 'Tag'   : 'Tage',
    weekly:  n === 1 ? 'Woche' : 'Wochen',
    monthly: n === 1 ? 'Monat' : 'Monate',
    yearly:  n === 1 ? 'Jahr'  : 'Jahre',
  }
  return map[freq] || ''
}

export function isRecurring(activity) {
  return !!activity?.recurrence_freq
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function addMonths(date, n) {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + n)
  if (d.getDate() !== day) d.setDate(0) // Monatsende-Überlauf abfangen (z.B. 31. Jan + 1 Monat)
  return d
}

function addYears(date, n) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + n)
  return d
}

function startOfWeekMonday(date) {
  const d = new Date(date)
  const diff = mondayFirst(d.getDay()) * -1
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function withTimeOf(date, timeSource) {
  const d = new Date(date)
  d.setHours(timeSource.getHours(), timeSource.getMinutes(), timeSource.getSeconds(), 0)
  return d
}

// Nächster (oder aktuell laufender) Termin ab `from`. null = Serie ist
// bereits beendet (recurrence_end_date überschritten) oder kein starts_at.
export function nextOccurrence(activity, from = new Date()) {
  if (!activity?.starts_at) return null
  const anchor = new Date(activity.starts_at)
  if (!activity.recurrence_freq) return anchor

  const interval = Math.max(1, Number(activity.recurrence_interval) || 1)
  const endDate = activity.recurrence_end_date ? new Date(`${activity.recurrence_end_date}T23:59:59`) : null
  const within = (d) => !endDate || d <= endDate
  const weekdays = Array.isArray(activity.recurrence_weekdays) && activity.recurrence_weekdays.length > 0
    ? [...activity.recurrence_weekdays].sort((a, b) => mondayFirst(a) - mondayFirst(b))
    : null

  if (activity.recurrence_freq === 'weekly' && weekdays) {
    let weekStart = startOfWeekMonday(anchor)
    for (let i = 0; i < 1000; i++) {
      for (const wd of weekdays) {
        const candidate = withTimeOf(addDays(weekStart, mondayFirst(wd)), anchor)
        if (candidate >= anchor && candidate >= from) {
          return within(candidate) ? candidate : null
        }
      }
      weekStart = addDays(weekStart, 7 * interval)
      if (endDate && weekStart > endDate) return null
    }
    return null
  }

  let d = anchor
  let i = 0
  while (d < from) {
    if (activity.recurrence_freq === 'daily') d = addDays(d, interval)
    else if (activity.recurrence_freq === 'weekly') d = addDays(d, 7 * interval)
    else if (activity.recurrence_freq === 'monthly') d = addMonths(d, interval)
    else if (activity.recurrence_freq === 'yearly') d = addYears(d, interval)
    else return d
    i++
    if (i > 3000) return null
    if (!within(d)) return null
  }
  return within(d) ? d : null
}

// Kurzes Label für Listen/Detail, z.B. "Wöchentlich (Mo, Mi)" oder "Alle 2 Monate"
export function formatRecurrenceLabel(activity) {
  if (!activity?.recurrence_freq) return null
  const interval = Math.max(1, Number(activity.recurrence_interval) || 1)
  const freq = activity.recurrence_freq

  if (freq === 'weekly' && Array.isArray(activity.recurrence_weekdays) && activity.recurrence_weekdays.length > 0) {
    const days = [...activity.recurrence_weekdays]
      .sort((a, b) => mondayFirst(a) - mondayFirst(b))
      .map(d => WEEKDAY_SHORT[d])
      .join(', ')
    return interval === 1 ? `Wöchentlich (${days})` : `Alle ${interval} Wochen (${days})`
  }

  if (interval === 1) {
    return { daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich', yearly: 'Jährlich' }[freq] || null
  }
  return `Alle ${interval} ${intervalUnitLabel(freq, interval)}`
}
