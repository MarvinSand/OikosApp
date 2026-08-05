import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { KIND_OIKOS, KIND_PERSONAL } from '../lib/prayerModel'

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
  const [logsMap, setLogsMap] = useState(EMPTY)
  const [notesMap, setNotesMap] = useState(EMPTY)
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
    setLoading(true)

    const [{ data: oikosLogs }, { data: personalLogs }, { data: oikosNotes }, { data: personalNotes }] = await Promise.all([
      oIds.length
        ? supabase.from('prayer_logs')
            .select('id, prayer_request_id, user_id, created_at, profiles!user_id(id, username, full_name, is_christian)')
            .in('prayer_request_id', oIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      pIds.length
        ? supabase.from('personal_prayer_logs')
            .select('id, request_id, user_id, created_at, profiles!user_id(id, username, full_name, is_christian)')
            .in('request_id', pIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      oIds.length
        ? supabase.from('prayer_notes')
            .select('id, prayer_request_id, text, is_public, author_id, created_at, profiles!author_id(id, username, full_name)')
            .in('prayer_request_id', oIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      pIds.length
        ? supabase.from('prayer_notes')
            .select('id, request_id, text, is_public, author_id, created_at, profiles!author_id(id, username, full_name)')
            .in('request_id', pIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

    const nextLogs = {}
    for (const l of (oikosLogs || [])) {
      const key = `${KIND_OIKOS}:${l.prayer_request_id}`
      ;(nextLogs[key] ||= []).push(l)
    }
    for (const l of (personalLogs || [])) {
      const key = `${KIND_PERSONAL}:${l.request_id}`
      ;(nextLogs[key] ||= []).push(l)
    }
    const nextNotes = {}
    for (const n of (oikosNotes || [])) {
      const key = `${KIND_OIKOS}:${n.prayer_request_id}`
      ;(nextNotes[key] ||= []).push(n)
    }
    for (const n of (personalNotes || [])) {
      const key = `${KIND_PERSONAL}:${n.request_id}`
      ;(nextNotes[key] ||= []).push(n)
    }

    // Zwischenzeitlich hat sich die Liste geändert → Ergebnis verwerfen,
    // der nächste Lauf setzt den Zustand.
    if (signatureRef.current !== `${oIds.join(',')}|${pIds.join(',')}`) return
    setLogsMap(nextLogs)
    setNotesMap(nextNotes)
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

  return { logsMap, notesMap, loading, reload: load, pushLog, pushNote }
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
