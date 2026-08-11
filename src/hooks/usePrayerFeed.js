import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import {
  normalizePrayer, dedupePrayers, sortByCreatedDesc,
  KIND_OIKOS, KIND_PERSONAL,
} from '../lib/prayerModel'

// ════════════════════════════════════════════════════════════════════════
// Der Gebete-Feed
// ════════════════════════════════════════════════════════════════════════
// Liefert normalisierte Gebete je Quelle. „alle" vereint sämtliche Gebete,
// die für den Nutzer sichtbar sind – eigene und öffentliche Anliegen,
// Anliegen von Geschwistern, Oikos-Anliegen, Community-Anliegen und im Chat
// geteilte Gebete – dedupliziert und nach Datum sortiert.

export const PRAYER_SOURCES = [
  { key: 'all',         label: 'Alle' },
  { key: 'siblings',    label: 'Geschwister' },
  { key: 'oikos',       label: 'Oikos' },
  { key: 'communities', label: 'Communities' },
  { key: 'shared',      label: 'Geteilt' },
]

const PROFILE_SELECT = 'profiles!owner_id(id, username, full_name, gender, is_christian, avatar_url)'

function applyStatus(query, statusFilter) {
  if (statusFilter === 'answered') return query.eq('is_answered', true)
  if (statusFilter === 'all') return query
  return query.eq('is_answered', false)
}

// Verbundene Geschwister (akzeptierte Freundschaften).
async function fetchSiblingIds(userId) {
  const { data } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')
  return (data || []).map(f => (f.requester_id === userId ? f.addressee_id : f.requester_id))
}

// ── Einzelne Quellen ────────────────────────────────────────────────────

// Öffentliche Anliegen (inkl. eigener) – der klassische For-You-Feed.
async function fetchForYou(statusFilter, limit) {
  const { data } = await applyStatus(
    supabase.from('personal_prayer_requests').select(`*, ${PROFILE_SELECT}`),
    statusFilter,
  ).eq('visibility', 'public').order('created_at', { ascending: false }).limit(limit)
  return (data || []).map(r => normalizePrayer(r, { kind: KIND_PERSONAL, source: 'personal' }))
}

// Öffentliche Oikos-Anliegen verbundener Geschwister.
async function fetchSiblingOikos(siblingIds, statusFilter, limit, source) {
  if (siblingIds.length === 0) return []
  // Kein profiles!owner_id-Embed: prayer_requests.owner_id verweist auf
  // auth.users, nicht auf profiles – PostgREST kann den Join nicht auflösen
  // und lässt die ganze Abfrage leer laufen. Profile werden in
  // attachPrayerContext() separat nachgeladen (wie usePrayerRequests.js).
  const { data } = await applyStatus(
    supabase.from('prayer_requests').select('*'),
    statusFilter,
  ).in('owner_id', siblingIds).not('person_id', 'is', null).eq('is_public', true)
    .order('created_at', { ascending: false }).limit(limit)
  return (data || []).map(r => normalizePrayer(r, { kind: KIND_OIKOS, source }))
}

// Anliegen verbundener Geschwister – persönliche und Oikos-Anliegen.
async function fetchSiblings(userId, statusFilter, limit) {
  const siblingIds = await fetchSiblingIds(userId)
  if (siblingIds.length === 0) return []

  const [{ data: personal }, oikos] = await Promise.all([
    applyStatus(
      supabase.from('personal_prayer_requests').select(`*, ${PROFILE_SELECT}`),
      statusFilter,
    ).in('owner_id', siblingIds).in('visibility', ['public', 'siblings'])
      .order('created_at', { ascending: false }).limit(limit),
    fetchSiblingOikos(siblingIds, statusFilter, limit, 'sibling'),
  ])

  return [
    ...(personal || []).map(r => normalizePrayer(r, { kind: KIND_PERSONAL, source: 'sibling' })),
    ...oikos,
  ]
}

// Eigene Oikos-Anliegen (alle eigenen Maps) UND die öffentlichen Oikos-
// Anliegen verbundener Geschwister. Welche Map wem gehört, steht danach auf
// der Karte und lässt sich im Feed filtern.
async function fetchOikos(userId, statusFilter, limit) {
  const [ownPrayers, siblingIds] = await Promise.all([
    fetchOwnOikos(userId, statusFilter, limit),
    fetchSiblingIds(userId),
  ])
  const siblingPrayers = await fetchSiblingOikos(siblingIds, statusFilter, limit, 'oikos')
  return [...ownPrayers, ...siblingPrayers]
}

async function fetchOwnOikos(userId, statusFilter, limit) {
  const { data: maps } = await supabase.from('oikos_maps').select('id').eq('user_id', userId)
  const mapIds = (maps || []).map(m => m.id)
  if (mapIds.length === 0) return []

  const { data: people } = await supabase.from('oikos_people').select('id').in('map_id', mapIds)
  const peopleIds = (people || []).map(p => p.id)
  if (peopleIds.length === 0) return []

  const { data } = await applyStatus(
    supabase.from('prayer_requests').select('*'),
    statusFilter,
  ).in('person_id', peopleIds).order('created_at', { ascending: false }).limit(limit)

  return (data || []).map(r => normalizePrayer(r, { kind: KIND_OIKOS, source: 'oikos' }))
}

// Anliegen aus allen Communities, in denen der Nutzer Mitglied ist.
async function fetchCommunities(userId, statusFilter, limit) {
  const { data: memberships } = await supabase
    .from('community_members').select('community_id').eq('user_id', userId)
  const communityIds = (memberships || []).map(m => m.community_id)
  if (communityIds.length === 0) return []

  const { data } = await applyStatus(
    supabase.from('personal_prayer_requests').select(`*, ${PROFILE_SELECT}`),
    statusFilter,
  ).eq('visibility', 'community').in('visibility_community_id', communityIds)
    .order('created_at', { ascending: false }).limit(limit)

  return (data || []).map(r => normalizePrayer(r, { kind: KIND_PERSONAL, source: 'community' }))
}

// Gebete, die in einem Chat geteilt wurden (Direktnachricht oder Community).
async function fetchShared(userId, statusFilter, limit) {
  const { data: memberships } = await supabase
    .from('conversation_members').select('conversation_id').eq('user_id', userId)
  const convIds = (memberships || []).map(m => m.conversation_id)
  if (convIds.length === 0) return []

  const { data: msgs } = await supabase
    .from('messages')
    .select('personal_prayer_request_id, prayer_request_id, created_at')
    .in('conversation_id', convIds)
    .eq('type', 'prayer_request')
    .neq('is_deleted', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  const personalIds = [...new Set((msgs || []).map(m => m.personal_prayer_request_id).filter(Boolean))]
  const oikosIds = [...new Set((msgs || []).map(m => m.prayer_request_id).filter(Boolean))]
  if (personalIds.length === 0 && oikosIds.length === 0) return []

  const [{ data: personal }, { data: oikos }] = await Promise.all([
    personalIds.length
      ? applyStatus(supabase.from('personal_prayer_requests').select(`*, ${PROFILE_SELECT}`), statusFilter).in('id', personalIds)
      : Promise.resolve({ data: [] }),
    oikosIds.length
      ? applyStatus(supabase.from('prayer_requests').select('*'), statusFilter).in('id', oikosIds)
      : Promise.resolve({ data: [] }),
  ])

  return [
    ...(personal || []).map(r => normalizePrayer(r, { kind: KIND_PERSONAL, source: 'shared' })),
    ...(oikos || []).map(r => normalizePrayer(r, { kind: KIND_OIKOS, source: 'shared' })),
  ]
}

// ── Herkunft + Autor nachladen ───────────────────────────────────────────
// Person → Map → Map-Besitzer bzw. Community-Name, sowie die Autoren-Profile
// von Oikos-Anliegen (prayer_requests.owner_id verweist auf auth.users, nicht
// auf profiles – ein profiles!owner_id-Embed dort scheitert und lässt die
// Abfrage leer laufen). Bewusst als eigene .in()-Queries statt verschachtelter
// Embeds: ein nicht auflösbarer Join würde die ganze Liste still leeren
// (siehe CLAUDE.md). Schlägt hier etwas fehl, fehlt nur die Kontext-Zeile
// bzw. der Autor.
async function attachPrayerContext(prayers, userId) {
  const personIds = [...new Set(prayers.map(p => p.personId).filter(Boolean))]
  const communityIds = [...new Set(prayers.map(p => p.communityId).filter(Boolean))]
  const oikosOwnerIds = [...new Set(prayers.filter(p => p.kind === KIND_OIKOS && !p.author).map(p => p.ownerId).filter(Boolean))]
  if (personIds.length === 0 && communityIds.length === 0 && oikosOwnerIds.length === 0) return prayers

  const [{ data: people }, { data: communities }, { data: authors }] = await Promise.all([
    personIds.length
      ? supabase.from('oikos_people').select('id, name, map_id').in('id', personIds)
      : Promise.resolve({ data: [] }),
    communityIds.length
      ? supabase.from('communities').select('id, name').in('id', communityIds)
      : Promise.resolve({ data: [] }),
    oikosOwnerIds.length
      ? supabase.from('profiles').select('id, username, full_name, gender, is_christian, avatar_url').in('id', oikosOwnerIds)
      : Promise.resolve({ data: [] }),
  ])

  const personById = Object.fromEntries((people || []).map(p => [p.id, p]))
  const communityById = Object.fromEntries((communities || []).map(c => [c.id, c]))
  const authorById = Object.fromEntries((authors || []).map(a => [a.id, a]))

  // Maps der gefundenen Personen + deren Besitzer
  const mapIds = [...new Set((people || []).map(p => p.map_id).filter(Boolean))]
  let mapById = {}
  let ownerById = {}
  if (mapIds.length > 0) {
    const { data: maps } = await supabase.from('oikos_maps').select('id, name, user_id').in('id', mapIds)
    mapById = Object.fromEntries((maps || []).map(m => [m.id, m]))
    const ownerIds = [...new Set((maps || []).map(m => m.user_id).filter(id => id && id !== userId))]
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from('profiles').select('id, full_name, username').in('id', ownerIds)
      ownerById = Object.fromEntries((owners || []).map(o => [o.id, o]))
    }
  }

  return prayers.map(p => {
    const withAuthor = !p.author && authorById[p.ownerId] ? { ...p, author: authorById[p.ownerId] } : p

    if (withAuthor.communityId) {
      const community = communityById[withAuthor.communityId]
      return community ? { ...withAuthor, communityName: community.name } : withAuthor
    }
    const person = withAuthor.personId ? personById[withAuthor.personId] : null
    if (!person) return withAuthor
    const map = person.map_id ? mapById[person.map_id] : null
    const owner = map?.user_id ? ownerById[map.user_id] : null
    return {
      ...withAuthor,
      personName: withAuthor.personName || person.name,
      mapId: map?.id || person.map_id || null,
      mapName: map?.name || null,
      mapOwnerId: map?.user_id || null,
      mapOwnerName: owner ? (owner.full_name || owner.username) : null,
      isOwnMap: !!map && map.user_id === userId,
    }
  })
}

// Alle Gebete einer Quelle (oder aller Quellen) laden.
export async function fetchPrayersBySource(source, userId, statusFilter = 'open', limit = 100) {
  const finish = async prayers =>
    sortByCreatedDesc(await attachPrayerContext(dedupePrayers(prayers), userId))

  if (source === 'foryou') return finish(await fetchForYou(statusFilter, limit))
  if (source === 'siblings') return finish(await fetchSiblings(userId, statusFilter, limit))
  if (source === 'oikos') return finish(await fetchOikos(userId, statusFilter, limit))
  if (source === 'communities') return finish(await fetchCommunities(userId, statusFilter, limit))
  if (source === 'shared') return finish(await fetchShared(userId, statusFilter, limit))

  // 'all' – alles zusammen, dedupliziert. Ein Gebet kann über mehrere Wege
  // sichtbar sein (z.B. Community-Anliegen, das jemand im Chat geteilt hat).
  const groups = await Promise.all([
    fetchForYou(statusFilter, limit),
    fetchSiblings(userId, statusFilter, limit),
    fetchOikos(userId, statusFilter, limit),
    fetchCommunities(userId, statusFilter, limit),
    fetchShared(userId, statusFilter, limit),
  ])
  return finish(groups.flat())
}

export function usePrayerFeed(source = 'all', statusFilter = 'open') {
  const { user } = useAuth()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      setPrayers(await fetchPrayersBySource(source, user.id, statusFilter))
    } catch (err) {
      console.error('[usePrayerFeed] Laden fehlgeschlagen:', err)
      setPrayers([])
    } finally {
      setLoading(false)
    }
  }, [source, statusFilter, user?.id])

  useEffect(() => { load() }, [load])

  return { prayers, loading, reload: load }
}
