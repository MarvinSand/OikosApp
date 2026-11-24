import { useSyncExternalStore } from 'react'

// Kleines Pop-up „Du bist jetzt in den Gruppen …“ nach dem Eintragen des
// Standorts (gezeigt von components/common/GlobalHosts.jsx).
let current = null
const listeners = new Set()
const emit = () => listeners.forEach(cb => cb())

export function showRegionJoinNotice(groups) {
  if (!groups?.length) return
  current = groups
  emit()
}

export function closeRegionJoinNotice() {
  current = null
  emit()
}

export function useRegionJoinNotice() {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
    () => null
  )
}
