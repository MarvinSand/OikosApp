import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePlaces(mapId) {
  const { user } = useAuth()
  const [places, setPlaces] = useState([])
  const [placeConnections, setPlaceConnections] = useState([]) // { place_id, person_id, context, id }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mapId || !user) { setPlaces([]); setPlaceConnections([]); setLoading(false); return }
    load()
  }, [mapId, user?.id])

  async function load() {
    setLoading(true)
    const { data: placesData } = await supabase
      .from('oikos_places')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at')

    const ps = placesData || []
    setPlaces(ps)

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

  async function createPlace({ name, type = 'place', color = '#8A7060', posX = 0, posY = 0 }) {
    const { data, error } = await supabase
      .from('oikos_places')
      .insert({ map_id: mapId, owner_id: user.id, name, type, color, pos_x: posX, pos_y: posY })
      .select('*')
      .single()
    if (!error && data) setPlaces(prev => [...prev, data])
    return error ? null : data
  }

  async function updatePlace(placeId, updates) {
    const { pos_x, pos_y, name, type, color, notes, prayer_request, prayer_is_public, is_public } = updates
    const payload = {}
    if (pos_x !== undefined) payload.pos_x = pos_x
    if (pos_y !== undefined) payload.pos_y = pos_y
    if (name !== undefined) payload.name = name
    if (type !== undefined) payload.type = type
    if (color !== undefined) payload.color = color
    if (notes !== undefined) payload.notes = notes
    if (prayer_request !== undefined) payload.prayer_request = prayer_request
    if (prayer_is_public !== undefined) payload.prayer_is_public = prayer_is_public
    if (is_public !== undefined) payload.is_public = is_public

    setPlaces(prev => prev.map(p => p.id === placeId ? { ...p, ...payload } : p))
    await supabase.from('oikos_places').update(payload).eq('id', placeId)
  }

  async function deletePlace(placeId) {
    setPlaces(prev => prev.filter(p => p.id !== placeId))
    setPlaceConnections(prev => prev.filter(c => c.place_id !== placeId))
    await supabase.from('oikos_places').delete().eq('id', placeId)
  }

  async function connectPerson(placeId, personId, context = null) {
    const { data, error } = await supabase
      .from('person_place_connections')
      .insert({ place_id: placeId, person_id: personId, context })
      .select('id, person_id, place_id, context, created_at, oikos_people:person_id(id, name)')
      .single()
    if (!error && data) setPlaceConnections(prev => [...prev, data])
    return error ? null : data
  }

  async function disconnectPerson(placeId, personId) {
    setPlaceConnections(prev =>
      prev.filter(c => !(c.place_id === placeId && c.person_id === personId))
    )
    await supabase.from('person_place_connections')
      .delete()
      .eq('place_id', placeId)
      .eq('person_id', personId)
  }

  async function movePlacePosition(placeId, x, y) {
    setPlaces(prev => prev.map(p => p.id === placeId ? { ...p, pos_x: x, pos_y: y } : p))
    await supabase.from('oikos_places').update({ pos_x: x, pos_y: y }).eq('id', placeId)
  }

  return {
    places,
    placeConnections,
    loading,
    createPlace,
    updatePlace,
    deletePlace,
    connectPerson,
    disconnectPerson,
    movePlacePosition,
    reload: load,
  }
}
