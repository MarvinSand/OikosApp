import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useCommunityDetail(communityId) {
  const { user } = useAuth()
  const [community, setCommunity] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!communityId || !user) return
    load()
  }, [communityId, user?.id])

  async function load() {
    setLoading(true)
    const [{ data: communityData }, { data: membersData }] = await Promise.all([
      supabase.from('communities').select('*').eq('id', communityId).single(),
      supabase
        .from('community_members')
        .select('id, role, joined_at, user_id, profiles(id, username, full_name, is_christian)')
        .eq('community_id', communityId)
        .order('joined_at'),
    ])
    setCommunity(communityData)
    setMembers((membersData || []).map(m => ({ ...m, profile: m.profiles })))
    setLoading(false)
  }

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
    await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId)
  }

  return { community, members, myMembership, isAdmin, adminCount, loading, changeRole, removeMember }
}
