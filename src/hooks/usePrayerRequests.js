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
    // Kernliste OHNE Profil-Embed laden – so kann ein nicht auflösbarer Join die
    // Liste niemals still leeren (dadurch verschwand ein gerade gespeichertes
    // Anliegen wieder). Clientseitig filtern statt .or() (PostgREST-Eigenheiten).
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('person_id', personId)
      .order('is_answered')
      .order('created_at')
    if (error) console.error('[usePrayerRequests] load() fehlgeschlagen:', error)
    const visible = (data || []).filter(r => r.owner_id === user.id || r.is_public === true)
    setRequests(visible)
    setLoading(false)

    // Autoren-Profile separat (best effort) nachladen und einmischen – ein Fehler
    // hier lässt die bereits angezeigten Anliegen unberührt.
    const ownerIds = [...new Set(visible.map(r => r.owner_id).filter(Boolean))]
    if (ownerIds.length === 0) return
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, gender, is_christian')
      .in('id', ownerIds)
    if (!profs?.length) return
    const byId = Object.fromEntries(profs.map(p => [p.id, p]))
    setRequests(rows => rows.map(r => r.profiles ? r : { ...r, profiles: byId[r.owner_id] || null }))
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

  async function togglePinned(id) {
    const req = requests.find(r => r.id === id)
    if (!req) return
    await updateRequest(id, { is_pinned: !req.is_pinned })
  }

  return { requests, loading, addRequest, updateRequest, deleteRequest, toggleAnswered, togglePublic, togglePinned, reload: load }
}
