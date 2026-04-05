import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePrayerRequests(personId) {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!personId || !user) return
    load()
  }, [personId, user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('person_id', personId)
      .or(`owner_id.eq.${user.id},is_public.eq.true`)
      .order('is_answered')
      .order('created_at')
    setRequests(data || [])
    setLoading(false)
  }

  async function addRequest({ title, description, is_public }) {
    const tempId = 'temp-' + Date.now()
    const optimistic = {
      id: tempId, person_id: personId, owner_id: user.id,
      title, description, is_public, is_answered: false,
      created_at: new Date().toISOString(),
    }
    setRequests(r => [...r, optimistic])

    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({ person_id: personId, owner_id: user.id, title, description: description || null, is_public })
      .select().single()

    if (error) {
      setRequests(r => r.filter(x => x.id !== tempId))
      throw error
    }
    setRequests(r => r.map(x => x.id === tempId ? data : x))
    return data
  }

  async function updateRequest(id, updates) {
    setRequests(r => r.map(x => x.id === id ? { ...x, ...updates } : x))
    const { error } = await supabase
      .from('prayer_requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { await load(); throw error }
  }

  async function deleteRequest(id) {
    setRequests(r => r.filter(x => x.id !== id))
    await supabase.from('prayer_requests').delete().eq('id', id)
  }

  async function toggleAnswered(id) {
    const req = requests.find(r => r.id === id)
    if (!req) return
    await updateRequest(id, { is_answered: !req.is_answered })
  }

  async function togglePublic(id) {
    const req = requests.find(r => r.id === id)
    if (!req) return
    await updateRequest(id, { is_public: !req.is_public })
  }

  return { requests, loading, addRequest, updateRequest, deleteRequest, toggleAnswered, togglePublic, reload: load }
}
