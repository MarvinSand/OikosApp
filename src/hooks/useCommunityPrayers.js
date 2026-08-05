import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { normalizePrayer, KIND_PERSONAL } from '../lib/prayerModel'

// ════════════════════════════════════════════════════════════════════════
// Gebete einer Community
// ════════════════════════════════════════════════════════════════════════
// Community-Gebete sind echte personal_prayer_requests mit
// visibility='community' + visibility_community_id. Früher lagen sie als
// Chat-Nachrichten mit localStorage-Zähler vor – dadurch war jedes „Gebetet"
// nur auf dem eigenen Gerät sichtbar.
//
// Beim Anlegen wird zusätzlich eine Chat-Nachricht gepostet, die auf das
// Anliegen zeigt. So bleibt das Gebet im Community-Chat sichtbar und die
// Chat-Blase bedient denselben Gebets-Zähler.
export function useCommunityPrayers(communityId, conversationId) {
  const { user } = useAuth()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!communityId || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('personal_prayer_requests')
      .select('*, profiles!owner_id(id, username, full_name, gender, is_christian, avatar_url)')
      .eq('visibility', 'community')
      .eq('visibility_community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) console.error('[useCommunityPrayers] load fehlgeschlagen:', error)
    setPrayers((data || []).map(r => normalizePrayer(r, { kind: KIND_PERSONAL, source: 'community' })))
    setLoading(false)
  }, [communityId, user?.id])

  useEffect(() => { load() }, [load])

  async function createPrayer(title, description) {
    const { data, error } = await supabase
      .from('personal_prayer_requests')
      .insert({
        owner_id: user.id,
        title,
        description: description || null,
        visibility: 'community',
        visibility_community_id: communityId,
        is_answered: false,
      })
      .select('*, profiles!owner_id(id, username, full_name, gender, is_christian, avatar_url)')
      .single()
    if (error) throw error

    // Das Gebet zusätzlich in den Community-Chat stellen (best effort – ein
    // Fehler hier darf das Anliegen nicht verlieren).
    if (conversationId) {
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type: 'prayer_request',
        text: title,
        bible_verse_text: description || null,
        personal_prayer_request_id: data.id,
      })
      if (msgError) console.error('[useCommunityPrayers] Chat-Nachricht fehlgeschlagen:', msgError)
    }

    const normalized = normalizePrayer(data, { kind: KIND_PERSONAL, source: 'community' })
    setPrayers(prev => [normalized, ...prev])
    return normalized
  }

  return { prayers, loading, createPrayer, reload: load }
}
