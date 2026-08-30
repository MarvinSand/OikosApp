import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Lädt Stationen + eigenen Fortschritt in möglichst wenigen Requests (RLS
// lässt ohnehin nur eigene Progress-Zeilen zu, kein serverseitiges
// Zusammenrechnen nötig - siehe CLAUDE.md-Lektion zu unnötigem
// Query-Batching). content_head wird mitgeladen, damit ein Tap auf eine
// noch gesperrte Station eine Kurzinfo zeigen kann, ohne extra nachzuladen.
export function useDiscipleshipPath() {
  const { user } = useAuth()
  const [stations, setStations] = useState([])
  const [progressByStation, setProgressByStation] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: stationsData }, { data: progressData }] = await Promise.all([
      supabase.from('discipleship_stations')
        .select('id, order_index, slug, title, bible_reference, content_head')
        .order('order_index'),
      supabase.from('discipleship_station_progress')
        .select('station_id, status, completed_at')
        .eq('user_id', user.id),
    ])

    const progressMap = {}
    for (const p of progressData || []) progressMap[p.station_id] = p

    setStations(stationsData || [])
    setProgressByStation(progressMap)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // Höchste order_index mit status='completed' bestimmt die Freischaltung -
  // strikt sequenziell, keine eigene "unlocked"-Spalte nötig.
  const highestCompletedOrder = stations.reduce((max, s) => {
    const p = progressByStation[s.id]
    return p?.status === 'completed' && s.order_index > max ? s.order_index : max
  }, 0)

  function stateFor(station) {
    const p = progressByStation[station.id]
    if (p?.status === 'completed') return 'completed'
    if (station.order_index === highestCompletedOrder + 1) return 'active'
    return 'locked'
  }

  return { stations, loading, stateFor, refresh: load }
}
