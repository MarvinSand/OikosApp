import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { subscribeShared } from '../lib/realtime'
import { useAuth } from './useAuth'

// Für's Chat-Badge auf Home reicht ein Bit. `useConversations()` lädt dafür
// unnötig Nachrichteninhalte, Profile und Community-Namen mit (auch nach der
// RPC-Umstellung noch der teuerste einzelne Request im Home-Ladepfad) – die
// `has_unread_conversations()`-RPC beantwortet exakt diese eine Frage.
export function useHasUnreadConversations() {
  const { user } = useAuth()
  const [hasUnread, setHasUnread] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setHasUnread(false); return }
    const { data } = await supabase.rpc('has_unread_conversations')
    setHasUnread(!!data)
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    load()
    let timer = null
    const unsubscribe = subscribeShared(
      'messages-insert',
      [{ event: 'INSERT', schema: 'public', table: 'messages' }],
      () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => { timer = null; load() }, 400)
      }
    )
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [user?.id, load])

  return hasUnread
}
