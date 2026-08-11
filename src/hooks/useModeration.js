import { useSyncExternalStore, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from './useAuth'

// ─────────────────────────────────────────────────────────────
// Melden & Blockieren (App Store Guideline 1.2).
//
// Die Blockierliste wird an sehr vielen Stellen gebraucht – Feed,
// Kommentare, Chatliste, Freundesvorschläge, Profile. Deshalb wie
// `useAuth` ein Modul-Store mit genau einer Abfrage und In-Flight-
// Dedupe, statt pro Aufrufstelle eine eigene Query (siehe CLAUDE.md).
// ─────────────────────────────────────────────────────────────

const listeners = new Set()

// Leeres Set als stabile Referenz: `useSyncExternalStore` vergleicht
// per Identität, ein jedes Mal neu erzeugtes Set würde endlos rendern.
const EMPTY = new Set()

let state = { ids: EMPTY, loading: true }
let inFlight = null
let loadedForUserId = null

function emit(next) {
  state = next
  for (const l of listeners) l()
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return state
}

async function load(force = false) {
  const user = getCurrentUser()
  if (!user) {
    loadedForUserId = null
    if (state.ids !== EMPTY || state.loading) emit({ ids: EMPTY, loading: false })
    return EMPTY
  }
  if (!force && loadedForUserId === user.id) return state.ids
  if (inFlight) return inFlight

  inFlight = (async () => {
    const { data, error } = await supabase.rpc('blocked_ids')
    inFlight = null
    // Auch im Fehlerfall als "geladen" markieren: sonst versucht jeder
    // Render die Query erneut und die Komponente rendert endlos.
    loadedForUserId = user.id
    if (error) {
      emit({ ids: state.ids, loading: false })
      return state.ids
    }
    // rpc() auf einer setof-Funktion liefert [{ blocked_ids: uuid }, …]
    const ids = new Set((data || []).map(row => (typeof row === 'string' ? row : row.blocked_ids)))
    emit({ ids, loading: false })
    return ids
  })()

  return inFlight
}

export function useModeration() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Beim ersten Consumer laden. Kein useEffect: der Store dedupliziert
  // ohnehin, und so steht die Liste beim ersten Render schon bereit,
  // sobald ein anderer Consumer sie geholt hat.
  // Der User-Vergleich fängt den Wechsel nach Logout/Login ab – sonst
  // sähe der neue Nutzer die Blockierliste des vorherigen.
  const currentUserId = getCurrentUser()?.id ?? null
  if (!inFlight && (snapshot.loading || loadedForUserId !== currentUserId)) load()

  const reportContent = useCallback(async ({ targetType, targetId, targetUserId = null, reason, details = '' }) => {
    const user = getCurrentUser()
    if (!user) throw new Error('Nicht angemeldet')
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      target_user_id: targetUserId,
      reason,
      details: details.trim() || null,
    })
    // 23505 = bereits gemeldet. Für den Nutzer ist das kein Fehler –
    // die Meldung liegt ja schon vor.
    if (error && error.code !== '23505') throw error
  }, [])

  const blockUser = useCallback(async (targetId) => {
    const { error } = await supabase.rpc('block_user', { p_target: targetId })
    if (error) throw error
    await load(true)
  }, [])

  const unblockUser = useCallback(async (targetId) => {
    const user = getCurrentUser()
    if (!user) throw new Error('Nicht angemeldet')
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetId)
    if (error) throw error
    await load(true)
  }, [])

  return {
    blockedIds: snapshot.ids,
    loading: snapshot.loading,
    isBlocked: useCallback(id => snapshot.ids.has(id), [snapshot.ids]),
    reportContent,
    blockUser,
    unblockUser,
    reload: () => load(true),
  }
}

// Für Hooks, die außerhalb von React filtern müssen (Feed-Queries etc.).
export async function getBlockedIds() {
  return load()
}

// Kleiner Helfer für Listen, die schon geladen sind (Kommentare, Chats …).
// Für Queries ist ein serverseitiges `.not('author_id','in',…)` besser –
// hier geht es um verschachtelte Daten, die in einem Rutsch kommen.
export function filterBlocked(rows, blockedIds, key = 'author_id') {
  if (!rows?.length || !blockedIds?.size) return rows || []
  return rows.filter(r => !blockedIds.has(r?.[key]))
}

// Nach dem Ausloggen darf die Liste des vorherigen Nutzers nicht stehen bleiben.
export function resetModerationCache() {
  loadedForUserId = null
  inFlight = null
  emit({ ids: EMPTY, loading: true })
}
