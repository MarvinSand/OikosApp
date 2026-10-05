import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { readCache, writeCache } from '../lib/swrCache'

// Netzwerk der Systemkarte „Meine Geschwister in Christus".
// Kanten und Freunde-von-Freunden werden NICHT gespeichert, sondern per RPC
// `get_user_siblings_network` berechnet (friendships-RLS zeigt nur eigene Zeilen).
//
// active  – nur laden, wenn die Systemkarte offen ist
// depth   – 1 = nur Freunde, 2/3 = zusätzlich Freunde von Freunden
// people  – oikos_people der Systemkarte (Generation 1, mit linked_user_id)
// ownerId – Besitzer der Karte (Default: ich; für die öffentliche Ansicht fremder Karten)
export function useSiblingsNetwork({ active, depth, people, ownerId, showEdges = true }) {
  const { user } = useAuth()
  const targetId = ownerId || user?.id
  const cacheKey = `siblings-network:${targetId}:${depth}`
  const [network, setNetwork] = useState(() => (user ? readCache(user.id, cacheKey) : undefined) ?? null)

  useEffect(() => {
    if (!active || !user) return
    setNetwork(readCache(user.id, cacheKey) ?? null)
    let cancelled = false
    supabase.rpc('get_user_siblings_network', { p_user: targetId, p_depth: depth }).then(({ data, error }) => {
      if (error || !data) { if (error) console.error('get_user_siblings_network', error); return }
      writeCache(user.id, cacheKey, data, { persist: !ownerId || ownerId === user.id })
      if (!cancelled) setNetwork(data)
    })
    return () => { cancelled = true }
  }, [active, user?.id, targetId, depth]) // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    if (!active || !network) return { connections: [], overlayData: [] }

    const personByUser = new Map(people.filter(p => p.linked_user_id).map(p => [p.linked_user_id, p]))
    const nodes = network.nodes || []
    const nodeById = new Map(nodes.map(n => [n.id, n]))

    // Gen-1-Kanten: Linien zwischen verbundenen Freunden (nicht löschbar: auto)
    const connections = !showEdges ? [] : (network.edges || [])
      .filter(e => personByUser.has(e.a) && personByUser.has(e.b))
      .map(e => ({
        id: `auto_${e.a}_${e.b}`,
        source_person_id: personByUser.get(e.a).id,
        target_person_id: personByUser.get(e.b).id,
        auto: true,
      }))

    if (depth < 2) return { connections, overlayData: [] }

    // Wurzel-Freund (Gen 1) jedes Gen-2/3-Knotens bestimmen
    const rootOf = (n) => {
      let cur = n
      for (let i = 0; i < 3 && cur && cur.gen > 1; i++) cur = nodeById.get(cur.parent_id)
      return cur?.gen === 1 ? cur.id : null
    }
    const groups = new Map()
    nodes.filter(n => n.gen > 1).forEach(n => {
      const root = rootOf(n)
      if (!root || !personByUser.has(root)) return
      if (!groups.has(root)) groups.set(root, [])
      groups.get(root).push(n)
    })

    const overlayData = []
    groups.forEach((members, rootUser) => {
      const ids = new Set(members.map(m => m.id))
      const persons = members.map(m => ({
        id: `u:${m.id}`,
        user_id: m.id,
        is_virtual: true,
        name: m.full_name || m.username || 'Unbekannt',
        is_christian: m.is_christian,
        // Gen 3 hängt an seinem Gen-2-Elternteil, nicht direkt am Freund
        is_secondary: m.gen > 2,
        impact_stage: 0,
      }))
      const overlayConns = (network.edges || [])
        .filter(e => ids.has(e.a) && ids.has(e.b))
        .map(e => ({ id: `auto_${e.a}_${e.b}`, source_person_id: `u:${e.a}`, target_person_id: `u:${e.b}`, color: '#C8BFB0' }))
      overlayData.push({
        parentPersonId: personByUser.get(rootUser).id,
        persons,
        personCount: persons.length,
        connections: overlayConns,
        showChristian: true,
        showNonChristian: true,
      })
    })

    return { connections, overlayData }
  }, [active, network, people, depth, showEdges])
}
