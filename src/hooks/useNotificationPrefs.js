import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const DEFAULT_PREFS = {
  notify_prayer_requests: true,
  notify_oikos_entries: false,
  notify_prayers_for_oikos: false,
}

export function useNotificationPrefs(targetUserId) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !targetUserId) {
      setLoading(false)
      return
    }
    load()
  }, [user?.id, targetUserId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('notification_preferences')
      .select('notify_prayer_requests, notify_oikos_entries, notify_prayers_for_oikos')
      .eq('user_id', user.id)
      .eq('target_user_id', targetUserId)
      .maybeSingle()

    if (data) {
      setPrefs({
        notify_prayer_requests: data.notify_prayer_requests,
        notify_oikos_entries: data.notify_oikos_entries,
        notify_prayers_for_oikos: data.notify_prayers_for_oikos,
      })
    } else {
      setPrefs(DEFAULT_PREFS)
    }
    setLoading(false)
  }

  async function updatePref(field, value) {
    // Optimistic update
    setPrefs(prev => ({ ...prev, [field]: value }))

    await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          target_user_id: targetUserId,
          [field]: value,
        },
        { onConflict: 'user_id,target_user_id' }
      )
  }

  return { prefs, loading, updatePref }
}
