import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Lädt für die sichtbaren Communities ein paar Mitglieder-Profile (für die
// überlappenden Avatare auf den Community-Karten). Zwei Schritte ohne Embed –
// der community_members→profiles-Join ist in diesem Projekt unzuverlässig.
// Rückgabe: { [communityId]: [{ id, avatar_url, full_name }] }
// Mitgliederzahlen für beliebige Communities (z. B. öffentliche zum Entdecken):
// { [communityId]: number }. Fehler → leeres Objekt, keine falsche "0".
export async function fetchMemberCounts(communityIds) {
  const ids = (communityIds || []).filter(Boolean)
  if (ids.length === 0) return {}
  // RPC statt direktem Select: RLS verbirgt Nicht-Mitgliedern die Zeilen
  const { data, error } = await supabase.rpc('get_community_member_counts', { p_ids: ids })
  if (error || !data) return {}
  return Object.fromEntries(data.map(r => [r.community_id, Number(r.member_count)]))
}

export function useCommunityMembersPreview(communityIds, perCommunity = 4) {
  const [previews, setPreviews] = useState({})
  const key = (communityIds || []).filter(Boolean).slice().sort().join(',')

  useEffect(() => {
    let active = true
    const ids = (communityIds || []).filter(Boolean)
    if (ids.length === 0) { setPreviews({}); return }

    ;(async () => {
      // RPC statt Selects: RLS verbirgt Nicht-Mitgliedern die Mitgliederzeilen
      const { data, error } = await supabase.rpc('get_community_members_preview', { p_ids: ids, p_per: perCommunity })
      if (!active || error) return
      const map = {}
      for (const r of (data || [])) {
        (map[r.community_id] ||= []).push({ id: r.user_id, avatar_url: r.avatar_url || null, full_name: r.full_name || r.username })
      }
      setPreviews(map)
    })()

    return () => { active = false }
  }, [key, perCommunity]) // eslint-disable-line react-hooks/exhaustive-deps

  return previews
}
