import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePublicMap(userId, mapId) {
  const [map, setMap] = useState(null)
  const [people, setPeople] = useState([])
  const [connections, setConnections] = useState([])
  const [places, setPlaces] = useState([])
  const [placeConnections, setPlaceConnections] = useState([])
  const [ownerName, setOwnerName] = useState('')
  const [linkedProfiles, setLinkedProfiles] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !mapId) return
    load()
  }, [userId, mapId])

  // Profile verlinkter Personen nachladen (für AccountLinkingSection in PersonDetailSheet)
  useEffect(() => {
    const linkedIds = people
      .filter(p => p.linked_user_id)
      .map(p => p.linked_user_id)
      .filter(id => !linkedProfiles[id])

    if (linkedIds.length === 0) return

    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', linkedIds)
      .then(({ data }) => {
        if (!data) return
        setLinkedProfiles(prev => {
          const next = { ...prev }
          data.forEach(profile => { next[profile.id] = profile })
          return next
        })
      })
  }, [people])

  async function load() {
    setLoading(true)
    const [{ data: mapData }, { data: peopleData }, { data: connData }, { data: placesData }, { data: ownerProfile }] = await Promise.all([
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
        .from('oikos_places')
        .select('*')
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
    setConnections(connData || [])
    const ps = placesData || []
    setPlaces(ps)
    setOwnerName(ownerProfile?.full_name || ownerProfile?.username || 'Nutzer')

    if (ps.length > 0) {
      const { data: conns } = await supabase
        .from('person_place_connections')
        .select('id, person_id, place_id, context, created_at, oikos_people:person_id(id, name)')
        .in('place_id', ps.map(p => p.id))
      setPlaceConnections(conns || [])
    } else {
      setPlaceConnections([])
    }
    setLoading(false)
  }

  return { map, people, connections, places, placeConnections, ownerName, linkedProfiles, loading }
}
