import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { readCache, writeCache } from '../lib/swrCache'

// Lädt Gebetsziele für Discover/Home/Meine/Community und erstellt neue.
//
// Vorher: 2 Vorab-Queries (Community-/Freundschafts-IDs) + 5 parallele
// visibility-Queries = 7 Requests. Die RLS-Policy "Read prayer_goals" auf
// `prayer_goals` implementiert exakt dieselbe OR-Logik (eigene ODER public
// ODER Community-Mitglied ODER Geschwister ODER gezielt freigegeben) bereits
// serverseitig – ein einzelner Select auf der `my_prayer_goals`-View (die
// nur ein `bucket`-Label ergänzt, RLS via security_invoker aber weiter
// greifen lässt) liefert dieselbe Ergebnismenge in einem Request.
function splitGoals(rows) {
  if (!Array.isArray(rows)) return null
  return {
    myGoals: rows.filter(g => g.bucket === 'mine'),
    communityGoals: rows.filter(g => g.bucket === 'community'),
    sharedGoals: rows.filter(g => g.bucket === 'shared'),
    publicGoals: sortByParticipants(rows.filter(g => g.bucket === 'public')),
  }
}

function sortByParticipants(goals) {
  return goals.sort((a, b) => (b.participant_count || 0) - (a.participant_count || 0) || b.created_at.localeCompare(a.created_at))
}

export function usePrayerGoals() {
  const { user } = useAuth()
  // Zuletzt geladener Stand als Startwert (siehe swrCache.js)
  const [cached] = useState(() => splitGoals(readCache(user?.id, 'prayerGoals')))
  const [publicGoals, setPublicGoals] = useState(cached?.publicGoals ?? [])
  const [myGoals, setMyGoals] = useState(cached?.myGoals ?? [])
  const [communityGoals, setCommunityGoals] = useState(cached?.communityGoals ?? [])
  const [sharedGoals, setSharedGoals] = useState(cached?.sharedGoals ?? [])
  const [loading, setLoading] = useState(!cached)

  const load = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('my_prayer_goals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) { setLoading(false); return }
    const rows = data || []
    writeCache(user.id, 'prayerGoals', rows)
    setMyGoals(rows.filter(g => g.bucket === 'mine'))
    setCommunityGoals(rows.filter(g => g.bucket === 'community'))
    setSharedGoals(rows.filter(g => g.bucket === 'shared'))
    // Featured/Discover-Ansicht sortiert nach Teilnehmerzahl statt Datum –
    // auf dem bereits geladenen (kleinen) Array, nicht per Extra-Query.
    setPublicGoals(sortByParticipants(rows.filter(g => g.bucket === 'public')))

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
    load() // Cache (und bucket-Zuordnung) im Hintergrund auffrischen
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
    load()
    return goal
  }

  // Für die Home-Seite: aktivste öffentlichen Ziele
  const featuredGoals = publicGoals.slice(0, 3)

  return { publicGoals, myGoals, communityGoals, sharedGoals, featuredGoals, loading, createGoal, deleteGoal, reload: load }
}
