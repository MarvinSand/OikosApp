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
// showEdges – Linien zwischen Personen derselben Ebene (nicht die Speichen zur Mitte / zum Eltern-Freund)
export function useSiblingsNetwork({ active, depth, people, ownerId, showEdges = true }) {
  const { user } = useAuth()
  const targetId = ownerId || user?.id
  const cacheKey = `siblings-network:${targetId}:${depth}`
  const [network, setNetwork] = useState(() => (user ? readCache(user.id, cacheKey) : undefined) ?? null)
  // Tiefe, zu der `network` wirklich gehört. Beim Hochschalten nicht leeren:
  // die schon geladene Ebene bleibt stehen, bis die nächste Antwort da ist.
  const [settledDepth, setSettledDepth] = useState(() => {
    const cached = user ? readCache(user.id, cacheKey) : undefined
    return cached ? depth : 0
  })

  useEffect(() => {
    if (!active || !user) return
    let cancelled = false
    const cached = readCache(user.id, cacheKey)
    if (cached) {
      setNetwork(cached)
      setSettledDepth(depth)
    }
    supabase.rpc('get_user_siblings_network', { p_user: targetId, p_depth: depth }).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) { if (error) console.error('get_user_siblings_network', error); return }
      writeCache(user.id, cacheKey, data, { persist: !ownerId || ownerId === user.id })
      setNetwork(data)
      setSettledDepth(depth)
    })
    return () => { cancelled = true }
  }, [active, user?.id, targetId, depth]) // eslint-disable-line react-hooks/exhaustive-deps

  const graph = useMemo(() => {
    if (!active || !network) return { connections: [], overlayData: [] }

    // Eine tiefere, schon geladene Antwort darf eine flachere Ansicht bedienen.
    // Umgekehrt fehlen die höheren Knoten einfach, bis die neue Antwort kommt.
    const nodes = (network.nodes || []).filter(n => (n.gen ?? 1) <= depth)
    const personByUser = new Map(people.filter(p => p.linked_user_id).map(p => [p.linked_user_id, p]))
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
      // Dieselben „untereinander"-Linien wie auf Ebene 1. Speichen zum Eltern-Freund
      // zeichnet MapCanvas extra und bleiben an, sonst hängt die Ebene in der Luft.
      const overlayConns = !showEdges ? [] : (network.edges || [])
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

  return { ...graph, loadingMore: !!active && depth > 1 && settledDepth < depth }
}
