import { useCallback, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { readCache, writeCache } from '../lib/swrCache'

// Fortschritt und Antworten der Bibelstudien („Der Weg“).
//
// Vorerst nur lokal auf dem Gerät (swrCache, pro Nutzer, wird beim Logout
// geleert). Die Antworten sind privat; sobald Mentoring kommt und Antworten
// mit einem Mentor geteilt werden können, gehört das in eine Tabelle
// (siehe CLAUDE.md: Zustand, den mehrere Nutzer sehen, nie nur lokal).
//
// Form pro Studie: { i, ans: {schritt: antwort}, open: {schritt: true},
//                    custom, customSaved, done }
const CACHE_KEY = 'weg'

export function useWegProgress() {
  const { user } = useAuth()
  const userId = user?.id
  const [progress, setProgress] = useState(() => readCache(userId, CACHE_KEY) ?? {})
  const latest = useRef(progress)

  const update = useCallback((studyId, patch) => {
    const prev = latest.current
    const next = { ...prev, [studyId]: { ...(prev[studyId] || {}), ...patch } }
    latest.current = next
    setProgress(next)
    writeCache(userId, CACHE_KEY, next)
  }, [userId])

  return { progress, update }
}

// 'new' | 'progress' | 'done' für die Übersicht
export function studyStatus(entry) {
  if (!entry) return 'new'
  if (entry.done) return 'done'
  if ((entry.i ?? 0) > 0 || Object.keys(entry.ans || {}).length > 0) return 'progress'
  return 'new'
}
