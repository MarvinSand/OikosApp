// Ampelsystem – visuelle Dringlichkeit nach letztem Gebet

export function getAmpelStatus(lastPrayedAt, nextDueDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // next_due_date überschreibt Standard-Logik
  if (nextDueDate) {
    const due = new Date(nextDueDate)
    due.setHours(0, 0, 0, 0)
    if (due <= today) {
      return { status: 'red', color: '#C0392B', label: 'Fällig – Zeit zu beten', daysSinceLastPrayer: null }
    }
  }

  if (!lastPrayedAt) {
    return { status: 'never', color: '#8A8A8A', label: 'Noch nie gebetet', daysSinceLastPrayer: null }
  }

  const last = new Date(lastPrayedAt)
  last.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today - last) / 86400000)

  if (diffDays === 0) return { status: 'green', color: '#27AE60', label: 'Heute gebetet', daysSinceLastPrayer: 0 }
  if (diffDays <= 6) return { status: 'yellow', color: '#F39C12', label: `Vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'} gebetet`, daysSinceLastPrayer: diffDays }
  if (diffDays <= 13) return { status: 'orange', color: '#E67E22', label: `Vor ${diffDays} Tagen gebetet`, daysSinceLastPrayer: diffDays }
  return { status: 'red', color: '#C0392B', label: `${diffDays} Tage nicht gebetet`, daysSinceLastPrayer: diffDays }
}

export function useAmpelStatus(lastPrayedAt, nextDueDate) {
  return getAmpelStatus(lastPrayedAt, nextDueDate)
}
