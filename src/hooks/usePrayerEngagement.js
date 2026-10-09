import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { KIND_OIKOS, KIND_PERSONAL } from '../lib/prayerModel'
import { readCache, writeCache } from '../lib/swrCache'

// ════════════════════════════════════════════════════════════════════════
// Gebets-Logs + Kommentare für eine Liste normalisierter Gebete
// ════════════════════════════════════════════════════════════════════════
// Lädt beide Log-Tabellen (prayer_logs / personal_prayer_logs) und die
// Kommentare (prayer_notes) in wenigen Sammel-Queries statt einer Query pro
// Karte. Rückgabe ist nach `prayer.key` ('oikos:<id>' / 'personal:<id>')
// indiziert, damit die Karte nichts über Tabellen wissen muss.

const EMPTY = {}

export function usePrayerEngagement(prayers) {
  const { user } = useAuth()
  // Letzter Stand aus dem Cache (Gebets-Zähler/Kommentare), damit die Karten
  // nicht erst nach dem Nachladen ihre Zahlen bekommen. Nach Nutzer getrennt.
  const [cached] = useState(() => readCache(user?.id, 'prayerEngagement'))
  const [logsMap, setLogsMap] = useState(cached?.logs ?? EMPTY)
  const [notesMap, setNotesMap] = useState(cached?.notes ?? EMPTY)
  const [loading, setLoading] = useState(false)

  // Nur die IDs als Abhängigkeit – sonst lädt der Effekt bei jedem Render neu.
  const oikosIds = prayers.filter(p => p.kind === KIND_OIKOS).map(p => p.id)
  const personalIds = prayers.filter(p => p.kind === KIND_PERSONAL).map(p => p.id)
  const signature = `${oikosIds.join(',')}|${personalIds.join(',')}`
  const signatureRef = useRef(signature)
  signatureRef.current = signature

  const load = useCallback(async () => {
    const oIds = oikosIds
    const pIds = personalIds
    if (oIds.length === 0 && pIds.length === 0) {
      setLogsMap(EMPTY)
      setNotesMap(EMPTY)
      setLoading(false)
      return
    }
    // Logs + Kommentare + Profile in EINER RPC (phase77, SECURITY INVOKER) statt
    // 4 parallelen Queries und einer davon abhängigen Profil-Query.
    const { data, error } = await supabase.rpc('get_prayer_engagement', { p_oikos_ids: oIds, p_personal_ids: pIds })
    if (error || !data) { setLoading(false); return }
    const oikosLogsWithProfile = data.oikosLogs || []
    const personalLogsWithProfile = data.personalLogs || []
    const oikosNotesWithProfile = data.oikosNotes || []
    const personalNotesWithProfile = data.personalNotes || []

    const nextLogs = {}
    for (const l of oikosLogsWithProfile) {
      const key = `${KIND_OIKOS}:${l.prayer_request_id}`
      ;(nextLogs[key] ||= []).push(l)
    }
    for (const l of personalLogsWithProfile) {
      const key = `${KIND_PERSONAL}:${l.request_id}`
      ;(nextLogs[key] ||= []).push(l)
    }
    const nextNotes = {}
    for (const n of oikosNotesWithProfile) {
      const key = `${KIND_OIKOS}:${n.prayer_request_id}`
      ;(nextNotes[key] ||= []).push(n)
    }
    for (const n of personalNotesWithProfile) {
      const key = `${KIND_PERSONAL}:${n.request_id}`
      ;(nextNotes[key] ||= []).push(n)
    }

    // Zwischenzeitlich hat sich die Liste geändert → Ergebnis verwerfen,
    // der nächste Lauf setzt den Zustand.
    if (signatureRef.current !== `${oIds.join(',')}|${pIds.join(',')}`) return
    setLogsMap(nextLogs)
    setNotesMap(nextNotes)
    writeCache(user?.id, 'prayerEngagement', { logs: nextLogs, notes: nextNotes })
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  useEffect(() => {
    if (!user) return
    load()
  }, [load, user?.id])

  // Optimistisch einen Log-Eintrag ergänzen (nach erfolgreichem Insert).
  function pushLog(prayerKey, log) {
    setLogsMap(prev => ({ ...prev, [prayerKey]: [log, ...(prev[prayerKey] || [])] }))
  }
  function pushNote(prayerKey, note) {
    setNotesMap(prev => ({ ...prev, [prayerKey]: [note, ...(prev[prayerKey] || [])] }))
  }
  function removeNote(prayerKey, noteId) {
    setNotesMap(prev => ({ ...prev, [prayerKey]: (prev[prayerKey] || []).filter(n => n.id !== noteId) }))
  }

  return { logsMap, notesMap, loading, reload: load, pushLog, pushNote, removeNote }
}

// Aus den Logs eines Gebets die Anzeigewerte der Karte ableiten:
// wer hat gebetet (dedupliziert, mit Anzahl), Gesamtzahl, letztes eigenes und
// letztes fremdes Gebet.
export function summarizeLogs(logs, currentUserId) {
  const list = logs || []
  const prayersByUser = []
  const byId = new Map()
  for (const log of list) {
    const existing = byId.get(log.user_id)
    if (existing) {
      existing.count++
    } else {
      const entry = { userId: log.user_id, profile: log.profiles || null, count: 1 }
      byId.set(log.user_id, entry)
      prayersByUser.push(entry)
    }
  }
  return {
    prayersByUser,
    totalCount: list.length,
    myLastPrayedAt: list.find(l => l.user_id === currentUserId)?.created_at ?? null,
    othersLastPrayedAt: list.find(l => l.user_id !== currentUserId)?.created_at ?? null,
  }
}
