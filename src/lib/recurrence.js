import { tr } from '../i18n'
// ─── Wiederkehrende Events: Berechnung & Anzeige ──────────────────────────
// Events speichern nur die ANKER-Termin-Daten (starts_at/ends_at) plus eine
// Wiederholungsregel. Der jeweils nächste Termin wird bei Bedarf im Frontend
// berechnet (nextOccurrence) statt einzelne Termine in der DB zu materialisieren.

export const RECURRENCE_FREQ_OPTIONS = [
  { key: null,      get label() { return tr('Einmalig') } },
  { key: 'daily',   get label() { return tr('Täglich') } },
  { key: 'weekly',  get label() { return tr('Wöchentlich') } },
  { key: 'monthly', get label() { return tr('Monatlich') } },
  { key: 'yearly',  get label() { return tr('Jährlich') } },
  { key: 'custom',  get label() { return tr('Einzelne Termine') } },
]

// value = JS Date.getDay() (0 = Sonntag … 6 = Samstag), Anzeige Montag-first
export const WEEKDAY_OPTIONS = [
  { value: 1, get label() { return tr('Mo') } },
  { value: 2, get label() { return tr('Di') } },
  { value: 3, get label() { return tr('Mi') } },
  { value: 4, get label() { return tr('Do') } },
  { value: 5, get label() { return tr('Fr') } },
  { value: 6, get label() { return tr('Sa') } },
  { value: 0, get label() { return tr('So') } },
]

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const mondayFirst = (d) => (d + 6) % 7

export function intervalUnitLabel(freq, interval) {
  const n = Number(interval) || 1
  const map = {
    daily:   n === 1 ? tr('Tag') : tr('Tage'),
    weekly:  n === 1 ? tr('Woche') : tr('Wochen'),
    monthly: n === 1 ? tr('Monat') : tr('Monate'),
    yearly:  n === 1 ? tr('Jahr') : tr('Jahre'),
  }
  return map[freq] || ''
}

export function isRecurring(activity) {
  return !!activity?.recurrence_freq
}

// Alle Termine einer 'custom'-Serie (Anker + weitere) als { start, end } (Date, end evtl. null),
// aufsteigend, ohne Duplikate. recurrence_dates = [{start, end}] (ältere Daten: nur Strings).
export function customSlots(activity) {
  const toDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d }
  const anchorStart = toDate(activity?.starts_at)
  const anchorDur = anchorStart && activity?.ends_at ? new Date(activity.ends_at) - anchorStart : null
  const extra = (Array.isArray(activity?.recurrence_dates) ? activity.recurrence_dates : []).map(item => {
    const start = toDate(typeof item === 'object' && item ? item.start : item)
    if (!start) return null
    const explicit = typeof item === 'object' && item ? toDate(item.end) : null
    const end = explicit || (anchorDur > 0 ? new Date(start.getTime() + anchorDur) : null)
    return { start, end }
  })
  const list = [
    anchorStart ? { start: anchorStart, end: toDate(activity.ends_at) } : null,
    ...extra,
  ].filter(Boolean).sort((a, b) => a.start - b.start)
  return list.filter((s, i) => i === 0 || s.start.getTime() !== list[i - 1].start.getTime())
}

// Alle Starttermine einer 'custom'-Serie
export function customDates(activity) {
  return customSlots(activity).map(s => s.start)
}

// Nächster Termin mit Ende: { start, end }. Bei Serien (täglich …) gilt die Dauer des
// Anker-Termins, bei 'custom' das eigene Ende des Termins. null = Serie beendet.
export function nextOccurrenceRange(activity, from = new Date()) {
  const start = nextOccurrence(activity, from)
  if (!start) return null
  if (activity.recurrence_freq === 'custom') {
    const slot = customSlots(activity).find(s => s.start.getTime() === start.getTime())
    return { start, end: slot?.end || null }
  }
  const dur = activity.starts_at && activity.ends_at
    ? new Date(activity.ends_at).getTime() - new Date(activity.starts_at).getTime()
    : null
  return { start, end: dur > 0 ? new Date(start.getTime() + dur) : null }
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

  // Einzelne Termine: erster Termin ab `from` (null, wenn alle vorbei sind)
  if (activity.recurrence_freq === 'custom') {
    return customDates(activity).find(d => d >= from) || null
  }

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

  if (freq === 'custom') {
    const n = customDates(activity).length
    return n <= 1 ? tr('Einzelne Termine') : tr('{n} Termine', { n })
  }

  if (freq === 'weekly' && Array.isArray(activity.recurrence_weekdays) && activity.recurrence_weekdays.length > 0) {
    const days = [...activity.recurrence_weekdays]
      .sort((a, b) => mondayFirst(a) - mondayFirst(b))
      .map(d => tr(WEEKDAY_SHORT[d]))
      .join(', ')
    return interval === 1 ? tr('Wöchentlich ({days})', { days }) : tr('Alle {interval} Wochen ({days})', { interval, days })
  }

  if (interval === 1) {
    return { daily: tr('Täglich'), weekly: tr('Wöchentlich'), monthly: tr('Monatlich'), yearly: tr('Jährlich') }[freq] || null
  }
  return tr('Alle {interval} {unit}', { interval, unit: intervalUnitLabel(freq, interval) })
}
