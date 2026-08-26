import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// `useCommunities` wird von über zehn Komponenten benutzt, von denen mehrere
// gleichzeitig auf einer Seite hängen (Sheets, Composer, Modals). Ohne
// gemeinsamen Cache feuerte jede Instanz dieselben zwei Abfragen erneut.
// Der Cache liefert einen sofortigen Startwert und bündelt parallele Ladungen.
let cache = { userId: null, rows: null }
let inFlight = null

async function fetchCommunities(userId) {
  const { data } = await supabase
    .from('community_members')
    .select('id, role, joined_at, community_id, communities(id, name, description, is_public, join_mode, avatar_url, invite_code, created_by, created_at, community_type, address, latitude, longitude, meeting_info)')
    .eq('user_id', userId)

  if (!data || data.length === 0) return []

  // Batch query to prevent N+1 requests
  const commIds = data.map(m => m.community_id)
  const { data: allMembers } = await supabase
    .from('community_members')
    .select('community_id')
    .in('community_id', commIds)

  const countMap = {}
  if (allMembers) {
    allMembers.forEach(m => {
      countMap[m.community_id] = (countMap[m.community_id] || 0) + 1
    })
  }

  return data.map((m) => ({
    membershipId: m.id,
    role: m.role,
    joinedAt: m.joined_at,
    memberCount: countMap[m.community_id] || 1,
    ...m.communities,
  }))
}

export function useCommunities() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const cached = cache.userId === userId ? cache.rows : null

  const [myCommunities, setMyCommunities] = useState(cached || [])
  const [loading, setLoading] = useState(!cached)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async (force = false) => {
    if (!userId) {
      setMyCommunities([])
      setLoading(false)
      return
    }

    if (force || !inFlight || cache.userId !== userId) {
      if (force || cache.userId !== userId) inFlight = null
      if (!inFlight) {
        inFlight = fetchCommunities(userId).then(
          rows => { cache = { userId, rows }; inFlight = null; return rows },
          () => { inFlight = null; return [] },
        )
      }
    }

    const pending = inFlight
    if (!cache.rows || cache.userId !== userId) setLoading(true)
    const rows = await pending
    if (!mounted.current) return
    setMyCommunities(rows)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setMyCommunities([])
      setLoading(false)
      return
    }
    load()
  }, [userId, load])

  async function createCommunity({ name, description, is_public = false, community_type = 'group', address = null, latitude = null, longitude = null, meeting_info = null }) {
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.rpc('create_community', {
      p_name: name,
      p_description: description || '',
      p_invite_code: invite_code,
      p_is_public: is_public,
    })
    if (error) throw error
    let community = typeof data === 'string' ? JSON.parse(data) : data

    // Standortfelder gehören nicht zur create_community-RPC – als Admin
    // dürfen wir die eigene, gerade erstellte Community direkt aktualisieren.
    if (community_type === 'gemeinde') {
      const { data: updated, error: updateError } = await supabase
        .from('communities')
        .update({ community_type, address, latitude, longitude, meeting_info })
        .eq('id', community.id)
        .select('*')
        .single()
      if (!updateError && updated) community = updated
    }

    // Create a community conversation (don't throw if this fails)
    try {
      await supabase.from('conversations').insert({ type: 'community', community_id: community.id })
    } catch (_) {
      // Silently ignore – chat will be created lazily
    }

    await load(true)
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
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) throw new Error('Du bist bereits in dieser Community')

    const { error: joinError } = await supabase
      .from('community_members')
      .insert({ community_id: community.id, user_id: userId, role: 'member' })
    if (joinError) throw joinError

    await load(true)
    return community
  }

  async function leaveCommunity(communityId) {
    setMyCommunities(prev => prev.filter(c => c.id !== communityId))
    // Cache invalidieren, sonst zeigen andere Instanzen die Community weiter an
    if (cache.userId === userId && cache.rows) {
      cache = { userId, rows: cache.rows.filter(c => c.id !== communityId) }
    }
    await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId)
  }

  // Nur der Ersteller darf löschen (RLS: created_by = auth.uid()). Alle
  // abhängigen Zeilen (Mitglieder, Chat, Beiträge, Events, …) hängen per
  // ON DELETE CASCADE an communities.id, siehe phase58_community_admin.sql.
  async function deleteCommunity(communityId) {
    setMyCommunities(prev => prev.filter(c => c.id !== communityId))
    if (cache.userId === userId && cache.rows) {
      cache = { userId, rows: cache.rows.filter(c => c.id !== communityId) }
    }
    const { error } = await supabase.from('communities').delete().eq('id', communityId)
    if (error) throw error
  }

  const reload = useCallback(() => load(true), [load])

  return { myCommunities, loading, createCommunity, joinByCode, leaveCommunity, deleteCommunity, reload }
}
