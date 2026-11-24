import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { readCache, writeCache } from '../lib/swrCache'
import { HIGHLIGHTS_CHANGED_EVENT } from '../lib/highlightComposer'

// Von Moderatoren gesetzte Highlights im Aktuelles-Tab (Updates, hervor-
// gehobene Weltkarten-Events und Gebete). Liest über die RPC
// get_home_highlights() – sie prüft Sichtbarkeit/Blockierungen. Stand wird
// sofort aus dem Cache gezeigt und still aktualisiert.
export function useHomeHighlights() {
  const { user } = useAuth()
  const [items, setItems] = useState(() => readCache(user?.id, 'homeHighlights') ?? [])

  const load = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase.rpc('get_home_highlights')
    if (error) return // alten Stand behalten
    const list = Array.isArray(data) ? data : []
    setItems(list)
    writeCache(user.id, 'homeHighlights', list)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // Moderator hat irgendwo (⋯-Menü) etwas hervorgehoben → neu laden
  useEffect(() => {
    window.addEventListener(HIGHLIGHTS_CHANGED_EVENT, load)
    return () => window.removeEventListener(HIGHLIGHTS_CHANGED_EVENT, load)
  }, [load])

  return { items, reload: load }
}
