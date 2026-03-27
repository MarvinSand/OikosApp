import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useOikosMaps() {
  const { user } = useAuth()
  const [maps, setMaps] = useState([])
  const [activeMapId, setActiveMapId] = useState(null)
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadMaps()
  }, [user])

  useEffect(() => {
    if (!activeMapId) { setPeople([]); return }
    loadPeople(activeMapId)
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
    setPeople(data || [])
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
  }

  return {
    maps,
    activeMapId,
    setActiveMapId,
    activeMap: maps.find(m => m.id === activeMapId),
    people,
    loading,
    createMap,
    updateMap,
    addPerson,
    updatePerson,
    deletePerson,
  }
}
