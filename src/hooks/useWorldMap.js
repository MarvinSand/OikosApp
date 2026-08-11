import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Ablaufzeit einer Aktivität berechnen. Wiederkehrende Events ohne Enddatum
// laufen nie ab (bleiben dauerhaft in der "kommende Events"-Liste); mit
// Enddatum der Serie läuft die Karten-Sichtbarkeit an diesem Tag aus.
// Einmalige Events verschwinden wie bisher kurz nach ihrem Ende.
function computeExpiresAt(data) {
  if (data.recurrence_freq) {
    return data.recurrence_end_date
      ? new Date(`${data.recurrence_end_date}T23:59:59`).toISOString()
      : null
  }
  if (data.ends_at) return new Date(new Date(data.ends_at).getTime() + 60 * 60 * 1000).toISOString()
  if (data.starts_at) return new Date(new Date(data.starts_at).getTime() + 3 * 60 * 60 * 1000).toISOString()
  return null
}

export function useWorldMap() {
  const { user } = useAuth()
  const [visibleUsers, setVisibleUsers] = useState([])
  const [activities, setActivities] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, latitude, longitude, show_on_world_map, is_christian, city, country, church_name, bio, bio_text, show_bio')
        .eq('id', user.id)
        .single()
      setMyProfile(profile)

      // Gegenseitige (akzeptierte) Freundschaften → nur diese Geschwister erscheinen auf der Karte
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      const friendIds = [...new Set(
        (friendships || []).map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
      )]

      if (friendIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, latitude, longitude, is_christian, city, country, church_name, bio, bio_text, show_bio')
          .in('id', friendIds)
          .eq('show_on_world_map', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
        setVisibleUsers(users || [])
      } else {
        setVisibleUsers([])
      }

      const now = new Date().toISOString()
      // Kein is_public-Filter mehr – Row Level Security entscheidet, welche Events
      // (öffentlich / Geschwister / Gemeinde / eigene) der Nutzer sehen darf.
      const { data: acts } = await supabase
        .from('world_map_activities')
        .select(`
          *,
          author:profiles!author_id(id, full_name, username, avatar_url),
          participants:activity_participants(user_id, joined_at, profile:profiles!user_id(id, full_name, username, avatar_url, is_christian))
        `)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(500)
      setActivities(acts || [])
    } finally {
      setLoading(false)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  const nearbyUsers = myProfile?.latitude && myProfile?.longitude
    ? visibleUsers
        .map(u => ({
          ...u,
          distance: haversine(myProfile.latitude, myProfile.longitude, u.latitude, u.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)
    : []

  async function createActivity(data) {
    const visibility = data.visibility_mode || 'public'
    const { data: act, error } = await supabase
      .from('world_map_activities')
      .insert({
        author_id: user.id,
        title: data.title,
        description: data.description || null,
        activity_type: data.activity_type,
        activity_emoji: data.activity_emoji || '📍',
        latitude: data.latitude,
        longitude: data.longitude,
        location_name: data.location_name || null,
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        max_participants: data.max_participants || null,
        visibility_mode: visibility,
        visibility_user_ids: visibility === 'specific' && Array.isArray(data.visibility_user_ids)
          ? data.visibility_user_ids
          : [],
        is_public: visibility === 'public',
        recurrence_freq: data.recurrence_freq || null,
        recurrence_interval: data.recurrence_freq ? (Number(data.recurrence_interval) || 1) : null,
        recurrence_weekdays: data.recurrence_freq === 'weekly' && Array.isArray(data.recurrence_weekdays) && data.recurrence_weekdays.length > 0
          ? data.recurrence_weekdays
          : null,
        recurrence_end_date: data.recurrence_freq ? (data.recurrence_end_date || null) : null,
        expires_at: data.expires_at || computeExpiresAt(data),
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, username, avatar_url),
        participants:activity_participants(user_id, joined_at, profile:profiles!user_id(id, full_name, username, avatar_url, is_christian))
      `)
      .single()
    if (!error && act) {
      // Bei Sichtbarkeit "Gemeinde": ausgewählte Communities verknüpfen
      if (visibility === 'communities' && Array.isArray(data.community_ids) && data.community_ids.length > 0) {
        const rows = data.community_ids.map(cid => ({ activity_id: act.id, community_id: cid }))
        const { error: commError } = await supabase.from('activity_communities').insert(rows)
        if (commError) console.error('activity_communities insert failed:', commError)
      }
      // Automatically create the activity chat and add creator as member
      const { data: convId, error: chatError } = await supabase.rpc('create_activity_chat', { p_activity_id: act.id })
      if (chatError) console.error('create_activity_chat failed:', chatError)
      const actWithConv = { ...act, conversation_id: convId || null }
      setActivities(prev => [actWithConv, ...prev])
      return { act: actWithConv, error, chatError }
    }
    return { act, error }
  }

  async function joinActivityChat(activityId) {
    const { data: convId, error } = await supabase.rpc('join_activity_chat', { p_activity_id: activityId })
    if (!error && convId) {
      setActivities(prev =>
        prev.map(a => a.id !== activityId ? a : { ...a, conversation_id: convId })
      )
    }
    return { convId, error }
  }

  async function joinActivity(activityId) {
    const { data: convId, error } = await supabase.rpc('join_activity', { p_activity_id: activityId })
    if (!error) {
      setActivities(prev =>
        prev.map(a =>
          a.id !== activityId
            ? a
            : {
                ...a,
                conversation_id: convId,
                participants: [
                  ...(a.participants || []),
                  { user_id: user.id, joined_at: new Date().toISOString(), profile: myProfile },
                ],
              }
        )
      )
    }
    return { convId, error }
  }

  async function leaveActivity(activityId) {
    const { error } = await supabase.rpc('leave_activity', { p_activity_id: activityId })
    if (!error) {
      setActivities(prev =>
        prev.map(a =>
          a.id !== activityId
            ? a
            : { ...a, participants: (a.participants || []).filter(p => p.user_id !== user.id) }
        )
      )
    }
  }

  async function deleteActivity(activityId) {
    await supabase.from('world_map_activities').delete().eq('id', activityId)
    setActivities(prev => prev.filter(a => a.id !== activityId))
  }

  // Eigenes Event bearbeiten (Titel, Beschreibung, Emoji, Zeiten, Wiederholung)
  async function updateActivity(activityId, updates) {
    const patch = { ...updates }
    // Ablaufzeit neu berechnen, wenn sich Zeiten oder Wiederholung ändern
    const RECOMPUTE_KEYS = ['ends_at', 'starts_at', 'recurrence_freq', 'recurrence_end_date']
    if (RECOMPUTE_KEYS.some(k => k in updates)) {
      const current = activities.find(a => a.id === activityId) || {}
      patch.expires_at = computeExpiresAt({ ...current, ...updates })
    }
    const { data, error } = await supabase
      .from('world_map_activities')
      .update(patch)
      .eq('id', activityId)
      .eq('author_id', user.id)
      .select('*, author:profiles!author_id(id, full_name, username, avatar_url)')
      .single()
    if (!error && data) {
      // bestehende Felder (participants, conversation_id) erhalten
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...data } : a))
    }
    return { data, error }
  }

  async function updateLocationVisibility(showOnMap) {
    const { error } = await supabase
      .from('profiles')
      .update({
        show_on_world_map: showOnMap,
        world_map_last_updated: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (!error) {
      setMyProfile(prev => ({ ...prev, show_on_world_map: showOnMap }))
    }
    return !error
  }

  const myActivities = activities.filter(a => a.author_id === user?.id)

  return {
    visibleUsers,
    activities,
    nearbyUsers,
    myProfile,
    loading,
    createActivity,
    joinActivity,
    joinActivityChat,
    leaveActivity,
    deleteActivity,
    updateActivity,
    updateLocationVisibility,
    myActivities,
    reload: loadData,
  }
}
