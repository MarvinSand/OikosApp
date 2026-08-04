import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Geteilte Realtime-Kanäle mit Refcount.
//
// Warum: Jedes `channel.subscribe()` kostet den Realtime-Server eine teure
// Rechte-Prüfung (`with sub_tables as (...)` – laut pg_stat_statements
// 65–140 ms pro Aufruf). Wenn derselbe Hook an mehreren Stellen gemountet
// ist, abonniert jede Instanz erneut. Umgekehrt darf man den Kanalnamen
// aber auch nicht einfach fest vergeben: dann teilen sich die Instanzen
// einen Kanal und der erste Unmount (`removeChannel`) killt das Abo für
// alle anderen.
//
// Lösung: ein Kanal pro Topic, alle Instanzen hängen als Listener dran,
// abgebaut wird erst, wenn der letzte Consumer weg ist – und selbst dann
// mit Verzögerung, damit ein Routenwechsel (Unmount + sofortiger Remount)
// den Kanal nicht ab- und gleich wieder aufbaut.
// ─────────────────────────────────────────────────────────────

const GRACE_MS = 30_000

const entries = new Map() // key -> { channel, listeners:Set, closeTimer }

export function subscribeShared(key, bindings, handler) {
  let entry = entries.get(key)

  if (entry?.closeTimer) {
    clearTimeout(entry.closeTimer)
    entry.closeTimer = null
  }

  if (!entry) {
    const listeners = new Set()
    const channel = supabase.channel(key)
    for (const binding of bindings) {
      channel.on('postgres_changes', binding, (payload) => {
        // Kopie iterieren: ein Listener darf sich beim Empfang abmelden
        for (const l of [...listeners]) {
          try { l(payload) } catch { /* ein kaputter Consumer darf die anderen nicht killen */ }
        }
      })
    }
    channel.subscribe()
    entry = { channel, listeners, closeTimer: null }
    entries.set(key, entry)
  }

  entry.listeners.add(handler)

  let released = false
  return function unsubscribe() {
    if (released) return
    released = true
    entry.listeners.delete(handler)
    if (entry.listeners.size > 0 || entry.closeTimer) return

    entry.closeTimer = setTimeout(() => {
      // In der Zwischenzeit kann wieder jemand dazugekommen sein
      if (entry.listeners.size > 0) { entry.closeTimer = null; return }
      entries.delete(key)
      supabase.removeChannel(entry.channel)
    }, GRACE_MS)
  }
}
