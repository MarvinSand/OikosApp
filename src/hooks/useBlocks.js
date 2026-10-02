import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { clearAllCaches } from '../lib/swrCache'

// Blockierte Nutzer (App-Store-Richtlinie 1.2). Das eigentliche Ausblenden
// der Inhalte passiert serverseitig per RLS (phase71_user_blocks.sql) – hier
// nur die Liste für die UI (Profil-Button, Einstellungen) und die Aktionen.

let cache = { userId: null, ids: null }
const listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

async function loadBlocks(userId) {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id, created_at, profile:profiles!blocked_id(id, full_name, username, avatar_url)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  cache = { userId, ids: new Set((data || []).map(r => r.blocked_id)), rows: data || [] }
  emit()
  return cache
}

export async function blockUser(userId, otherId) {
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: userId, blocked_id: otherId })
  if (error && error.code !== '23505') throw error // 23505 = schon blockiert
  // Bestehende Verbindung/Anfrage auflösen – sonst blieben geteilte
  // „Geschwister"-Inhalte über die Freundschaft sichtbar.
  await supabase
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`)
  // Gecachte Tab-Inhalte können Beiträge des Blockierten enthalten
  clearAllCaches()
  await loadBlocks(userId).catch(() => {})
}

export async function unblockUser(userId, otherId) {
  const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', userId).eq('blocked_id', otherId)
  if (error) throw error
  clearAllCaches()
  await loadBlocks(userId).catch(() => {})
}

export function useBlocks() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [, force] = useState(0)

  useEffect(() => {
    const l = () => force(n => n + 1)
    listeners.add(l)
    return () => listeners.delete(l)
  }, [])

  useEffect(() => {
    if (!userId) return
    if (cache.userId !== userId || !cache.ids) loadBlocks(userId).catch(() => {})
  }, [userId])

  const current = cache.userId === userId ? cache : { ids: null, rows: [] }

  const isBlocked = useCallback(id => !!current.ids?.has(id), [current.ids])

  return {
    blockedRows: current.rows || [],
    loading: !current.ids,
    isBlocked,
    block: otherId => blockUser(userId, otherId),
    unblock: otherId => unblockUser(userId, otherId),
  }
}
