import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Lädt für die sichtbaren Communities ein paar Mitglieder-Profile (für die
// überlappenden Avatare auf den Community-Karten). Zwei Schritte ohne Embed –
// der community_members→profiles-Join ist in diesem Projekt unzuverlässig.
// Rückgabe: { [communityId]: [{ id, avatar_url, full_name }] }
export function useCommunityMembersPreview(communityIds, perCommunity = 4) {
  const [previews, setPreviews] = useState({})
  const key = (communityIds || []).filter(Boolean).slice().sort().join(',')

  useEffect(() => {
    let active = true
    const ids = (communityIds || []).filter(Boolean)
    if (ids.length === 0) { setPreviews({}); return }

    ;(async () => {
      const { data: rows } = await supabase
        .from('community_members')
        .select('community_id, user_id')
        .in('community_id', ids)
        .limit(400)
      if (!active) return

      // Je Community auf perCommunity begrenzen
      const byCommunity = {}
      const wantedUserIds = new Set()
      for (const r of (rows || [])) {
        const arr = (byCommunity[r.community_id] ||= [])
        if (arr.length < perCommunity) { arr.push(r.user_id); wantedUserIds.add(r.user_id) }
      }
      if (wantedUserIds.size === 0) { setPreviews({}); return }

      const { data: profs } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name, username')
        .in('id', [...wantedUserIds])
      if (!active) return

      const profMap = Object.fromEntries((profs || []).map(p => [p.id, p]))
      const map = {}
      for (const [cid, uids] of Object.entries(byCommunity)) {
        map[cid] = uids.map(uid => profMap[uid]).filter(Boolean)
          .map(p => ({ id: p.id, avatar_url: p.avatar_url || null, full_name: p.full_name || p.username }))
      }
      setPreviews(map)
    })()

    return () => { active = false }
  }, [key, perCommunity]) // eslint-disable-line react-hooks/exhaustive-deps

  return previews
}
