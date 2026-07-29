import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useFriendships } from './useFriendships'

// Aggregiert die eigenen Oikos-Kontakte und die aller Geschwister (Freunde),
// deren Maps für einen sichtbar sind, zu "Beeten" für den gemeinsamen Garten.
// Wachstumsstufe kommt 1:1 von der bestehenden Impact-Map (impact_stage 1-6).
// Fremde Kontakte werden anonym geliefert (kein `name`) – nur das eigene Beet
// zeigt Namen.
export function useGarden() {
  const { user } = useAuth()
  const { friends, loading: friendsLoading } = useFriendships()
  const [plots, setPlots] = useState(null)

  const friendIds = useMemo(
    () => friends.map(f => f.otherUser?.id).filter(Boolean),
    [friends]
  )

  useEffect(() => {
    if (!user || friendsLoading) return
    let cancelled = false
    load()
    return () => { cancelled = true }

    async function load() {
      const { data: ownMaps } = await supabase
        .from('oikos_maps')
        .select('id')
        .eq('user_id', user.id)
      const ownMapIds = (ownMaps || []).map(m => m.id)

      let friendMaps = []
      if (friendIds.length > 0) {
        const [{ data: friendMapsRaw }, { data: myCommunities }] = await Promise.all([
          supabase
            .from('oikos_maps')
            .select('*')
            .in('user_id', friendIds)
            .neq('visibility', 'private'),
          supabase.from('community_members').select('community_id').eq('user_id', user.id),
        ])
        const myCommunityIds = (myCommunities || []).map(c => c.community_id)

        friendMaps = (friendMapsRaw || []).filter(map => {
          if (map.visibility === 'all_siblings') return true
          if (map.visibility === 'specific_include') return (map.visibility_user_ids || []).includes(user.id)
          if (map.visibility === 'specific_exclude') return !(map.visibility_user_ids || []).includes(user.id)
          if (map.visibility === 'community') return myCommunityIds.includes(map.visibility_community_id)
          return false
        })
      }

      const friendMapOwner = Object.fromEntries(friendMaps.map(m => [m.id, m.user_id]))
      const allMapIds = [...ownMapIds, ...friendMaps.map(m => m.id)]

      if (allMapIds.length === 0) {
        if (!cancelled) setPlots([])
        return
      }

      const { data: people } = await supabase
        .from('oikos_people')
        .select('id, map_id, name, impact_stage')
        .in('map_id', allMapIds)

      const personIds = (people || []).map(p => p.id)
      let harvestedIds = new Set()
      if (personIds.length > 0) {
        const { data: harvested } = await supabase
          .from('impact_map_progress')
          .select('person_id')
          .in('person_id', personIds)
          .eq('stage', 6)
          .not('completed_at', 'is', null)
        harvestedIds = new Set((harvested || []).map(h => h.person_id))
      }

      const ownMapSet = new Set(ownMapIds)
      const friendNameById = Object.fromEntries(
        friends.map(f => [f.otherUser?.id, f.otherUser?.full_name || f.otherUser?.username || 'Geschwister'])
      )

      const plotById = new Map()
      plotById.set(user.id, { ownerId: user.id, ownerName: 'Mein Garten', isOwn: true, plants: [] })
      friendMaps.forEach(m => {
        if (!plotById.has(m.user_id)) {
          plotById.set(m.user_id, {
            ownerId: m.user_id,
            ownerName: friendNameById[m.user_id] || 'Geschwister',
            isOwn: false,
            plants: [],
          })
        }
      })

      ;(people || []).forEach(p => {
        const isOwn = ownMapSet.has(p.map_id)
        const ownerId = isOwn ? user.id : friendMapOwner[p.map_id]
        const plot = plotById.get(ownerId)
        if (!plot) return
        plot.plants.push({
          id: p.id,
          mapId: p.map_id,
          isOwn,
          name: isOwn ? p.name : null,
          growthStage: Math.min(6, Math.max(1, p.impact_stage || 1)),
          isHarvested: harvestedIds.has(p.id),
        })
      })

      const result = [...plotById.values()]
        .filter(plot => plot.isOwn || plot.plants.length > 0)
        .sort((a, b) => (b.isOwn - a.isOwn))

      if (!cancelled) setPlots(result)
    }
  }, [user?.id, friendsLoading, friendIds.join(',')])

  return { plots, loading: plots === null }
}
