import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { subscribeShared } from '../lib/realtime'
import { useAuth } from './useAuth'

// Modul-Cache + In-Flight-Dedupe wie in useNotifications.js: Home, FriendsView
// und ConversationView nutzen diesen Hook gleichzeitig bzw. kurz nacheinander.
// Ohne Cache lief die komplette 4-Runden-Abfragekette (Mitgliedschaften →
// Konversationen → Nachrichten/Profile) bei jedem Mount erneut – u. a. auf
// Home nur, um das `hasUnread`-Badge zu berechnen.
let cache = { userId: null, lists: null }
let inFlight = null

export function useConversations() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const cached = cache.userId === userId ? cache.lists : null
  const [directChats, setDirectChats] = useState(cached?.directChats || [])
  const [communityChats, setCommunityChats] = useState(cached?.communityChats || [])
  const [activityChats, setActivityChats] = useState(cached?.activityChats || [])
  const [loading, setLoading] = useState(!cached)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async () => {
    if (!user) return

    if (inFlight && cache.userId === user.id) {
      setLoading(true)
      const lists = await inFlight
      if (!mounted.current) return
      setDirectChats(lists.directChats)
      setCommunityChats(lists.communityChats)
      setActivityChats(lists.activityChats)
      setLoading(false)
      return
    }

    setLoading(true)
    cache = { userId: user.id, lists: null }
    inFlight = fetchConversations().finally(() => { inFlight = null })
    try {
      const lists = await inFlight
      cache = { userId: user.id, lists }
      if (!mounted.current) return
      setDirectChats(lists.directChats)
      setCommunityChats(lists.communityChats)
      setActivityChats(lists.activityChats)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  // Realtime: subscribe to new messages to trigger reload
  useEffect(() => {
    if (!user) return
    // Ein geteilter Kanal für alle Instanzen (Home, FriendsView,
    // ConversationView) statt einem Abo pro Mount. Reload zusätzlich
    // gebündelt – bei einem Schwall Inserts lief sonst die komplette
    // Query-Kette pro einzelnem Event.
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

  async function startDirectChat(otherUserId) {
    const { data, error } = await supabase.rpc('start_direct_chat', {
      other_user_id: otherUserId,
    })
    if (error) throw error
    await load()
    return data
  }

  const hasUnread =
    directChats.some(c => c.unread) ||
    communityChats.some(c => c.unread) ||
    activityChats.some(c => c.unread)

  return {
    directChats,
    communityChats,
    activityChats,
    hasUnread,
    loading,
    startDirectChat,
    reload: load,
  }
}

// Vorher: bis zu 9 Requests (Mitgliedschaften → Konversationen je Typ →
// Nachrichten/Gegenüber/Community-Mitgliedschaften → Profile). Die
// `get_my_conversations()`-RPC baut dieselbe Mitgliedschafts-Logik (direkt
// über conversation_members, community-weit über get_my_community_ids())
// serverseitig per LATERAL JOIN zusammen und liefert pro Konversation schon
// die letzte Nachricht, das Gegenüber/die Community/Aktivität und ein fertig
// berechnetes `unread` – ein einziger Request.
async function fetchConversations() {
  const { data, error } = await supabase.rpc('get_my_conversations')
  if (error) throw error

  const byType = { direct: [], community: [], activity: [] }
  for (const row of (data || [])) {
    const lastMessage = row.last_message || null
    const entry = { id: row.id, lastMessage, unread: row.unread }
    if (row.type === 'direct') {
      byType.direct.push({ ...entry, type: 'direct', otherUser: row.other_user })
    } else if (row.type === 'community') {
      byType.community.push({ ...entry, type: 'community', community: row.community || { id: row.community_id, name: '?' } })
    } else if (row.type === 'activity') {
      byType.activity.push({
        ...entry,
        type: 'activity',
        activity: row.activity || { id: row.activity_id, title: 'Aktivität', activity_emoji: '📍', activity_type: '' },
      })
    }
  }

  const byRecency = (a, b) => {
    const ta = a.lastMessage?.created_at || '1970-01-01'
    const tb = b.lastMessage?.created_at || '1970-01-01'
    return tb.localeCompare(ta)
  }

  return {
    directChats: byType.direct.sort(byRecency),
    communityChats: byType.community.sort(byRecency),
    activityChats: byType.activity.sort(byRecency),
  }
}
