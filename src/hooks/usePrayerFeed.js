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
  { key: 'foryou',      label: 'Für dich' },
  { key: 'siblings',    label: 'Geschwister' },
  { key: 'oikos',       label: 'Oikos' },
  { key: 'communities', label: 'Communities' },
  { key: 'shared',      label: 'Geteilt' },
  { key: 'all',         label: 'Alle' },
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

// Anliegen verbundener Geschwister – persönliche und Oikos-Anliegen.
async function fetchSiblings(userId, statusFilter, limit) {
  const siblingIds = await fetchSiblingIds(userId)
  if (siblingIds.length === 0) return []

  const [{ data: personal }, { data: oikos }] = await Promise.all([
    applyStatus(
      supabase.from('personal_prayer_requests').select(`*, ${PROFILE_SELECT}`),
      statusFilter,
    ).in('owner_id', siblingIds).in('visibility', ['public', 'siblings'])
      .order('created_at', { ascending: false }).limit(limit),
    applyStatus(
      supabase.from('prayer_requests')
        .select(`*, ${PROFILE_SELECT}, oikos_people!person_id(name, is_christian, map_id)`),
      statusFilter,
    ).in('owner_id', siblingIds).not('person_id', 'is', null).eq('is_public', true)
      .order('created_at', { ascending: false }).limit(limit),
  ])

  return [
    ...(personal || []).map(r => normalizePrayer(r, { kind: KIND_PERSONAL, source: 'sibling' })),
    ...(oikos || []).map(r => normalizePrayer(r, { kind: KIND_OIKOS, source: 'sibling' })),
  ]
}

// Eigene Oikos-Anliegen über alle eigenen Maps.
async function fetchOikos(userId, statusFilter, limit) {
  const { data: maps } = await supabase.from('oikos_maps').select('id').eq('user_id', userId)
  const mapIds = (maps || []).map(m => m.id)
  if (mapIds.length === 0) return []

  const { data: people } = await supabase.from('oikos_people').select('id, name').in('map_id', mapIds)
  const peopleIds = (people || []).map(p => p.id)
  if (peopleIds.length === 0) return []
  const nameById = Object.fromEntries((people || []).map(p => [p.id, p.name]))

  const { data } = await applyStatus(
    supabase.from('prayer_requests').select('*'),
    statusFilter,
  ).in('person_id', peopleIds).order('created_at', { ascending: false }).limit(limit)

  return (data || []).map(r => normalizePrayer(
    { ...r, oikos_people: { name: nameById[r.person_id] || 'Person' } },
    { kind: KIND_OIKOS, source: 'oikos' },
  ))
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
      ? applyStatus(supabase.from('prayer_requests').select(`*, ${PROFILE_SELECT}`), statusFilter).in('id', oikosIds)
      : Promise.resolve({ data: [] }),
  ])

  return [
    ...(personal || []).map(r => normalizePrayer(r, { kind: KIND_PERSONAL, source: 'shared' })),
    ...(oikos || []).map(r => normalizePrayer(r, { kind: KIND_OIKOS, source: 'shared' })),
  ]
}

// Alle Gebete einer Quelle (oder aller Quellen) laden.
export async function fetchPrayersBySource(source, userId, statusFilter = 'open', limit = 100) {
  if (source === 'foryou') return sortByCreatedDesc(dedupePrayers(await fetchForYou(statusFilter, limit)))
  if (source === 'siblings') return sortByCreatedDesc(dedupePrayers(await fetchSiblings(userId, statusFilter, limit)))
  if (source === 'oikos') return sortByCreatedDesc(dedupePrayers(await fetchOikos(userId, statusFilter, limit)))
  if (source === 'communities') return sortByCreatedDesc(dedupePrayers(await fetchCommunities(userId, statusFilter, limit)))
  if (source === 'shared') return sortByCreatedDesc(dedupePrayers(await fetchShared(userId, statusFilter, limit)))

  // 'all' – alles zusammen, dedupliziert. Ein Gebet kann über mehrere Wege
  // sichtbar sein (z.B. Community-Anliegen, das jemand im Chat geteilt hat).
  const groups = await Promise.all([
    fetchForYou(statusFilter, limit),
    fetchSiblings(userId, statusFilter, limit),
    fetchOikos(userId, statusFilter, limit),
    fetchCommunities(userId, statusFilter, limit),
    fetchShared(userId, statusFilter, limit),
  ])
  return sortByCreatedDesc(dedupePrayers(groups.flat()))
}

export function usePrayerFeed(source = 'foryou', statusFilter = 'open') {
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
