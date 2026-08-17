import { supabase } from './supabase'

// Ermittelt gemeinsame Verbindungen ("Freunde von Freunden") für den
// aktuellen Nutzer. Liefert eine Map candidateId -> { count, people }, wobei
// `people` die Profile der verbindenden Freunde sind (für Avatar-Vorschau).
//
// - Ohne `candidateIds` werden ALLE gefundenen Kandidaten zurückgegeben
//   (Discovery, z.B. für Vorschläge).
// - Mit `candidateIds` wird nur für diese bereits bekannten Nutzer angereichert.
export async function fetchMutualFriendsMap({ myFriendIds, excludeIds = [], candidateIds = null }) {
  if (!myFriendIds || myFriendIds.length === 0) return {}

  const { data: fof } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.in.(${myFriendIds.join(',')}),addressee_id.in.(${myFriendIds.join(',')})`)

  const exclude = new Set(excludeIds)
  const restrict = candidateIds ? new Set(candidateIds) : null
  const friendSet = new Set(myFriendIds)

  const connectorsByCandidate = {} // candidateId -> Set(connectorId)
  for (const row of fof || []) {
    const requesterIsFriend = friendSet.has(row.requester_id)
    const connector = requesterIsFriend ? row.requester_id : row.addressee_id
    const candidate = requesterIsFriend ? row.addressee_id : row.requester_id
    if (exclude.has(candidate) || friendSet.has(candidate)) continue
    if (restrict && !restrict.has(candidate)) continue
    if (!connectorsByCandidate[candidate]) connectorsByCandidate[candidate] = new Set()
    connectorsByCandidate[candidate].add(connector)
  }

  const connectorIds = [...new Set(Object.values(connectorsByCandidate).flatMap(s => [...s]))]
  let profileById = {}
  if (connectorIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', connectorIds)
    profileById = Object.fromEntries((data || []).map(p => [p.id, p]))
  }

  const result = {}
  for (const [candidateId, ids] of Object.entries(connectorsByCandidate)) {
    const people = [...ids].map(id => profileById[id]).filter(Boolean)
    result[candidateId] = { count: people.length, people }
  }
  return result
}
