import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Loads the list of accepted-friendship counterparts for a user, sorted
 * alphabetically by name. Supports a local search filter (no extra API call).
 */
export function useConnectionsList(profileUserId) {
  const [connections, setConnections] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileUserId) return
    load()
  }, [profileUserId])

  async function load() {
    setLoading(true)

    // Primary path: SECURITY-DEFINER RPC returns ALL accepted connections of
    // the target user (bypasses the friendships RLS that only exposes rows the
    // current user is part of – see supabase/phase34_user_connections.sql).
    const { data: rpcProfiles, error: rpcError } = await supabase
      .rpc('get_user_connections', { target_id: profileUserId })

    let profiles = rpcProfiles
    if (rpcError) {
      // Fallback (e.g. migration not yet applied): direct query, which under
      // RLS only returns the connection shared with the current user.
      const { data: fr } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
        .eq('status', 'accepted')

      if (!fr || fr.length === 0) {
        setConnections([])
        setLoading(false)
        return
      }

      const otherIds = [...new Set(fr.map(f => f.requester_id === profileUserId ? f.addressee_id : f.requester_id))]
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, is_christian')
        .in('id', otherIds)
      profiles = fallbackProfiles
    }

    const sorted = (profiles || []).slice().sort((a, b) => {
      const an = (a.full_name || a.username || '').toLocaleLowerCase('de')
      const bn = (b.full_name || b.username || '').toLocaleLowerCase('de')
      return an.localeCompare(bn, 'de')
    })
    setConnections(sorted)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return connections
    return connections.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.username || '').toLowerCase().includes(q)
    )
  }, [connections, query])

  return {
    connections: filtered,
    totalCount: connections.length,
    loading,
    query,
    searchConnections: setQuery,
  }
}
