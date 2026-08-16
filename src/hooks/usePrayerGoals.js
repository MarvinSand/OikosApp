import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Lädt Gebetsziele für Discover/Home/Meine/Community und erstellt neue.
export function usePrayerGoals() {
  const { user } = useAuth()
  const [publicGoals, setPublicGoals] = useState([])
  const [myGoals, setMyGoals] = useState([])
  const [communityGoals, setCommunityGoals] = useState([])
  const [sharedGoals, setSharedGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Mitgliedschaften und Freundschaften hängen nicht voneinander ab und
    // werden beide nur gebraucht, um die jeweils dritte Abfrage zu filtern –
    // vorher liefen sie in zwei getrennten seriellen Runden.
    const [{ data: memberships }, { data: friendsRaw }] = await Promise.all([
      // Communities des Nutzers (für Community-Ziele)
      supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id),
      // Mit dir geteilte Ziele: verbundene Geschwister
      supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
    ])
    const communityIds = (memberships || []).map(m => m.community_id)
    const friendIds = (friendsRaw || []).map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)

    const queries = {
      // Öffentliche Ziele – nach Aktivität sortiert (Teilnehmer)
      public: supabase.from('prayer_goals')
        .select('*')
        .eq('visibility', 'public')
        .order('participant_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
      // Eigene Ziele
      mine: supabase.from('prayer_goals')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false }),
      // Gezielt für dich freigegebene Ziele
      specific: supabase.from('prayer_goals').select('*')
        .eq('visibility', 'specific')
        .contains('visibility_user_ids', [user.id])
        .order('created_at', { ascending: false }),
      community: communityIds.length > 0
        ? supabase.from('prayer_goals')
            .select('*')
            .eq('visibility', 'community')
            .in('community_id', communityIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      siblings: friendIds.length > 0
        ? supabase.from('prayer_goals').select('*')
            .eq('visibility', 'siblings')
            .in('created_by', friendIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    }

    const keys = Object.keys(queries)
    const values = await Promise.all(keys.map(key => queries[key]))
    const results = Object.fromEntries(keys.map((key, i) => [key, values[i]]))

    setPublicGoals(results.public.data || [])
    setMyGoals(results.mine.data || [])
    setCommunityGoals(results.community.data || [])

    const sharedMap = new Map()
    for (const r of [results.specific, results.siblings]) {
      for (const g of (r.data || [])) {
        if (g.created_by !== user.id) sharedMap.set(g.id, g)
      }
    }
    setSharedGoals([...sharedMap.values()])

    setLoading(false)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createGoal({ title, description = null, icon = '🙏', color = '#5AC8FA', goalType = 'people', targetValue, visibility = 'public', communityId = null, visibilityUserIds = [], prayerRequestId = null, personalPrayerRequestId = null }) {
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
        visibility_user_ids: visibility === 'specific' ? visibilityUserIds : [],
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

  // Löscht ein Ziel (nur eigenes) inkl. verknüpftem persönlichen Anliegen.
  async function deleteGoal(goalId) {
    const all = [...publicGoals, ...myGoals, ...communityGoals, ...sharedGoals]
    const goal = all.find(g => g.id === goalId)
    const { error } = await supabase.from('prayer_goals').delete().eq('id', goalId).eq('created_by', user.id)
    if (error) throw error
    if (goal?.personal_prayer_request_id) {
      await supabase.from('personal_prayer_requests').delete().eq('id', goal.personal_prayer_request_id).eq('owner_id', user.id)
    }
    setPublicGoals(p => p.filter(g => g.id !== goalId))
    setMyGoals(p => p.filter(g => g.id !== goalId))
    setCommunityGoals(p => p.filter(g => g.id !== goalId))
    setSharedGoals(p => p.filter(g => g.id !== goalId))
    return goal
  }

  // Für die Home-Seite: aktivste öffentlichen Ziele
  const featuredGoals = publicGoals.slice(0, 3)

  return { publicGoals, myGoals, communityGoals, sharedGoals, featuredGoals, loading, createGoal, deleteGoal, reload: load }
}
