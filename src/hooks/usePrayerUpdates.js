import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePrayerUpdates(requestId, type) {
  const { user } = useAuth()
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requestId) { setLoading(false); return }
    load()
  }, [requestId, type]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const field = type === 'personal' ? 'personal_prayer_request_id' : 'prayer_request_id'
    const { data } = await supabase
      .from('prayer_updates')
      .select('*')
      .eq(field, requestId)
      .order('created_at', { ascending: false })
    setUpdates(data || [])
    setLoading(false)
  }

  async function addUpdate({ content, updateType = 'update', isPublic = true }) {
    if (!content?.trim() || !user) return
    const field = type === 'personal' ? 'personal_prayer_request_id' : 'prayer_request_id'
    const tempId = 'temp-' + Date.now()
    const optimistic = {
      id: tempId, [field]: requestId, author_id: user.id,
      content: content.trim(), update_type: updateType, is_public: isPublic,
      created_at: new Date().toISOString(),
    }
    setUpdates(prev => [optimistic, ...prev])

    const { data, error } = await supabase.from('prayer_updates').insert({
      [field]: requestId, author_id: user.id,
      content: content.trim(), update_type: updateType, is_public: isPublic,
    }).select().single()

    if (error) {
      setUpdates(prev => prev.filter(u => u.id !== tempId))
      throw error
    }
    setUpdates(prev => prev.map(u => u.id === tempId ? data : u))

    // If type answered, also mark the request
    if (updateType === 'answered') {
      const table = type === 'personal' ? 'personal_prayer_requests' : 'prayer_requests'
      await supabase.from(table).update({ is_answered: true, answered_at: new Date().toISOString() }).eq('id', requestId)
    }
    return data
  }

  async function deleteUpdate(updateId) {
    setUpdates(prev => prev.filter(u => u.id !== updateId))
    await supabase.from('prayer_updates').delete().eq('id', updateId)
  }

  return { updates, loading, addUpdate, deleteUpdate, reload: load }
}
