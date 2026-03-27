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
    const { data } = await supabase
      .from('prayer_logs')
      .select('*')
      .eq('prayer_request_id', prayerRequestId)
      .order('created_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayLogs = logs.filter(l => l.created_at.split('T')[0] === todayStr)
  const hasPrayedToday = todayLogs.some(l => l.user_id === user?.id)
  const countToday = todayLogs.length

  async function logPrayer() {
    if (hasPrayedToday) return
    const tempId = 'temp-' + Date.now()
    const optimistic = {
      id: tempId, prayer_request_id: prayerRequestId,
      user_id: user.id, created_at: new Date().toISOString(),
    }
    setLogs(l => [optimistic, ...l])

    const { data, error } = await supabase
      .from('prayer_logs')
      .insert({ prayer_request_id: prayerRequestId, user_id: user.id })
      .select().single()

    if (error) {
      setLogs(l => l.filter(x => x.id !== tempId))
      throw error
    }
    setLogs(l => l.map(x => x.id === tempId ? data : x))
  }

  return { logs, loading, hasPrayedToday, countToday, logPrayer }
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
