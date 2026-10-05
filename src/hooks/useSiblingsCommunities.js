import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { readCache, writeCache } from '../lib/swrCache'

const COMMUNITY_COLOR = '#6B8F71'

// Communities der Systemkarte „Meine Geschwister in Christus".
// Eine Community hängt wie ein Ort an der Mitte; befreundete Mitglieder bekommen
// eine Linie zur Community, alle weiteren Mitglieder hängen als Overlay an ihr.
// Alles virtuell (nichts wird gespeichert) – RPC `get_user_siblings_communities`.
//
// active  – nur laden, wenn eingeschaltet
// ownerId – Besitzer der Karte (Default: ich)
// people  – oikos_people der Karte (für die Zuordnung Freund → Person-ID)
export function useSiblingsCommunities({ active, ownerId, people }) {
  const { user } = useAuth()
  const targetId = ownerId || user?.id
  const cacheKey = `siblings-communities:${targetId}`
  const [data, setData] = useState(() => (user ? readCache(user.id, cacheKey) : undefined) ?? null)

  useEffect(() => {
    if (!active || !user) return
    setData(readCache(user.id, cacheKey) ?? null)
    let cancelled = false
    supabase.rpc('get_user_siblings_communities', { p_user: targetId }).then(({ data: res, error }) => {
      if (error || !res) { if (error) console.error('get_user_siblings_communities', error); return }
      writeCache(user.id, cacheKey, res, { persist: !ownerId || ownerId === user.id })
      if (!cancelled) setData(res)
    })
    return () => { cancelled = true }
  }, [active, user?.id, targetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const communities = data?.communities || []

  const graph = useMemo(() => {
    if (!active || communities.length === 0) return { virtualPlaces: [], placeConnections: [], overlayData: [] }
    const personByUser = new Map(people.filter(p => p.linked_user_id).map(p => [p.linked_user_id, p]))

    const virtualPlaces = []
    const placeConnections = []
    const overlayData = []
    communities.forEach(c => {
      const placeId = `c:${c.id}`
      virtualPlaces.push({
        id: placeId, is_virtual: true, community_id: c.id, name: c.name, type: 'community',
        color: COMMUNITY_COLOR, pos_x: null, pos_y: null, member_count: c.member_count,
      })
      ;(c.friend_ids || []).forEach(fid => {
        const person = personByUser.get(fid)
        if (person) placeConnections.push({ id: `cc:${c.id}:${person.id}`, place_id: placeId, person_id: person.id })
      })
      const members = (c.members || []).map(m => ({
        id: `u:${m.id}`, user_id: m.id, is_virtual: true, impact_stage: 0, is_secondary: false,
        name: m.full_name || m.username || 'Unbekannt', is_christian: m.is_christian,
      }))
      if (members.length > 0) {
        overlayData.push({
          parentPersonId: placeId, persons: members, personCount: members.length,
          connections: [], showChristian: true, showNonChristian: true,
        })
      }
    })
    return { virtualPlaces, placeConnections, overlayData }
  }, [active, communities, people])

  return { ...graph, hasCommunities: communities.length > 0 || !data }
}
