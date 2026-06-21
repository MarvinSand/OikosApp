import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Lädt Gebetsziele für Discover/Home/Meine/Community und erstellt neue.
export function usePrayerGoals() {
  const { user } = useAuth()
  const [publicGoals, setPublicGoals] = useState([])
  const [myGoals, setMyGoals] = useState([])
  const [communityGoals, setCommunityGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Communities des Nutzers (für Community-Ziele)
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
    const communityIds = (memberships || []).map(m => m.community_id)

    const queries = [
      // Öffentliche Ziele – nach Aktivität sortiert (Teilnehmer)
      supabase.from('prayer_goals')
        .select('*')
        .eq('visibility', 'public')
        .order('participant_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
      // Eigene Ziele
      supabase.from('prayer_goals')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false }),
    ]

    if (communityIds.length > 0) {
      queries.push(
        supabase.from('prayer_goals')
          .select('*')
          .eq('visibility', 'community')
          .in('community_id', communityIds)
          .order('created_at', { ascending: false })
      )
    }

    const results = await Promise.all(queries)
    setPublicGoals(results[0].data || [])
    setMyGoals(results[1].data || [])
    setCommunityGoals(communityIds.length > 0 ? (results[2].data || []) : [])
    setLoading(false)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createGoal({ title, description = null, icon = '🙏', color = '#5AC8FA', goalType = 'people', targetValue, visibility = 'public', communityId = null, prayerRequestId = null, personalPrayerRequestId = null }) {
    const { data, error } = await supabase
      .from('prayer_goals')
      .insert({
        created_by: user.id,
        title,
        description,
        icon,
        color,
        goal_type: goalType,
        target_value: targetValue,
        visibility,
        community_id: visibility === 'community' ? communityId : null,
        prayer_request_id: prayerRequestId,
        personal_prayer_request_id: personalPrayerRequestId,
      })
      .select()
      .single()
    if (error) throw error
    setMyGoals(prev => [data, ...prev])
    if (data.visibility === 'public') setPublicGoals(prev => [data, ...prev])
    return data
  }

  // Für die Home-Seite: aktivste öffentlichen Ziele
  const featuredGoals = publicGoals.slice(0, 3)

  return { publicGoals, myGoals, communityGoals, featuredGoals, loading, createGoal, reload: load }
}
