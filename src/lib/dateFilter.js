// Shared date-range filtering for Feed & Gebet (Paul)
// Presets plus a custom range. All comparisons are inclusive.

export const DATE_PRESETS = [
  { key: 'all',   label: 'Alle' },
  { key: 'today', label: 'Heute' },
  { key: 'week',  label: 'Diese Woche' },
  { key: 'month', label: 'Diesen Monat' },
  { key: 'custom', label: '📅 Zeitraum' },
]

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

// Returns { from: Date, to: Date } or null (= no restriction / "Alle")
export function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  if (preset === 'today') {
    return { from: startOfDay(now), to: endOfDay(now) }
  }
  if (preset === 'week') {
    // Week starts on Monday
    const dayIdx = (now.getDay() + 6) % 7
    const monday = startOfDay(now)
    monday.setDate(now.getDate() - dayIdx)
    return { from: monday, to: endOfDay(now) }
  }
  if (preset === 'month') {
    const first = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
    return { from: first, to: endOfDay(now) }
  }
  if (preset === 'custom' && customFrom) {
    const from = startOfDay(new Date(customFrom))
    const to = endOfDay(new Date(customTo || customFrom))
    // Guard against reversed selection
    return from <= to ? { from, to } : { from: startOfDay(new Date(customTo)), to: endOfDay(new Date(customFrom)) }
  }
  return null
}

export function matchesDateFilter(createdAt, dateFilter) {
  if (!dateFilter || !dateFilter.preset || dateFilter.preset === 'all') return true
  const range = getDateRange(dateFilter.preset, dateFilter.from, dateFilter.to)
  if (!range) return true
  if (dateFilter.preset === 'custom' && !dateFilter.from) return true
  const t = new Date(createdAt).getTime()
  return t >= range.from.getTime() && t <= range.to.getTime()
}

// True when the filter actually narrows results (used for badges / "active" states)
export function isDateFilterActive(dateFilter) {
  if (!dateFilter || !dateFilter.preset || dateFilter.preset === 'all') return false
  if (dateFilter.preset === 'custom') return !!dateFilter.from
  return true
}

export const EMPTY_DATE_FILTER = { preset: 'all', from: null, to: null }
