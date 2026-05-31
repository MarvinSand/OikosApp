import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAnsweredPrayers() {
  const { user } = useAuth()
  const [answeredRequests, setAnsweredRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const [{ data: personal }, { data: oikos }] = await Promise.all([
      supabase.from('personal_prayer_requests')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_answered', true)
        .order('answered_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('prayer_requests')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_answered', true)
        .order('answered_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const all = [
      ...(personal || []).map(r => ({ ...r, _type: 'personal' })),
      ...(oikos || []).map(r => ({ ...r, _type: 'oikos' })),
    ].sort((a, b) => new Date(b.answered_at || b.created_at) - new Date(a.answered_at || a.created_at))

    setAnsweredRequests(all)
    setLoading(false)
  }

  const byMonth = answeredRequests.reduce((acc, req) => {
    const date = new Date(req.answered_at || req.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }).toUpperCase()
    if (!acc[key]) acc[key] = { label, requests: [] }
    acc[key].requests.push(req)
    return acc
  }, {})

  async function markAnswered(requestId, type, { note = '', answeredAt = null, shareAsTestimony = false } = {}) {
    const table = type === 'personal' ? 'personal_prayer_requests' : 'prayer_requests'
    await supabase.from(table).update({
      is_answered: true,
      answered_at: answeredAt || new Date().toISOString(),
      answered_note: note?.trim() || null,
      share_as_testimony: shareAsTestimony,
    }).eq('id', requestId)
    await load()
  }

  async function unmarkAnswered(requestId, type) {
    const table = type === 'personal' ? 'personal_prayer_requests' : 'prayer_requests'
    await supabase.from(table).update({
      is_answered: false, answered_at: null, answered_note: null, share_as_testimony: false,
    }).eq('id', requestId)
    await load()
  }

  return {
    answeredRequests, byMonth, totalCount: answeredRequests.length,
    loading, markAnswered, unmarkAnswered, reload: load,
  }
}
