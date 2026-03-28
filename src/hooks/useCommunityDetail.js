import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useCommunityDetail(communityId) {
  const { user } = useAuth()
  const [community, setCommunity] = useState(null)
  const [members, setMembers] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [myRsvps, setMyRsvps] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!communityId || !user) return
    setLoading(true)

    const [
      { data: communityData },
      { data: membersData },
      { data: convData },
      postsResult,
      eventsResult,
    ] = await Promise.all([
      supabase.from('communities').select('*').eq('id', communityId).single(),
      supabase
        .from('community_members')
        .select('id, role, joined_at, user_id, profiles(id, username, full_name, is_christian, gender)')
        .eq('community_id', communityId)
        .order('joined_at'),
      supabase
        .from('conversations')
        .select('id')
        .eq('community_id', communityId)
        .eq('type', 'community')
        .maybeSingle(),
      supabase
        .from('community_posts')
        .select('id, content, created_at, author_id, profiles(id, username, full_name, is_christian)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('community_events')
        .select('id, title, description, starts_at, location, created_by, created_at')
        .eq('community_id', communityId)
        .gte('starts_at', new Date(Date.now() - 86400000 * 7).toISOString())
        .order('starts_at')
        .limit(20),
    ])

    setCommunity(communityData)
    setMembers((membersData || []).map(m => ({ ...m, profile: m.profiles })))
    setPosts(postsResult.data || [])

    const ev = eventsResult.data || []
    setEvents(ev)

    if (ev.length > 0) {
      const { data: rsvpData } = await supabase
        .from('event_participants')
        .select('event_id, status')
        .in('event_id', ev.map(e => e.id))
        .eq('user_id', user.id)
      const rsvpMap = {}
      for (const r of (rsvpData || [])) rsvpMap[r.event_id] = r.status
      setMyRsvps(rsvpMap)
    }

    if (convData?.id) {
      setConversationId(convData.id)
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ type: 'community', community_id: communityId })
        .select('id')
        .single()
      setConversationId(newConv?.id || null)
    }

    setLoading(false)
  }, [communityId, user?.id])

  useEffect(() => {
    if (!communityId || !user) return
    load()
  }, [communityId, user?.id])

  const myMembership = members.find(m => m.user_id === user?.id)
  const isAdmin = myMembership?.role === 'admin'
  const adminCount = members.filter(m => m.role === 'admin').length

  async function changeRole(userId, role) {
    const member = members.find(m => m.user_id === userId)
    if (!member) return
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m))
    await supabase.from('community_members').update({ role }).eq('id', member.id)
  }

  async function removeMember(userId) {
    setMembers(prev => prev.filter(m => m.user_id !== userId))
    await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId)
  }

  async function createPost(content) {
    const tempId = `temp-${Date.now()}`
    const myProfile = members.find(m => m.user_id === user.id)?.profile
    setPosts(prev => [{
      id: tempId, content, author_id: user.id,
      created_at: new Date().toISOString(), profiles: myProfile || null,
    }, ...prev])

    const { data, error } = await supabase
      .from('community_posts')
      .insert({ community_id: communityId, author_id: user.id, content })
      .select('id, content, created_at, author_id, profiles(id, username, full_name, is_christian)')
      .single()

    if (!error && data) {
      setPosts(prev => prev.map(p => p.id === tempId ? data : p))
    } else {
      setPosts(prev => prev.filter(p => p.id !== tempId))
    }
    return { error }
  }

  async function deletePost(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('community_posts').delete().eq('id', postId)
  }

  async function createEvent(eventData) {
    const { data, error } = await supabase
      .from('community_events')
      .insert({ ...eventData, community_id: communityId, created_by: user.id })
      .select('id, title, description, starts_at, location, created_by, created_at')
      .single()
    if (!error && data) {
      setEvents(prev => [...prev, data].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)))
    }
    return { error }
  }

  async function deleteEvent(eventId) {
    setEvents(prev => prev.filter(e => e.id !== eventId))
    await supabase.from('community_events').delete().eq('id', eventId)
  }

  async function rsvpEvent(eventId, status) {
    const prevStatus = myRsvps[eventId]
    if (status === null) {
      setMyRsvps(r => { const n = { ...r }; delete n[eventId]; return n })
      await supabase.from('event_participants').delete().eq('event_id', eventId).eq('user_id', user.id)
    } else {
      setMyRsvps(r => ({ ...r, [eventId]: status }))
      const { error } = await supabase
        .from('event_participants')
        .upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: 'event_id,user_id' })
      if (error) {
        if (prevStatus !== undefined) {
          setMyRsvps(r => ({ ...r, [eventId]: prevStatus }))
        } else {
          setMyRsvps(r => { const n = { ...r }; delete n[eventId]; return n })
        }
      }
    }
  }

  return {
    community, members, myMembership, isAdmin, adminCount,
    loading, conversationId, reload: load, changeRole, removeMember,
    posts, createPost, deletePost,
    events, myRsvps, createEvent, deleteEvent, rsvpEvent,
  }
}
