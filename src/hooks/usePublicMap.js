import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePublicMap(userId, mapId) {
  const [map, setMap] = useState(null)
  const [people, setPeople] = useState([])
  const [connections, setConnections] = useState([])
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !mapId) return
    load()
  }, [userId, mapId])

  async function load() {
    setLoading(true)
    const [{ data: mapData }, { data: peopleData }, { data: connData }, { data: ownerProfile }] = await Promise.all([
      supabase
        .from('oikos_maps')
        .select('id, name, visibility, visibility_user_ids, visibility_community_id, user_id')
        .eq('id', mapId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('oikos_people')
        .select('*')
        .eq('map_id', mapId)
        .order('created_at'),
      supabase
        .from('oikos_connections')
        .select('*')
        .eq('map_id', mapId),
      supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single(),
    ])
    setMap(mapData || null)
    setPeople(peopleData || [])
    setConnections(connData || [])
    setOwnerName(ownerProfile?.full_name || ownerProfile?.username || 'Nutzer')
    setLoading(false)
  }

  return { map, people, connections, ownerName, loading }
}
