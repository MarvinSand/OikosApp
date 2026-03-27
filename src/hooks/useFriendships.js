import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useFriendships() {
  const { user } = useAuth()
  const [allFriendships, setAllFriendships] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const { data: raw } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .neq('status', 'declined')

    if (!raw || raw.length === 0) {
      setAllFriendships([])
      setLoading(false)
      return
    }

    const otherIds = raw.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_christian')
      .in('id', [...new Set(otherIds)])

    const pm = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    setAllFriendships(raw.map(f => ({
      ...f,
      otherUser: f.requester_id === user.id ? pm[f.addressee_id] : pm[f.requester_id],
    })))
    setLoading(false)
  }

  const friends = allFriendships.filter(f => f.status === 'accepted')
  const pendingReceived = allFriendships.filter(f => f.status === 'pending' && f.addressee_id === user?.id)
  const pendingSent = allFriendships.filter(f => f.status === 'pending' && f.requester_id === user?.id)

  function getFriendshipStatus(userId) {
    const f = allFriendships.find(f =>
      (f.requester_id === user.id && f.addressee_id === userId) ||
      (f.addressee_id === user.id && f.requester_id === userId)
    )
    if (!f) return 'none'
    if (f.status === 'accepted') return 'friends'
    if (f.requester_id === user.id) return 'sent'
    return 'received'
  }

  function getFriendship(userId) {
    return allFriendships.find(f =>
      (f.requester_id === user.id && f.addressee_id === userId) ||
      (f.addressee_id === user.id && f.requester_id === userId)
    )
  }

  async function searchUsers(query) {
    if (!query || query.trim().length < 2) return []
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_christian')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', user.id)
      .limit(10)
    return data || []
  }

  async function sendRequest(userId) {
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: userId })
    if (error) throw error
    await load()
  }

  async function acceptRequest(friendshipId) {
    setAllFriendships(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f))
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
  }

  async function declineRequest(friendshipId) {
    setAllFriendships(prev => prev.filter(f => f.id !== friendshipId))
    await supabase.from('friendships').update({ status: 'declined' }).eq('id', friendshipId)
  }

  async function removeFriend(friendshipId) {
    setAllFriendships(prev => prev.filter(f => f.id !== friendshipId))
    await supabase.from('friendships').delete().eq('id', friendshipId)
  }

  return {
    friends, pendingReceived, pendingSent, loading,
    getFriendshipStatus, getFriendship,
    searchUsers, sendRequest, acceptRequest, declineRequest, removeFriend,
  }
}
