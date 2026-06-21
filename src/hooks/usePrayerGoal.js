import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Detail eines Gebetsziels inkl. Teilnehmer + Beitrag leisten.
export function usePrayerGoal(goalId) {
  const { user } = useAuth()
  const [goal, setGoal] = useState(null)
  const [participants, setParticipants] = useState([])
  const [hasJoined, setHasJoined] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!goalId) return
    setLoading(true)
    const [{ data: goalData }, { data: contribs }] = await Promise.all([
      supabase.from('prayer_goals').select('*').eq('id', goalId).maybeSingle(),
      supabase.from('prayer_goal_contributions')
        .select('user_id, minutes, created_at, profiles:user_id(id, full_name, username, is_christian)')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false }),
    ])
    setGoal(goalData || null)

    // Eindeutige Teilnehmer (eine Karte pro Person)
    const seen = new Set()
    const unique = []
    for (const c of (contribs || [])) {
      if (!seen.has(c.user_id)) { seen.add(c.user_id); unique.push(c) }
    }
    setParticipants(unique)
    setHasJoined(user ? seen.has(user.id) : false)
    setLoading(false)
  }, [goalId, user?.id])

  useEffect(() => { load() }, [load])

  // minutes > 0 nur für Stunden-Ziele relevant; für Personen-Ziele genügt der Aufruf.
  async function contribute(minutes = 0) {
    const { error } = await supabase.rpc('contribute_to_prayer_goal', {
      p_goal_id: goalId,
      p_minutes: Math.round(minutes),
    })
    if (error) throw error
    await load()
  }

  return { goal, participants, hasJoined, loading, contribute, reload: load }
}
