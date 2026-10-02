// ─────────────────────────────────────────────────────────────
// Stale-while-revalidate-Cache für die Haupt-Tabs.
//
// Warum: Nach ein paar Stunden Leerlauf braucht das Supabase-Backend für
// die ersten Requests 5–20 s (Kaltstart, siehe CLAUDE.md). Ohne Cache
// zeigte jeder Tab so lange nur Skelett-Platzhalter. Jetzt rendern Home,
// Gebete, Profil, Chats, Weltkarte und Bibel sofort den zuletzt geladenen
// Stand und aktualisieren ihn im Hintergrund.
//
// - In-Memory-Map für Tab-Wechsel innerhalb einer Session (kein Parse).
// - localStorage als persistente Schicht für den App-Start. Geschrieben
//   wird im Leerlauf, damit das Serialisieren nie mit einem Render
//   konkurriert.
// - Schlüssel sind pro Nutzer getrennt; beim Logout wird alles gelöscht
//   (siehe useAuth), damit auf einem geteilten Gerät nie Daten des
//   vorherigen Kontos aufblitzen.
// ─────────────────────────────────────────────────────────────

const PREFIX = 'oikos_swr1:'
// Größere Einträge nur im Speicher halten – localStorage ist auf ~5 MB
// pro Origin begrenzt und synchron.
const MAX_PERSIST_CHARS = 400_000

const mem = new Map()
const pendingWrites = new Map()
let flushScheduled = false

function storageKey(userId, name) {
  return `${PREFIX}${userId}:${name}`
}

export function readCache(userId, name) {
  if (!userId) return undefined
  const key = storageKey(userId, name)
  if (mem.has(key)) return mem.get(key)
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return undefined
    const value = JSON.parse(raw)
    mem.set(key, value)
    return value
  } catch {
    return undefined
  }
}

function flush() {
  flushScheduled = false
  for (const [key, value] of pendingWrites) {
    try {
      const raw = JSON.stringify(value)
      if (raw.length > MAX_PERSIST_CHARS) localStorage.removeItem(key)
      else localStorage.setItem(key, raw)
    } catch {
      // Quota voll o. ä. – der Eintrag bleibt im Speicher, das reicht.
    }
  }
  pendingWrites.clear()
}

// `persist: false` für Daten, die nur innerhalb der Session helfen (z. B.
// fremde Profile) – sonst wüchse localStorage mit jedem besuchten Profil.
export function writeCache(userId, name, value, { persist = true } = {}) {
  if (!userId) return
  const key = storageKey(userId, name)
  mem.set(key, value)
  if (!persist) return
  pendingWrites.set(key, value)
  if (flushScheduled) return
  flushScheduled = true
  if (typeof requestIdleCallback === 'function') requestIdleCallback(flush, { timeout: 2000 })
  else setTimeout(flush, 300)
}

export function clearAllCaches() {
  mem.clear()
  pendingWrites.clear()
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch { /* ignore */ }
}
