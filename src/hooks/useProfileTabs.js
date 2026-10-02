import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { readCache, writeCache } from '../lib/swrCache'

const POST_SELECT = `
  id, author_id, type, category, title, body, photo_url,
  bible_reference, bible_verse, bible_id, bible_book, bible_chapter, bible_verse_start, bible_verse_end,
  is_public, visibility_mode,
  visibility_user_ids, excluded_user_ids, view_count, bookmark_count, created_at,
  profiles:author_id(id, full_name, username, avatar_url, is_christian)
`

async function attachReactions(rawPosts, currentUserId) {
  if (!rawPosts.length) return rawPosts
  const ids = rawPosts.map(p => p.id)
  const [{ data: reactions }, { data: comments }, { data: reposts }, { data: bookmarks }] = await Promise.all([
    supabase.from('feed_reactions').select('post_id, user_id, type').in('post_id', ids),
    supabase.from('feed_comments').select('post_id').in('post_id', ids),
    supabase.from('feed_reposts').select('post_id, user_id').in('post_id', ids),
    currentUserId ? supabase.from('feed_bookmarks').select('post_id').in('post_id', ids).eq('user_id', currentUserId) : Promise.resolve({ data: [] }),
  ])
  const reactMap = {}
  ;(reactions || []).forEach(r => {
    if (!reactMap[r.post_id]) reactMap[r.post_id] = []
    reactMap[r.post_id].push(r)
  })
  const commentCount = {}
  ;(comments || []).forEach(c => { commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1 })
  const repostMap = {}
  ;(reposts || []).forEach(r => {
    if (!repostMap[r.post_id]) repostMap[r.post_id] = []
    repostMap[r.post_id].push(r)
  })
  const bookmarkedSet = new Set((bookmarks || []).map(b => b.post_id))
  return rawPosts.map(p => ({
    ...p,
    reactions: reactMap[p.id] || [],
    commentCount: commentCount[p.id] || 0,
    reposts: repostMap[p.id] || [],
    bookmarked: bookmarkedSet.has(p.id),
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
  const cacheName = `profileTabs:${profileUserId}`
  // Zuletzt geladener Stand als Startwert (siehe swrCache.js)
  const [initial] = useState(() => (profileUserId ? readCache(user?.id, cacheName) : undefined))
  const [maps, setMaps] = useState(initial?.maps ?? [])
  const [posts, setPosts] = useState(initial?.posts ?? [])
  const [reposts, setReposts] = useState(initial?.reposts ?? [])
  const [prayerRequests, setPrayerRequests] = useState(initial?.prayerRequests ?? [])
  const [connectionsCount, setConnectionsCount] = useState(initial?.connectionsCount ?? 0)
  const [publicCommunities, setPublicCommunities] = useState(initial?.publicCommunities ?? [])
  const [loading, setLoading] = useState(!initial)
  // Zu welchem Profil die angezeigten Daten gehören – beim Wechsel von
  // /user/A zu /user/B (gleiche Komponente) darf weder A's Stand unter B
  // gecacht werden noch eine verspätete Antwort für A die Ansicht von B füllen.
  const [dataFor, setDataFor] = useState(initial ? profileUserId : null)
  const latestLoadRef = useRef(null)

  const isOwn = user?.id && profileUserId && user.id === profileUserId

  useEffect(() => {
    if (!user || !profileUserId) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileUserId])

  // Cache mit jedem Stand (auch nach Likes/Reposts/Löschen) synchron halten,
  // damit beim nächsten Öffnen nichts Veraltetes aufblitzt. Eigenes Profil
  // überlebt den App-Start, fremde Profile nur die Session.
  useEffect(() => {
    if (loading || !user || !profileUserId || dataFor !== profileUserId) return
    writeCache(user.id, cacheName, {
      maps, posts, reposts, prayerRequests, connectionsCount, publicCommunities,
    }, { persist: !!isOwn })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, dataFor, maps, posts, reposts, prayerRequests, connectionsCount, publicCommunities])

  async function load() {
    const forId = profileUserId
    latestLoadRef.current = forId
    const cached = readCache(user.id, cacheName)
    if (cached) applySnapshot(cached, forId)
    else setLoading(true)

    // Die sechs Bereiche sind voneinander unabhängig und laufen parallel.
    // Vorher lief alles nacheinander (~10 Round-Trips in Reihe) – der
    // Profil-Tab brauchte dadurch ein Vielfaches der Zeit eines einzelnen
    // Requests, bei kaltem Backend entsprechend viele Sekunden.
    let results
    try {
      results = await Promise.all([
        loadConnectionsCount(),
        loadPublicCommunities(),
        loadVisibleMaps(),
        loadPosts(),
        loadReposts(),
        loadPrayerRequests(),
      ])
    } catch (err) {
      // Netzwerk-/Serverfehler: gecachten Stand behalten statt leerer Tabs
      console.error('[useProfileTabs] Laden fehlgeschlagen:', err)
      if (latestLoadRef.current !== forId) return
      if (cached) setLoading(false)
      else applySnapshot({ connectionsCount: 0, publicCommunities: [], maps: [], posts: [], reposts: [], prayerRequests: [] }, forId)
      return
    }
    // Inzwischen wurde ein anderes Profil geöffnet
    if (latestLoadRef.current !== forId) return
    const [connectionsCountNext, publicCommunitiesNext, mapsNext, postsNext, repostsNext, prayersNext] = results

    const snapshot = {
      connectionsCount: connectionsCountNext,
      publicCommunities: publicCommunitiesNext,
      maps: mapsNext,
      posts: postsNext,
      reposts: repostsNext,
      prayerRequests: prayersNext,
    }
    applySnapshot(snapshot, forId)
  }

  function applySnapshot(snap, forId) {
    setDataFor(forId)
    setConnectionsCount(snap.connectionsCount)
    setPublicCommunities(snap.publicCommunities)
    setMaps(snap.maps)
    setPosts(snap.posts)
    setReposts(snap.reposts)
    setPrayerRequests(snap.prayerRequests)
    setLoading(false)
  }

  // 1. Connections count (accepted friendships).
  // Use the SECURITY-DEFINER RPC so the count also works on other users'
  // profiles, where the friendships RLS would otherwise expose only the
  // single connection shared with the current user (phase34 migration).
  async function loadConnectionsCount() {
    const { data: conns, error: connError } = await supabase
      .rpc('get_user_connections', { target_id: profileUserId })
    if (!connError) return (conns || []).length
    const { data: fr } = await supabase
      .from('friendships')
      .select('id')
      .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
      .eq('status', 'accepted')
    return (fr || []).length
  }

  // 1b. Public communities the user is a member of
  async function loadPublicCommunities() {
    const { data: memberships, error } = await supabase
      .from('community_members')
      .select('communities(id, name, is_public)')
      .eq('user_id', profileUserId)
    if (error) throw error
    return (memberships || [])
      .map(m => m.communities)
      .filter(c => c && c.is_public)
  }

  // 2. Maps for visibility filtering
  async function loadVisibleMaps() {
    const mapsQuery = isOwn
      ? supabase.from('oikos_maps').select('*').eq('user_id', profileUserId).order('created_at')
      : supabase.from('oikos_maps').select('*').eq('user_id', profileUserId).neq('visibility', 'private').order('created_at')
    const { data: mapsRaw, error: mapsError } = await mapsQuery
    if (mapsError) throw mapsError

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
    return visibleMaps
  }

  // 3. Posts (RLS handles visibility for non-public posts)
  async function loadPosts() {
    let postsQuery = supabase
      .from('feed_posts')
      .select(POST_SELECT)
      .eq('author_id', profileUserId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!isOwn) postsQuery = postsQuery.eq('is_public', true)
    const { data: postsData, error } = await postsQuery
    if (error) throw error
    return attachReactions(postsData || [], user.id)
  }

  // 3b. Reposts (Beiträge, die dieser Nutzer geteilt/repostet hat)
  async function loadReposts() {
    const { data: repostRows, error } = await supabase
      .from('feed_reposts')
      .select('post_id, created_at')
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const repostPostIds = (repostRows || []).map(r => r.post_id)
    if (repostPostIds.length === 0) return []
    const { data: repostedPosts } = await supabase
      .from('feed_posts')
      .select(POST_SELECT)
      .in('id', repostPostIds)
    const withEngagement = await attachReactions(repostedPosts || [], user.id)
    const orderMap = new Map(repostPostIds.map((id, i) => [id, i]))
    withEngagement.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id))
    return withEngagement
  }

  // 4. Prayer requests (personal + per-person)
  async function loadPrayerRequests() {
    const [personalQ, perPersonQ] = await Promise.all([
      isOwn
        ? supabase
            .from('personal_prayer_requests')
            .select('id, title, description, category, is_answered, visibility, created_at')
            .eq('owner_id', profileUserId)
            .order('created_at', { ascending: false })
        : supabase
            .from('personal_prayer_requests')
            .select('id, title, description, category, is_answered, visibility, created_at')
            .eq('owner_id', profileUserId)
            .neq('visibility', 'private')
            .order('created_at', { ascending: false }),
      isOwn
        ? supabase
            .from('prayer_requests')
            .select('id, title, description, is_answered, is_public, created_at')
            .eq('owner_id', profileUserId)
            .order('created_at', { ascending: false })
        : supabase
            .from('prayer_requests')
            .select('id, title, description, is_answered, is_public, created_at')
            .eq('owner_id', profileUserId)
            .eq('is_public', true)
            .order('created_at', { ascending: false }),
    ])
    if (personalQ.error) throw personalQ.error
    return [
      ...((personalQ.data || []).map(r => ({ id: r.id, title: r.title, description: r.description, category: r.category, is_answered: r.is_answered, is_public: r.visibility !== 'private', created_at: r.created_at, source: 'personal' }))),
      ...((perPersonQ.data || []).map(r => ({ id: r.id, title: r.title, description: r.description, category: null, is_answered: r.is_answered, is_public: r.is_public, created_at: r.created_at, source: 'person' }))),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  async function reactToPost(postId, type) {
    const post = posts.find(p => p.id === postId) || reposts.find(p => p.id === postId)
    const mine = post?.reactions?.find(r => r.user_id === user.id && r.type === type)
    const patch = p => {
      const reactions = mine
        ? p.reactions.filter(r => !(r.user_id === user.id && r.type === type))
        : [...(p.reactions || []), { post_id: postId, user_id: user.id, type }]
      return { ...p, reactions }
    }
    setPosts(prev => prev.map(p => p.id === postId ? patch(p) : p))
    setReposts(prev => prev.map(p => p.id === postId ? patch(p) : p))
    if (mine) {
      await supabase.from('feed_reactions').delete().eq('post_id', postId).eq('user_id', user.id).eq('type', type)
    } else {
      await supabase.from('feed_reactions').insert({ post_id: postId, user_id: user.id, type })
    }
  }

  async function deletePost(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setReposts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('feed_posts').delete().eq('id', postId)
  }

  function findPost(postId) {
    return posts.find(p => p.id === postId) || reposts.find(p => p.id === postId)
  }

  function patchPostEverywhere(postId, updater) {
    setPosts(prev => prev.map(p => p.id === postId ? updater(p) : p))
    setReposts(prev => prev.map(p => p.id === postId ? updater(p) : p))
  }

  async function toggleRepost(postId) {
    const post = findPost(postId)
    const mine = post?.reposts?.find(r => r.user_id === user.id)

    patchPostEverywhere(postId, p => ({
      ...p,
      reposts: mine
        ? p.reposts.filter(r => r.user_id !== user.id)
        : [...(p.reposts || []), { post_id: postId, user_id: user.id }],
    }))

    if (isOwn) {
      // Eigenes Profil: Repost-Tab live nachführen (entfernen/hinzufügen)
      if (mine) setReposts(prev => prev.filter(p => p.id !== postId))
      else if (post) setReposts(prev => [{ ...post }, ...prev])
    }

    if (mine) {
      await supabase.from('feed_reposts').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('feed_reposts').insert({ post_id: postId, user_id: user.id })
    }
  }

  async function removeBookmark(postId) {
    patchPostEverywhere(postId, p => ({ ...p, bookmarked: false, bookmark_count: Math.max((p.bookmark_count || 0) - 1, 0) }))
    await supabase.from('feed_bookmarks').delete().eq('post_id', postId).eq('user_id', user.id)
  }

  function markBookmarked(postId) {
    patchPostEverywhere(postId, p => ({ ...p, bookmarked: true, bookmark_count: (p.bookmark_count || 0) + 1 }))
  }

  return {
    maps, posts, reposts, prayerRequests, connectionsCount, publicCommunities,
    loading, isOwn, reload: load, reactToPost, deletePost, toggleRepost, removeBookmark, markBookmarked,
  }
}
