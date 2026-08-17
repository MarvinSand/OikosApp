import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const DEFAULT_PREFS = {
  notify_prayer_requests: true,
  notify_feed_posts: false,
  notify_oikos_entries: false,
  notify_prayers_for_oikos: false,
  notify_storyline_entries: false,
}

// Lädt alle notification_preferences-Zeilen des aktuellen Users in EINER Query
// (statt pro Freund einzeln wie useNotificationPrefs) – für die Übersichtsseite
// "Von wem bekomme ich was".
export function useAllNotificationPrefs() {
  const { user } = useAuth()
  const [prefsByTargetId, setPrefsByTargetId] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('notification_preferences')
      .select('target_user_id, notify_prayer_requests, notify_feed_posts, notify_oikos_entries, notify_prayers_for_oikos, notify_storyline_entries')
      .eq('user_id', user.id)

    setPrefsByTargetId(Object.fromEntries((data || []).map(row => [row.target_user_id, row])))
    setLoading(false)
  }

  function getPrefs(targetUserId) {
    return prefsByTargetId[targetUserId] || DEFAULT_PREFS
  }

  return { prefsByTargetId, getPrefs, loading, reload: load }
}
