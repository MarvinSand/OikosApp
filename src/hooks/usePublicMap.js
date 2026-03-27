import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePublicMap(userId, mapId) {
  const [map, setMap] = useState(null)
  const [people, setPeople] = useState([])
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !mapId) return
    load()
  }, [userId, mapId])

  async function load() {
    setLoading(true)
    const [{ data: mapData }, { data: peopleData }, { data: ownerProfile }] = await Promise.all([
      supabase
        .from('oikos_maps')
        .select('id, name, visibility, visibility_user_ids, visibility_community_id, user_id')
        .eq('id', mapId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('oikos_people')
        .select('id, name, impact_stage, is_christian, relationship_type, notes, map_id, user_id')
        .eq('map_id', mapId)
        .order('created_at'),
      supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single(),
    ])
    setMap(mapData || null)
    setPeople(peopleData || [])
    setOwnerName(ownerProfile?.full_name || ownerProfile?.username || 'Nutzer')
    setLoading(false)
  }

  return { map, people, ownerName, loading }
}
