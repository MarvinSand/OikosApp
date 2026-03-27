import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useConversations() {
  const { user } = useAuth()
  const [directChats, setDirectChats] = useState([])
  const [communityChats, setCommunityChats] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Load user's conversation_members
      const { data: memberRows } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

      const convIds = (memberRows || []).map(r => r.conversation_id)
      const lastReadMap = Object.fromEntries((memberRows || []).map(r => [r.conversation_id, r.last_read_at]))

      // 2. Load user's community_members
      const { data: communityMemberRows } = await supabase
        .from('community_members')
        .select('community_id, communities(id, name)')
        .eq('user_id', user.id)

      const communityIds = (communityMemberRows || []).map(r => r.community_id)
      const communityMap = Object.fromEntries(
        (communityMemberRows || []).map(r => [r.community_id, r.communities])
      )

      // 3. Fetch direct conversations where user is a member
      let directConvs = []
      if (convIds.length > 0) {
        const { data: directData } = await supabase
          .from('conversations')
          .select('id, type, community_id')
          .in('id', convIds)
          .eq('type', 'direct')
        directConvs = directData || []
      }

      // 4. Fetch community conversations
      let communityConvs = []
      if (communityIds.length > 0) {
        const { data: commData } = await supabase
          .from('conversations')
          .select('id, type, community_id')
          .in('community_id', communityIds)
          .eq('type', 'community')
        communityConvs = commData || []
      }

      // 5. Fetch last messages for all conversations
      const allConvIds = [
        ...directConvs.map(c => c.id),
        ...communityConvs.map(c => c.id),
      ]

      let lastMessageMap = {}
      if (allConvIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, type, text, is_deleted, created_at')
          .in('conversation_id', allConvIds)
          .order('created_at', { ascending: false })
          .limit(200)

        for (const msg of (msgs || [])) {
          if (!lastMessageMap[msg.conversation_id]) {
            lastMessageMap[msg.conversation_id] = msg
          }
        }
      }

      // 6. For direct chats: find the other user's profile
      const otherMemberRows = []
      if (directConvs.length > 0) {
        const { data: allMembers } = await supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', directConvs.map(c => c.id))
          .neq('user_id', user.id)
        otherMemberRows.push(...(allMembers || []))
      }

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

      // 8. For community chats: get last_read_at from conversation_members
      const communityConvIds = communityConvs.map(c => c.id)
      let communityLastReadMap = {}
      if (communityConvIds.length > 0) {
        const { data: commMembers } = await supabase
          .from('conversation_members')
          .select('conversation_id, last_read_at')
          .in('conversation_id', communityConvIds)
          .eq('user_id', user.id)
        communityLastReadMap = Object.fromEntries(
          (commMembers || []).map(r => [r.conversation_id, r.last_read_at])
        )
      }

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

      setDirectChats(builtDirectChats)
      setCommunityChats(builtCommunityChats)
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
    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => { load() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    directChats.some(c => c.unread) || communityChats.some(c => c.unread)

  return {
    directChats,
    communityChats,
    hasUnread,
    loading,
    startDirectChat,
    reload: load,
  }
}
