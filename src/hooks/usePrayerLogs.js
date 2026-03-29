import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePrayerLogs(prayerRequestId) {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!prayerRequestId || !user) return
    load()
  }, [prayerRequestId])

  async function load() {
    setLoading(true)
    const { data: logsData } = await supabase
      .from('prayer_logs')
      .select('*')
      .eq('prayer_request_id', prayerRequestId)
      .order('created_at', { ascending: false })
    const logs = logsData || []

    // Fetch profiles for unique user IDs
    const userIds = [...new Set(logs.map(l => l.user_id))]
    let profilesMap = {}
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username, is_christian')
        .in('id', userIds)
      for (const p of (profilesData || [])) profilesMap[p.id] = p
    }

    setLogs(logs.map(l => ({ ...l, profiles: profilesMap[l.user_id] || null })))
    setLoading(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayLogs = logs.filter(l => l.created_at.split('T')[0] === todayStr)
  const hasPrayedToday = todayLogs.some(l => l.user_id === user?.id)
  const countToday = todayLogs.length

  // Unique users who have ever prayed for this request (deduplicated, most recent first)
  const prayersByUser = []
  const seenIds = new Set()
  for (const log of logs) {
    if (!seenIds.has(log.user_id)) {
      seenIds.add(log.user_id)
      prayersByUser.push({ userId: log.user_id, profile: log.profiles || null })
    }
  }

  async function logPrayer() {
    if (hasPrayedToday) return
    const tempId = 'temp-' + Date.now()
    const optimistic = {
      id: tempId, prayer_request_id: prayerRequestId,
      user_id: user.id, created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        username: user.email?.split('@')[0] || null,
        is_christian: null,
      },
    }
    setLogs(l => [optimistic, ...l])

    const { data, error } = await supabase
      .from('prayer_logs')
      .insert({ prayer_request_id: prayerRequestId, user_id: user.id })
      .select()
      .single()

    if (error) {
      setLogs(l => l.filter(x => x.id !== tempId))
      throw error
    }
    // Keep optimistic profile data (we already know the current user's profile)
    setLogs(l => l.map(x => x.id === tempId ? { ...data, profiles: optimistic.profiles } : x))
  }

  return { logs, loading, hasPrayedToday, countToday, prayersByUser, logPrayer }
}

// Hook für alle Gebets-Logs einer Person (für die Timeline)
export function usePersonPrayerTimeline(personId) {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!personId || !user) return
    load()
  }, [personId])

  async function load() {
    setLoading(true)
    // Erst alle prayer_request IDs für diese Person holen
    const { data: reqs } = await supabase
      .from('prayer_requests')
      .select('id')
      .eq('person_id', personId)

    if (!reqs || reqs.length === 0) { setLogs([]); setLoading(false); return }

    const ids = reqs.map(r => r.id)
    const { data } = await supabase
      .from('prayer_logs')
      .select('*, prayer_requests(title)')
      .in('prayer_request_id', ids)
      .order('created_at', { ascending: false })
      .limit(showAll ? 100 : 30)

    setLogs(data || [])
    setLoading(false)
  }

  // Nach Tag gruppieren
  const grouped = logs.reduce((acc, log) => {
    const day = log.created_at.split('T')[0]
    if (!acc[day]) acc[day] = []
    acc[day].push(log)
    return acc
  }, {})

  return { grouped, loading, userId: user?.id, loadMore: () => setShowAll(true) }
}
