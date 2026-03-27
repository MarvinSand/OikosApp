import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const PAGE_SIZE = 50
const MSG_SELECT = 'id, conversation_id, sender_id, type, text, bible_verse_reference, bible_verse_text, personal_prayer_request_id, prayer_request_id, is_deleted, created_at'

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
      setMessages(withProfiles)
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
          const msgWithProfile = { ...newMsg, profiles: profile || null }
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMsg.id)
            if (exists) {
              return prev.map(m => m.id === newMsg.id ? msgWithProfile : m)
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
      setMessages(prev => [...withProfiles, ...prev])
      setHasMore(data.length === PAGE_SIZE)
      offsetRef.current = from + data.length
    }
  }

  async function sendMessage(text) {
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
      profiles: null,
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type: 'text',
        text: text.trim(),
      })
      .select(MSG_SELECT)
      .single()

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data, profiles: null } : m))
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

  return {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    sendPrayerRequest,
    sendBibleVerse,
    deleteMessage,
    markAsRead,
  }
}
