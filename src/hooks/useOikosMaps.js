import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// LocalStorage helpers for is_secondary persistence (fallback if DB column missing)
function getSecondaryIds() {
  try { return new Set(JSON.parse(localStorage.getItem('oikos_secondary_ids') || '[]')) }
  catch { return new Set() }
}
function saveSecondaryId(id, isSecondary) {
  const ids = getSecondaryIds()
  if (isSecondary) ids.add(id); else ids.delete(id)
  localStorage.setItem('oikos_secondary_ids', JSON.stringify([...ids]))
}

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
    const secondaryIds = getSecondaryIds()
    const persons = (data || []).map(p => ({
      ...p,
      is_secondary: p.is_secondary || secondaryIds.has(p.id),
    }))
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
      .select('*')
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

  async function deleteMap(mapId) {
    const { error } = await supabase.from('oikos_maps').delete().eq('id', mapId)
    if (error) throw error
    const remaining = maps.filter(m => m.id !== mapId)
    setMaps(remaining)
    if (activeMapId === mapId) {
      setActiveMapId(remaining.length > 0 ? remaining[0].id : null)
    }
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

  async function addPerson(name, isSecondary = false) {
    const { data, error } = await supabase
      .from('oikos_people')
      .insert({ map_id: activeMapId, user_id: user.id, name, impact_stage: 1 })
      .select()
      .single()
    if (error) throw error
    const personData = { ...data, is_secondary: isSecondary || data.is_secondary || false }
    setPeople(prev => [...prev, personData])
    if (isSecondary) {
      saveSecondaryId(data.id, true)
      supabase.from('oikos_people').update({ is_secondary: true }).eq('id', data.id).then(() => {})
    }
    return personData
  }

  async function setPersonSecondary(id, isSecondary) {
    saveSecondaryId(id, isSecondary)
    setPeople(prev => prev.map(p => p.id === id ? { ...p, is_secondary: isSecondary } : p))
    supabase.from('oikos_people').update({ is_secondary: isSecondary }).eq('id', id).then(() => {})
  }

  async function updatePerson(id, updates) {
    // Optimistic update so UI responds immediately
    setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    try {
      const { data, error } = await supabase
        .from('oikos_people')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      // Merge: keep optimistic values for columns DB may not have returned
      setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates, ...data } : p))
    } catch (err) {
      // For new columns (circle_color, name_color) that may not exist yet,
      // keep the optimistic state so at least the session looks right.
      throw err
    }
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

  async function updateConnectionColor(connectionId, color) {
    setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, color } : c))
    try {
      await supabase.from('oikos_connections').update({ color }).eq('id', connectionId)
    } catch { /* column may not exist yet */ }
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
    setMaps,
    activeMapId,
    setActiveMapId,
    activeMap: maps.find(m => m.id === activeMapId),
    people,
    connections,
    overlayData,
    loading,
    createMap,
    updateMap,
    deleteMap,
    addPerson,
    setPersonSecondary,
    updatePerson,
    deletePerson,
    movePersonPosition,
    createConnection,
    deleteConnection,
    updateConnectionColor,
    linkAccount,
    unlinkAccount,
    updatePersonOverlay,
    reloadMap: loadMaps,
  }
}
