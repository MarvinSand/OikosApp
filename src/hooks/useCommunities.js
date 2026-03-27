import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useCommunities() {
  const { user } = useAuth()
  const [myCommunities, setMyCommunities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('community_members')
      .select('id, role, joined_at, community_id, communities(id, name, description, invite_code, created_by, created_at)')
      .eq('user_id', user.id)

    if (!data || data.length === 0) { setMyCommunities([]); setLoading(false); return }

    const counts = await Promise.all(
      data.map(m =>
        supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', m.community_id)
      )
    )

    setMyCommunities(data.map((m, i) => ({
      membershipId: m.id,
      role: m.role,
      joinedAt: m.joined_at,
      memberCount: counts[i].count || 0,
      ...m.communities,
    })))
    setLoading(false)
  }

  async function createCommunity({ name, description }) {
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.rpc('create_community', {
      p_name: name,
      p_description: description || '',
      p_invite_code: invite_code,
    })
    if (error) throw error
    const community = typeof data === 'string' ? JSON.parse(data) : data

    // Create a community conversation (don't throw if this fails)
    try {
      await supabase.from('conversations').insert({ type: 'community', community_id: community.id })
    } catch (_) {
      // Silently ignore – chat will be created lazily
    }

    await load()
    return community
  }

  async function joinByCode(code) {
    const { data: community, error } = await supabase
      .from('communities')
      .select('id, name')
      .eq('invite_code', code.trim().toUpperCase())
      .single()

    if (error || !community) throw new Error('Kein gültiger Code')

    const { data: existing } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) throw new Error('Du bist bereits in dieser Community')

    const { error: joinError } = await supabase
      .from('community_members')
      .insert({ community_id: community.id, user_id: user.id, role: 'member' })
    if (joinError) throw joinError

    await load()
    return community
  }

  async function leaveCommunity(communityId) {
    setMyCommunities(prev => prev.filter(c => c.id !== communityId))
    await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', user.id)
  }

  return { myCommunities, loading, createCommunity, joinByCode, leaveCommunity, reload: load }
}
