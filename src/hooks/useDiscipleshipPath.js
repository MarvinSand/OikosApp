import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Lädt Stationen + eigenen Fortschritt + an Stationen gebundene Challenges
// + eigene Teilnahme daran in möglichst wenigen Requests (kein serverseitiges
// Zusammenrechnen nötig, RLS lässt ohnehin nur eigene Progress-/Teilnahme-
// Zeilen zu - siehe CLAUDE.md-Lektion zu unnötigem Query-Batching).
export function useDiscipleshipPath() {
  const { user } = useAuth()
  const [stations, setStations] = useState([])
  const [progressByStation, setProgressByStation] = useState({})
  const [challengesByStation, setChallengesByStation] = useState({})
  const [participationByChallenge, setParticipationByChallenge] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: stationsData }, { data: progressData }, { data: challengesData }, { data: participantsData }] = await Promise.all([
      supabase.from('discipleship_stations')
        .select('id, order_index, slug, title, bible_reference')
        .order('order_index'),
      supabase.from('discipleship_station_progress')
        .select('station_id, status, completed_at')
        .eq('user_id', user.id),
      supabase.from('challenges')
        .select('id, station_id, type, title, goal_type, goal_value')
        .not('station_id', 'is', null),
      supabase.from('challenge_participants')
        .select('challenge_id, status, progress_value')
        .eq('user_id', user.id),
    ])

    const progressMap = {}
    for (const p of progressData || []) progressMap[p.station_id] = p
    const participationMap = {}
    for (const p of participantsData || []) participationMap[p.challenge_id] = p
    const challengeMap = {}
    for (const c of challengesData || []) {
      if (!challengeMap[c.station_id]) challengeMap[c.station_id] = []
      challengeMap[c.station_id].push(c)
    }

    setStations(stationsData || [])
    setProgressByStation(progressMap)
    setChallengesByStation(challengeMap)
    setParticipationByChallenge(participationMap)
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

  function challengeStateFor(challenge, stationState) {
    const participation = participationByChallenge[challenge.id]
    if (participation?.status === 'completed') return 'completed'
    if (stationState === 'completed') return 'open'
    return 'locked'
  }

  const openChallengeCount = stations.reduce((count, s) => {
    const state = stateFor(s)
    const challenges = challengesByStation[s.id] || []
    return count + challenges.filter(c => challengeStateFor(c, state) === 'open').length
  }, 0)

  return {
    stations, loading, stateFor, challengeStateFor,
    challengesByStation, openChallengeCount, refresh: load,
  }
}
