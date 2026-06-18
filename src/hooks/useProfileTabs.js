import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const POST_SELECT = `
  id, author_id, type, title, body, photo_url,
  bible_reference, bible_verse, is_public, created_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

async function attachReactions(rawPosts) {
  if (!rawPosts.length) return rawPosts
  const ids = rawPosts.map(p => p.id)
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from('feed_reactions').select('post_id, user_id, type').in('post_id', ids),
    supabase.from('feed_comments').select('post_id').in('post_id', ids),
  ])
  const reactMap = {}
  ;(reactions || []).forEach(r => {
    if (!reactMap[r.post_id]) reactMap[r.post_id] = []
    reactMap[r.post_id].push(r)
  })
  const commentCount = {}
  ;(comments || []).forEach(c => { commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1 })
  return rawPosts.map(p => ({
    ...p,
    reactions: reactMap[p.id] || [],
    commentCount: commentCount[p.id] || 0,
  }))
}

/**
 * Loads the data shown in the 3 Profil-Tabs (Maps / Posts / Gebete) for any
 * user, applying the existing OIKOS visibility rules:
 *  - Eigenes Profil → alles
 *  - Fremdes Profil → nur was per Sichtbarkeitslogik freigegeben ist
 *
 * Also returns the number of mutual connections (accepted friendships) and
 * the public communities the user belongs to.
 */
export function useProfileTabs(profileUserId) {
  const { user } = useAuth()
  const [maps, setMaps] = useState([])
  const [posts, setPosts] = useState([])
  const [prayerRequests, setPrayerRequests] = useState([])
  const [connectionsCount, setConnectionsCount] = useState(0)
  const [publicCommunities, setPublicCommunities] = useState([])
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

    // 1b. Public communities the user is a member of
    const { data: memberships } = await supabase
      .from('community_members')
      .select('communities(id, name, is_public)')
      .eq('user_id', profileUserId)
    setPublicCommunities(
      (memberships || [])
        .map(m => m.communities)
        .filter(c => c && c.is_public)
    )

    // 2. Maps for visibility filtering
    const mapsQuery = isOwn
      ? supabase.from('oikos_maps').select('*').eq('user_id', profileUserId).order('created_at')
      : supabase.from('oikos_maps').select('*').eq('user_id', profileUserId).neq('visibility', 'private').order('created_at')
    const { data: mapsRaw } = await mapsQuery

    let visibleMaps = mapsRaw || []
    if (!isOwn) {
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

    // 3. Posts (RLS handles visibility for non-public posts)
    let postsQuery = supabase
      .from('feed_posts')
      .select(POST_SELECT)
      .eq('author_id', profileUserId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!isOwn) postsQuery = postsQuery.eq('is_public', true)
    const { data: postsData } = await postsQuery
    setPosts(await attachReactions(postsData || []))

    // 4. Prayer requests (personal + per-person)
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

  async function reactToPost(postId, type) {
    const post = posts.find(p => p.id === postId)
    const mine = post?.reactions?.find(r => r.user_id === user.id && r.type === type)
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const reactions = mine
        ? p.reactions.filter(r => !(r.user_id === user.id && r.type === type))
        : [...(p.reactions || []), { post_id: postId, user_id: user.id, type }]
      return { ...p, reactions }
    }))
    if (mine) {
      await supabase.from('feed_reactions').delete().eq('post_id', postId).eq('user_id', user.id).eq('type', type)
    } else {
      await supabase.from('feed_reactions').insert({ post_id: postId, user_id: user.id, type })
    }
  }

  async function deletePost(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('feed_posts').delete().eq('id', postId)
  }

  return {
    maps, posts, prayerRequests, connectionsCount, publicCommunities,
    loading, isOwn, reload: load, reactToPost, deletePost,
  }
}
