import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const PAGE_SIZE = 50
const MSG_SELECT = 'id, conversation_id, sender_id, type, text, bible_verse_reference, bible_verse_text, personal_prayer_request_id, prayer_request_id, is_deleted, created_at, reply_to_id, forwarded_from_id, is_pinned, pinned_at'

async function attachProfiles(messages) {
  if (!messages || messages.length === 0) return messages
  const ids = [...new Set(messages.map(m => m.sender_id).filter(Boolean))]
  if (ids.length === 0) return messages
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, is_christian, gender')
    .in('id', ids)
  const map = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  return messages.map(m => ({ ...m, profiles: map[m.sender_id] || null }))
}

async function attachReactions(messages) {
  if (!messages || messages.length === 0) return messages
  const ids = messages.map(m => m.id)
  const { data: reactions } = await supabase
    .from('message_reactions')
    .select('id, message_id, user_id, emoji, created_at')
    .in('message_id', ids)
  const map = {}
  ;(reactions || []).forEach(r => {
    if (!map[r.message_id]) map[r.message_id] = []
    map[r.message_id].push(r)
  })
  return messages.map(m => ({ ...m, reactions: map[m.id] || [] }))
}

export function useChat(conversationId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const offsetRef = useRef(0)

  const markAsRead = useCallback(async () => {
    if (!user || !conversationId) return
    await supabase
      .from('conversation_members')
      .upsert(
        { conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() },
        { onConflict: 'conversation_id,user_id' }
      )
  }, [conversationId, user?.id])

  const load = useCallback(async () => {
    if (!conversationId || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(MSG_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    if (!error && data) {
      const ordered = [...data].reverse()
      const withProfiles = await attachProfiles(ordered)
      const withReactions = await attachReactions(withProfiles)
      setMessages(withReactions)
      setHasMore(data.length === PAGE_SIZE)
      offsetRef.current = data.length
    }
    setLoading(false)
    await markAsRead()
  }, [conversationId, user?.id, markAsRead])

  useEffect(() => {
    if (!conversationId || !user) return
    setMessages([])
    offsetRef.current = 0
    load()
  }, [conversationId, user?.id])

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !user) return

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, is_christian, gender')
            .eq('id', newMsg.sender_id)
            .maybeSingle()
          const msgWithProfile = { ...newMsg, profiles: profile || null, reactions: [] }
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMsg.id)
            if (exists) {
              return prev.map(m => m.id === newMsg.id ? { ...msgWithProfile, reactions: m.reactions || [] } : m)
            }
            const tempIdx = prev.findIndex(m =>
              m._optimistic &&
              m.sender_id === newMsg.sender_id &&
              m.text === newMsg.text &&
              m.type === newMsg.type
            )
            if (tempIdx !== -1) {
              const next = [...prev]
              next[tempIdx] = msgWithProfile
              return next
            }
            return [...prev, msgWithProfile]
          })
          await markAsRead()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          const row = payload.new || payload.old
          if (!row?.message_id) return
          setMessages(prev => {
            if (!prev.some(m => m.id === row.message_id)) return prev
            return prev.map(m => {
              if (m.id !== row.message_id) return m
              const current = m.reactions || []
              if (payload.eventType === 'DELETE') {
                return { ...m, reactions: current.filter(r => r.id !== row.id) }
              }
              if (payload.eventType === 'INSERT') {
                if (current.some(r => r.id === row.id)) return m
                return { ...m, reactions: [...current, payload.new] }
              }
              return m
            })
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, user?.id, markAsRead])

  async function loadMore() {
    if (!hasMore || !conversationId) return
    const from = offsetRef.current
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('messages')
      .select(MSG_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!error && data) {
      const ordered = [...data].reverse()
      const withProfiles = await attachProfiles(ordered)
      const withReactions = await attachReactions(withProfiles)
      setMessages(prev => [...withReactions, ...prev])
      setHasMore(data.length === PAGE_SIZE)
      offsetRef.current = from + data.length
    }
  }

  async function sendMessage(text, { replyToId = null } = {}) {
    if (!text.trim() || !user || !conversationId) return
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      _optimistic: true,
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'text',
      text: text.trim(),
      is_deleted: false,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId,
      profiles: null,
      reactions: [],
    }
    setMessages(prev => [...prev, optimistic])

    const insertPayload = {
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'text',
      text: text.trim(),
    }
    if (replyToId) insertPayload.reply_to_id = replyToId

    const { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select(MSG_SELECT)
      .single()

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data, profiles: null, reactions: [] } : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }

  async function sendPrayerRequest(requestId, title, description, isPersonal) {
    if (!user || !conversationId) return
    const insertData = {
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'prayer_request',
      text: title,
      bible_verse_text: description || null,
    }
    if (isPersonal) {
      insertData.personal_prayer_request_id = requestId
    } else {
      insertData.prayer_request_id = requestId
    }
    await supabase.from('messages').insert(insertData)
  }

  async function sendBibleVerse(reference, verseText) {
    if (!user || !conversationId) return
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'bible_verse',
      bible_verse_reference: reference,
      bible_verse_text: verseText,
    })
  }

  async function deleteMessage(id) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_deleted: true } : m))
    await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('sender_id', user.id)
  }

  async function updateMessage(id, { text, bible_verse_text }) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text, bible_verse_text } : m))
    await supabase
      .from('messages')
      .update({ text, bible_verse_text })
      .eq('id', id)
      .eq('sender_id', user.id)
  }

  async function toggleReaction(messageId, emoji) {
    if (!user) return
    const target = messages.find(m => m.id === messageId)
    const existing = (target?.reactions || []).find(r => r.user_id === user.id && r.emoji === emoji)

    if (existing) {
      setMessages(prev => prev.map(m => m.id === messageId
        ? { ...m, reactions: (m.reactions || []).filter(r => r.id !== existing.id) }
        : m))
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      const optimistic = { id: `opt_${Date.now()}`, message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() }
      setMessages(prev => prev.map(m => m.id === messageId
        ? { ...m, reactions: [...(m.reactions || []), optimistic] }
        : m))
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select()
        .single()
      if (error) {
        setMessages(prev => prev.map(m => m.id === messageId
          ? { ...m, reactions: (m.reactions || []).filter(r => r.id !== optimistic.id) }
          : m))
      } else if (data) {
        setMessages(prev => prev.map(m => m.id === messageId
          ? { ...m, reactions: (m.reactions || []).map(r => r.id === optimistic.id ? data : r) }
          : m))
      }
    }
  }

  async function pinMessage(id) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_pinned: true, pinned_at: new Date().toISOString() } : m))
    await supabase
      .from('messages')
      .update({ is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: user.id })
      .eq('id', id)
  }

  async function unpinMessage(id) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_pinned: false, pinned_at: null } : m))
    await supabase
      .from('messages')
      .update({ is_pinned: false, pinned_at: null, pinned_by: null })
      .eq('id', id)
  }

  async function forwardMessage(sourceMsg, targetConversationIds) {
    if (!user || !sourceMsg || !targetConversationIds?.length) return
    const rows = targetConversationIds.map(convId => ({
      conversation_id: convId,
      sender_id: user.id,
      type: sourceMsg.type || 'text',
      text: sourceMsg.text || null,
      bible_verse_reference: sourceMsg.bible_verse_reference || null,
      bible_verse_text: sourceMsg.bible_verse_text || null,
      forwarded_from_id: sourceMsg.id,
    }))
    await supabase.from('messages').insert(rows)
  }

  return {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    sendPrayerRequest,
    sendBibleVerse,
    deleteMessage,
    updateMessage,
    markAsRead,
    toggleReaction,
    pinMessage,
    unpinMessage,
    forwardMessage,
  }
}
