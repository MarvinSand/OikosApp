import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Lädt das Gebet des Tages, Teilnehmerzahl und ob der Nutzer heute schon mitgebetet hat.
export function useDailyPrayer() {
  const { user } = useAuth()
  const [daily, setDaily] = useState(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [hasPrayedToday, setHasPrayedToday] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data: dp } = await supabase
      .from('daily_prayers')
      .select('*')
      .eq('prayer_date', today)
      .maybeSingle()

    if (!dp) {
      setDaily(null); setParticipantCount(0); setHasPrayedToday(false); setLoading(false)
      return
    }
    setDaily(dp)

    const [{ count }, { data: myLog }] = await Promise.all([
      supabase.from('daily_prayer_logs').select('*', { count: 'exact', head: true }).eq('daily_prayer_id', dp.id),
      supabase.from('daily_prayer_logs').select('id').eq('daily_prayer_id', dp.id).eq('user_id', user.id).maybeSingle(),
    ])
    setParticipantCount(count || 0)
    setHasPrayedToday(!!myLog)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  async function logPrayed() {
    if (!daily || hasPrayedToday) return
    const { error } = await supabase
      .from('daily_prayer_logs')
      .insert({ daily_prayer_id: daily.id, user_id: user.id })
    if (!error) {
      setHasPrayedToday(true)
      setParticipantCount(c => c + 1)
    }
  }

  return { daily, participantCount, hasPrayedToday, loading, logPrayed, reload: load }
}
