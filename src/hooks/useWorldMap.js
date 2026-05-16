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

      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, latitude, longitude, is_christian, city, country, church_name')
        .eq('show_on_world_map', true)
        .neq('id', user.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
      setVisibleUsers(users || [])

      const now = new Date().toISOString()
      const { data: acts } = await supabase
        .from('world_map_activities')
        .select(`
          *,
          author:profiles!author_id(id, full_name, username, avatar_url),
          participants:activity_participants(user_id, joined_at, profile:profiles!user_id(id, full_name, username, avatar_url, is_christian))
        `)
        .eq('is_public', true)
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
    const expiresAt = data.starts_at
      ? new Date(new Date(data.starts_at).getTime() + 3 * 60 * 60 * 1000).toISOString()
      : null
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
        is_public: data.is_public !== false,
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
      const { data: convId } = await supabase.rpc('create_activity_chat', { p_activity_id: act.id })
      const actWithConv = { ...act, conversation_id: convId || null }
      setActivities(prev => [actWithConv, ...prev])
      return { act: actWithConv, error }
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
