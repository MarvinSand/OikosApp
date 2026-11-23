import { useSyncExternalStore } from 'react'

// Lokaler Stand „von der Moderation versteckt/wiederhergestellt" je Inhalt.
// Der Server liefert dem Moderator versteckte Inhalte weiterhin aus (RLS-
// Ausnahme für App-Admins) – ohne diesen Stand sähe der Beitrag direkt nach
// „Verstecken“ unverändert aus. Schlüssel: `${contentType}:${contentId}`.
const overrides = new Map()
const listeners = new Set()

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function setModerationHidden(contentType, contentId, hidden) {
  overrides.set(`${contentType}:${contentId}`, hidden ? new Date().toISOString() : null)
  listeners.forEach(cb => cb())
}

/** Wirksamer Zeitstempel: lokale Aktion (falls vorhanden), sonst Serverwert. */
export function useModerationHiddenAt(contentType, contentId, serverValue) {
  const key = `${contentType}:${contentId}`
  const local = useSyncExternalStore(subscribe, () => overrides.get(key), () => undefined)
  return local !== undefined ? local : (serverValue || null)
}
