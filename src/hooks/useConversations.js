import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { subscribeShared } from '../lib/realtime'
import { useAuth } from './useAuth'

export function useConversations() {
  const { user } = useAuth()
  const [directChats, setDirectChats] = useState([])
  const [communityChats, setCommunityChats] = useState([])
  const [activityChats, setActivityChats] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1./2. Eigene conversation_members + community_members parallel laden –
      // die beiden Abfragen hängen nicht voneinander ab.
      const [{ data: memberRows }, { data: communityMemberRows }] = await Promise.all([
        supabase
          .from('conversation_members')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id),
        supabase
          .from('community_members')
          .select('community_id, communities(id, name)')
          .eq('user_id', user.id),
      ])

      const convIds = (memberRows || []).map(r => r.conversation_id)
      const lastReadMap = Object.fromEntries((memberRows || []).map(r => [r.conversation_id, r.last_read_at]))

      const communityIds = (communityMemberRows || []).map(r => r.community_id)
      const communityMap = Object.fromEntries(
        (communityMemberRows || []).map(r => [r.community_id, r.communities])
      )

      // 3./4./4b. Direkt-, Community- und Aktivitäts-Konversationen parallel.
      const [directRes, communityRes, activityRes] = await Promise.all([
        convIds.length > 0
          ? supabase
              .from('conversations')
              .select('id, type, community_id')
              .in('id', convIds)
              .eq('type', 'direct')
          : Promise.resolve({ data: [] }),
        communityIds.length > 0
          ? supabase
              .from('conversations')
              .select('id, type, community_id')
              .in('community_id', communityIds)
              .eq('type', 'community')
          : Promise.resolve({ data: [] }),
        convIds.length > 0
          ? supabase
              .from('conversations')
              .select('id, type, activity_id, activity:world_map_activities!activity_id(id, title, activity_emoji, activity_type)')
              .in('id', convIds)
              .eq('type', 'activity')
              // activity_id-Spalte existiert evtl. noch nicht – dann leer statt Fehler
              .then(res => res, () => ({ data: [], error: true }))
          : Promise.resolve({ data: [] }),
      ])

      const directConvs = directRes.data || []
      const communityConvs = communityRes.data || []
      const activityConvs = activityRes.error ? [] : (activityRes.data || [])

      // 5. Fetch last messages for all conversations
      const allConvIds = [
        ...directConvs.map(c => c.id),
        ...communityConvs.map(c => c.id),
        ...activityConvs.map(c => c.id),
      ]

      const communityConvIds = communityConvs.map(c => c.id)

      // 5./6./8. Letzte Nachrichten, Gegenüber der Direkt-Chats und
      // last_read_at der Community-Chats parallel laden.
      const [msgRes, otherMembersRes, commMembersRes] = await Promise.all([
        allConvIds.length > 0
          ? supabase
              .from('messages')
              .select('id, conversation_id, sender_id, type, text, is_deleted, created_at')
              .in('conversation_id', allConvIds)
              .order('created_at', { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [] }),
        directConvs.length > 0
          ? supabase
              .from('conversation_members')
              .select('conversation_id, user_id')
              .in('conversation_id', directConvs.map(c => c.id))
              .neq('user_id', user.id)
          : Promise.resolve({ data: [] }),
        communityConvIds.length > 0
          ? supabase
              .from('conversation_members')
              .select('conversation_id, last_read_at')
              .in('conversation_id', communityConvIds)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ])

      const lastMessageMap = {}
      for (const msg of (msgRes.data || [])) {
        if (!lastMessageMap[msg.conversation_id]) {
          lastMessageMap[msg.conversation_id] = msg
        }
      }

      const otherMemberRows = otherMembersRes.data || []
      const communityLastReadMap = Object.fromEntries(
        (commMembersRes.data || []).map(r => [r.conversation_id, r.last_read_at])
      )

      const otherUserIds = [...new Set(otherMemberRows.map(r => r.user_id))]
      let profileMap = {}
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, is_christian, gender')
          .in('id', otherUserIds)
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }

      const otherUserByConv = Object.fromEntries(
        otherMemberRows.map(r => [r.conversation_id, profileMap[r.user_id]])
      )

      // 7. Build direct chats list
      const builtDirectChats = directConvs
        .map(conv => {
          const lastMessage = lastMessageMap[conv.id] || null
          const lastReadAt = lastReadMap[conv.id] || '1970-01-01'
          const unread = lastMessage
            ? lastMessage.sender_id !== user.id &&
              lastMessage.created_at > lastReadAt
            : false
          return {
            id: conv.id,
            type: 'direct',
            otherUser: otherUserByConv[conv.id] || null,
            lastMessage,
            unread,
          }
        })
        .sort((a, b) => {
          const ta = a.lastMessage?.created_at || '1970-01-01'
          const tb = b.lastMessage?.created_at || '1970-01-01'
          return tb.localeCompare(ta)
        })

      // 8. Community-Chats bauen (last_read_at kam bereits oben parallel mit)
      const builtCommunityChats = communityConvs
        .map(conv => {
          const lastMessage = lastMessageMap[conv.id] || null
          const lastReadAt = communityLastReadMap[conv.id] || lastReadMap[conv.id] || '1970-01-01'
          const unread = lastMessage
            ? lastMessage.sender_id !== user.id &&
              lastMessage.created_at > lastReadAt
            : false
          return {
            id: conv.id,
            type: 'community',
            community: communityMap[conv.community_id] || { id: conv.community_id, name: '?' },
            lastMessage,
            unread,
          }
        })
        .sort((a, b) => {
          const ta = a.lastMessage?.created_at || '1970-01-01'
          const tb = b.lastMessage?.created_at || '1970-01-01'
          return tb.localeCompare(ta)
        })

      // Build activity chats list
      const builtActivityChats = activityConvs
        .map(conv => {
          const lastMessage = lastMessageMap[conv.id] || null
          const lastReadAt = lastReadMap[conv.id] || '1970-01-01'
          const unread = lastMessage
            ? lastMessage.sender_id !== user.id && lastMessage.created_at > lastReadAt
            : false
          return {
            id: conv.id,
            type: 'activity',
            activity: conv.activity || { id: conv.activity_id, title: 'Aktivität', activity_emoji: '📍', activity_type: '' },
            lastMessage,
            unread,
          }
        })
        .sort((a, b) => {
          const ta = a.lastMessage?.created_at || '1970-01-01'
          const tb = b.lastMessage?.created_at || '1970-01-01'
          return tb.localeCompare(ta)
        })

      setDirectChats(builtDirectChats)
      setCommunityChats(builtCommunityChats)
      setActivityChats(builtActivityChats)
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
