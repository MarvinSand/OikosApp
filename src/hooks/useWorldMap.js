import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

function haversine(lat1, lon1, lat2, lon2) {
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

export function useWorldMap() {
  const { user } = useAuth()
  const [visibleUsers, setVisibleUsers] = useState([])
  const [friendIds, setFriendIds] = useState(() => new Set())
  const [activities, setActivities] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, latitude, longitude, show_on_world_map, is_christian, city, country, church_name')
        .eq('id', user.id)
        .single()
      setMyProfile(profile)

      // Bestätigte Freundschaften (Geschwister) laden
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')
      const fIds = new Set(
        (friendships || []).map(f => (f.requester_id === user.id ? f.addressee_id : f.requester_id))
      )
      setFriendIds(fIds)

      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, latitude, longitude, is_christian, city, country, church_name')
        .eq('show_on_world_map', true)
        .neq('id', user.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
      setVisibleUsers(users || [])

      const now = new Date().toISOString()
      // Sichtbarkeit (public/friends/community) wird durch RLS gefiltert
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

  // Geschwister = bestätigte Freunde, die auf der Karte sichtbar sind
  const friendUsers = visibleUsers.filter(u => friendIds.has(u.id))

  const nearbyUsers = myProfile?.latitude && myProfile?.longitude
    ? friendUsers
        .map(u => ({
          ...u,
          distance: haversine(myProfile.latitude, myProfile.longitude, u.latitude, u.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)
    : []

  async function createActivity(data) {
    // Event verschwindet, wenn es vorbei ist: ends_at, sonst starts_at + 3h
    const expiresAt = data.ends_at
      ? data.ends_at
      : data.starts_at
        ? new Date(new Date(data.starts_at).getTime() + 3 * 60 * 60 * 1000).toISOString()
        : null
    const visibility = data.visibility || 'public'
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
        visibility,
        community_id: visibility === 'community' ? (data.community_id || null) : null,
        is_public: visibility === 'public',
        expires_at: data.expires_at || expiresAt,
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, username, avatar_url),
        participants:activity_participants(user_id, joined_at, profile:profiles!user_id(id, full_name, username, avatar_url, is_christian))
      `)
      .single()
    if (!error && act) {
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
    friendUsers,
    friendIds,
    activities,
    nearbyUsers,
    myProfile,
    loading,
    createActivity,
    joinActivity,
    joinActivityChat,
    leaveActivity,
    deleteActivity,
    updateLocationVisibility,
    myActivities,
    reload: loadData,
  }
}
