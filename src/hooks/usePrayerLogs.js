import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Hook für alle Gebets-Logs einer Person (für die Timeline)
export function usePersonPrayerTimeline(personId) {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!personId || !user) return
    load()
  }, [personId, user?.id])

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
