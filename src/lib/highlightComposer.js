import { useSyncExternalStore } from 'react'

// Öffnet das Moderator-Fenster „In Aktuelles anzeigen“ von überall (z. B. aus
// dem ⋯-Menü eines Beitrags). Das Fenster selbst hängt in GlobalHosts.jsx –
// so überlebt es das Schließen des Menüs.
// preset: { kind: 'post'|'community_post'|'event'|'prayer', refId, label }
let current = null
const listeners = new Set()
const emit = () => listeners.forEach(cb => cb())

export function openHighlightComposer(preset) {
  current = preset || null
  emit()
}

export function closeHighlightComposer() {
  current = null
  emit()
}

export function useHighlightComposerPreset() {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
    () => null
  )
}

export const HIGHLIGHTS_CHANGED_EVENT = 'oikos:highlights-changed'
