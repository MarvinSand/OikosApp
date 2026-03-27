import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePersonalPrayer() {
  const { user } = useAuth()
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    const { data: reqs } = await supabase
      .from('personal_prayer_requests')
      .select('*')
      .eq('owner_id', user.id)
      .order('is_answered', { ascending: true })
      .order('created_at', { ascending: false })

    if (reqs && reqs.length > 0) {
      const { data: logs } = await supabase
        .from('personal_prayer_logs')
        .select('request_id')
        .in('request_id', reqs.map(r => r.id))

      const countMap = {}
      for (const l of (logs || [])) countMap[l.request_id] = (countMap[l.request_id] || 0) + 1
      setMyRequests(reqs.map(r => ({ ...r, prayerCount: countMap[r.id] || 0 })))
    } else {
      setMyRequests(reqs || [])
    }
    setLoading(false)
  }

  async function createRequest({ title, description, visibility }) {
    const { data, error } = await supabase
      .from('personal_prayer_requests')
      .insert({ owner_id: user.id, title, description: description || null, visibility })
      .select()
      .single()
    if (error) throw error
    setMyRequests(prev => [{ ...data, prayerCount: 0 }, ...prev])
    return data
  }

  async function markAnswered(id) {
    const { data } = await supabase
      .from('personal_prayer_requests')
      .update({ is_answered: true }).eq('id', id).select().single()
    setMyRequests(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }

  async function deleteRequest(id) {
    await supabase.from('personal_prayer_requests').delete().eq('id', id)
    setMyRequests(prev => prev.filter(r => r.id !== id))
  }

  return { myRequests, loading, createRequest, markAnswered, deleteRequest, reload: load }
}
