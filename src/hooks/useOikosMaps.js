import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useOikosMaps() {
  const { user } = useAuth()
  const [maps, setMaps] = useState([])
  const [activeMapId, setActiveMapId] = useState(null)
  const [people, setPeople] = useState([])
  const [connections, setConnections] = useState([])
  const [overlayData, setOverlayData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadMaps()
  }, [user])

  useEffect(() => {
    if (!activeMapId) { setPeople([]); setConnections([]); setOverlayData([]); return }
    loadPeople(activeMapId)
    loadConnections(activeMapId)
  }, [activeMapId])

  async function loadMaps() {
    const { data } = await supabase
      .from('oikos_maps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    setMaps(data || [])
    if (data?.length > 0) setActiveMapId(data[0].id)
    setLoading(false)
  }

  async function loadPeople(mapId) {
    const { data } = await supabase
      .from('oikos_people')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at')
    const persons = data || []
    setPeople(persons)
    await loadOverlayPeopleFor(persons)
  }

  async function loadOverlayPeopleFor(persons) {
    const withOverlay = persons.filter(p => p.overlay_map_ids?.length > 0)
    if (withOverlay.length === 0) { setOverlayData([]); return }

    const results = await Promise.all(
      withOverlay.map(p =>
        supabase
          .from('oikos_people')
          .select('id, name, is_christian')
          .in('map_id', p.overlay_map_ids)
      )
    )
    setOverlayData(withOverlay.map((p, i) => ({
      parentPersonId: p.id,
      persons: results[i].data || [],
      showChristian: p.overlay_show_christian !== false,
      showNonChristian: p.overlay_show_non_christian !== false,
    })))
  }

  async function loadConnections(mapId) {
    const { data } = await supabase
      .from('oikos_connections')
      .select('id, source_person_id, target_person_id, label')
      .eq('map_id', mapId)
    setConnections(data || [])
  }

  async function createMap({ name, visibility = 'private', visibility_user_ids = [], visibility_community_id = null }) {
    const { data, error } = await supabase
      .from('oikos_maps')
      .insert({ user_id: user.id, name, visibility, visibility_user_ids, visibility_community_id })
      .select()
      .single()
    if (error) throw error
    setMaps(prev => [...prev, data])
    setActiveMapId(data.id)
    return data
  }

  async function updateMap(mapId, updates) {
    const { data, error } = await supabase
      .from('oikos_maps')
      .update(updates)
      .eq('id', mapId)
      .select()
      .single()
    if (error) throw error
    setMaps(prev => prev.map(m => m.id === mapId ? data : m))
    return data
  }

  async function addPerson(name) {
    const { data, error } = await supabase
      .from('oikos_people')
      .insert({ map_id: activeMapId, user_id: user.id, name, impact_stage: 1 })
      .select()
      .single()
    if (error) throw error
    setPeople(prev => [...prev, data])
    return data
  }

  async function updatePerson(id, updates) {
    const { data, error } = await supabase
      .from('oikos_people')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setPeople(prev => prev.map(p => p.id === id ? data : p))
  }

  async function deletePerson(id) {
    await supabase.from('oikos_people').delete().eq('id', id)
    setPeople(prev => prev.filter(p => p.id !== id))
    setConnections(prev => prev.filter(c => c.source_person_id !== id && c.target_person_id !== id))
    setOverlayData(prev => prev.filter(od => od.parentPersonId !== id))
  }

  async function movePersonPosition(personId, posX, posY) {
    await supabase.from('oikos_people').update({ pos_x: posX, pos_y: posY }).eq('id', personId)
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, pos_x: posX, pos_y: posY } : p))
  }

  async function createConnection(sourceId, targetId, label) {
    const existing = connections.find(c =>
      (c.source_person_id === sourceId && c.target_person_id === targetId) ||
      (c.source_person_id === targetId && c.target_person_id === sourceId)
    )
    if (existing) return existing

    const { data, error } = await supabase
      .from('oikos_connections')
      .insert({ map_id: activeMapId, source_person_id: sourceId, target_person_id: targetId, label: label || null })
      .select()
      .single()
    if (error) throw error
    if (data) setConnections(prev => [...prev, data])
    return data
  }

  async function deleteConnection(connectionId) {
    setConnections(prev => prev.filter(c => c.id !== connectionId))
    await supabase.from('oikos_connections').delete().eq('id', connectionId)
  }

  async function linkAccount(personId, linkedUserId) {
    await supabase.from('oikos_people').update({ linked_user_id: linkedUserId }).eq('id', personId)
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, linked_user_id: linkedUserId } : p))
  }

  async function unlinkAccount(personId) {
    await supabase.from('oikos_people').update({ linked_user_id: null, overlay_map_ids: [] }).eq('id', personId)
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, linked_user_id: null, overlay_map_ids: [] } : p))
    setOverlayData(prev => prev.filter(od => od.parentPersonId !== personId))
  }

  async function updatePersonOverlay(personId, { overlay_map_ids, overlay_show_christian, overlay_show_non_christian }) {
    const ids = overlay_map_ids || []
    const updates = {
      overlay_map_ids: ids,
      overlay_show_christian: overlay_show_christian !== false,
      overlay_show_non_christian: overlay_show_non_christian !== false,
    }
    await supabase.from('oikos_people').update(updates).eq('id', personId)
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, ...updates } : p))

    if (ids.length > 0) {
      const { data } = await supabase
        .from('oikos_people')
        .select('id, name, is_christian')
        .in('map_id', ids)
      setOverlayData(prev => {
        const rest = prev.filter(od => od.parentPersonId !== personId)
        return [...rest, {
          parentPersonId: personId,
          persons: data || [],
          showChristian: overlay_show_christian !== false,
          showNonChristian: overlay_show_non_christian !== false,
        }]
      })
    } else {
      setOverlayData(prev => prev.filter(od => od.parentPersonId !== personId))
    }
  }

  return {
    maps,
    activeMapId,
    setActiveMapId,
    activeMap: maps.find(m => m.id === activeMapId),
    people,
    connections,
    overlayData,
    loading,
    createMap,
    updateMap,
    addPerson,
    updatePerson,
    deletePerson,
    movePersonPosition,
    createConnection,
    deleteConnection,
    linkAccount,
    unlinkAccount,
    updatePersonOverlay,
    reloadMap: loadMaps,
  }
}
