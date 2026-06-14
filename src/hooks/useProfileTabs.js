import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Loads the data shown in the 3 Profil-Tabs (Maps / Posts / Gebete) for any
 * user, applying the existing OIKOS visibility rules:
 *  - Eigenes Profil → alles
 *  - Fremdes Profil → nur was per Sichtbarkeitslogik freigegeben ist
 *
 * Also returns the number of mutual connections (accepted friendships).
 */
export function useProfileTabs(profileUserId) {
  const { user } = useAuth()
  const [maps, setMaps] = useState([])
  const [posts, setPosts] = useState([])
  const [prayerRequests, setPrayerRequests] = useState([])
  const [connectionsCount, setConnectionsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const isOwn = user?.id && profileUserId && user.id === profileUserId

  useEffect(() => {
    if (!user || !profileUserId) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileUserId])

  async function load() {
    setLoading(true)

    // 1. Connections count (mutual friendships)
    const { data: fr } = await supabase
      .from('friendships')
      .select('id')
      .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
      .eq('status', 'accepted')
    setConnectionsCount((fr || []).length)

    // 2. Maps for visibility filtering
    const mapsQuery = isOwn
      ? supabase.from('oikos_maps').select('*').eq('user_id', profileUserId).order('created_at')
      : supabase.from('oikos_maps').select('*').eq('user_id', profileUserId).neq('visibility', 'private').order('created_at')
    const { data: mapsRaw } = await mapsQuery

    let visibleMaps = mapsRaw || []
    if (!isOwn) {
      // Determine sibling status + communities of current viewer
      const [{ data: friendship }, { data: myCommunities }] = await Promise.all([
        supabase
          .from('friendships')
          .select('id')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},addressee_id.eq.${user.id})`)
          .eq('status', 'accepted')
          .maybeSingle(),
        supabase.from('community_members').select('community_id').eq('user_id', user.id),
      ])
      const isSibling = !!friendship
      const myCommunityIds = (myCommunities || []).map(c => c.community_id)

      visibleMaps = (mapsRaw || []).filter(map => {
        if (map.visibility === 'private') return false
        if (map.visibility === 'all_siblings') return isSibling
        if (map.visibility === 'specific_include') return (map.visibility_user_ids || []).includes(user.id)
        if (map.visibility === 'specific_exclude') return isSibling && !(map.visibility_user_ids || []).includes(user.id)
        if (map.visibility === 'community') return myCommunityIds.includes(map.visibility_community_id)
        return false
      })
    }

    // Attach people counts
    if (visibleMaps.length > 0) {
      const { data: peopleCounts } = await supabase
        .from('oikos_people')
        .select('map_id')
        .in('map_id', visibleMaps.map(m => m.id))
      const countMap = {}
      ;(peopleCounts || []).forEach(p => { countMap[p.map_id] = (countMap[p.map_id] || 0) + 1 })
      visibleMaps = visibleMaps.map(m => ({ ...m, personCount: countMap[m.id] || 0 }))
    }
    setMaps(visibleMaps)

    // 3. Posts (RLS handles visibility for non-public posts via community memberships)
    let postsQuery = supabase
      .from('feed_posts')
      .select('id, type, title, body, photo_url, bible_reference, is_public, created_at')
      .eq('author_id', profileUserId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!isOwn) postsQuery = postsQuery.eq('is_public', true)
    const { data: postsData } = await postsQuery
    setPosts(postsData || [])

    // 4. Prayer requests (both personal and per-person)
    const [personalQ, perPersonQ] = await Promise.all([
      isOwn
        ? supabase
            .from('personal_prayer_requests')
            .select('id, title, description, category, is_answered, is_public, created_at')
            .eq('owner_id', profileUserId)
            .order('created_at', { ascending: false })
        : supabase
            .from('personal_prayer_requests')
            .select('id, title, description, category, is_answered, is_public, created_at')
            .eq('owner_id', profileUserId)
            .eq('is_public', true)
            .order('created_at', { ascending: false }),
      isOwn
        ? supabase
            .from('prayer_requests')
            .select('id, content, is_answered, is_public, created_at')
            .eq('owner_id', profileUserId)
            .order('created_at', { ascending: false })
        : supabase
            .from('prayer_requests')
            .select('id, content, is_answered, is_public, created_at')
            .eq('owner_id', profileUserId)
            .eq('is_public', true)
            .order('created_at', { ascending: false }),
    ])
    const normalised = [
      ...((personalQ.data || []).map(r => ({ id: r.id, title: r.title, description: r.description, category: r.category, is_answered: r.is_answered, is_public: r.is_public, created_at: r.created_at, source: 'personal' }))),
      ...((perPersonQ.data || []).map(r => ({ id: r.id, title: r.content, description: null, category: null, is_answered: r.is_answered, is_public: r.is_public, created_at: r.created_at, source: 'person' }))),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setPrayerRequests(normalised)

    setLoading(false)
  }

  return { maps, posts, prayerRequests, connectionsCount, loading, isOwn, reload: load }
}
