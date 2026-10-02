import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ════════════════════════════════════════════════════════════════════════
// "Oikos Verbindungen anzeigen" auf der Weltkarte: eigene Oikos Maps
// auswählen → Modus wählen (nur bereits sichtbare Geschwister vs. jeder mit
// zugewiesenem Standort) → Personen-Positionen + Beziehungslinien laden.
// Trimmt useOikosFilterSource.js's Muster auf "nur eigene Maps" (kein
// Geschwister-Maps-Zweig), da dieser Flow nur die eigenen Maps des Nutzers
// zur Auswahl anbietet.
// ════════════════════════════════════════════════════════════════════════
export function useOikosWorldMapSource({ enabled }) {
  const { user } = useAuth()

  const [ownMaps, setOwnMaps] = useState([])
  const [loadingMaps, setLoadingMaps] = useState(false)
  const [checkedMapIds, setCheckedMapIds] = useState(new Set())

  const [step, setStep] = useState('maps') // 'maps' | 'mode'
  const [whoMode, setWhoMode] = useState(null) // null | 'linked_visible' | 'all_assigned'
  const [active, setActive] = useState(false)
  const [loadingResult, setLoadingResult] = useState(false)

  // Modus A ("nur bereits sichtbare Geschwister"): Personen mit linked_user_id
  // aus den ausgewählten Maps – wird in WorldMapView.jsx gegen visibleUsers
  // abgeglichen, hier nur roh geladen.
  const [linkedPeople, setLinkedPeople] = useState([])
  // Modus B ("jeder mit zugewiesenem Standort"): RPC-Ergebnis.
  const [locationPins, setLocationPins] = useState([])
  // Beide Modi: Beziehungs-Kanten der ausgewählten Maps.
  const [connections, setConnections] = useState([])

  useEffect(() => {
    if (!enabled || !user) return
    setLoadingMaps(true)
    supabase.from('oikos_maps').select('id, name').eq('user_id', user.id).order('created_at')
      .then(({ data }) => {
        setOwnMaps(data || [])
        setLoadingMaps(false)
      })
  }, [enabled, user?.id])

  function toggleMap(id) {
    setCheckedMapIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setAllMaps(on) {
    setCheckedMapIds(on ? new Set(ownMaps.map(m => m.id)) : new Set())
  }

  function confirmMaps() {
    if (checkedMapIds.size === 0) return
    setStep('mode')
  }

  function backToMaps() {
    setStep('maps')
  }

  async function confirmMode(mode) {
    const mapIds = [...checkedMapIds]
    if (mapIds.length === 0) return
    setWhoMode(mode)
    setLoadingResult(true)
    try {
      const [{ data: connData }, modeResult] = await Promise.all([
        supabase.rpc('get_oikos_map_connections', { p_map_ids: mapIds }),
        mode === 'all_assigned'
          ? supabase.rpc('get_oikos_map_people_locations', { p_map_ids: mapIds })
          : supabase.from('oikos_people').select('id, name, linked_user_id, map_id').in('map_id', mapIds).not('linked_user_id', 'is', null),
      ])
      setConnections(connData || [])
      if (mode === 'all_assigned') {
        setLocationPins(modeResult.data || [])
        setLinkedPeople([])
      } else {
        setLinkedPeople(modeResult.data || [])
        setLocationPins([])
      }
      setActive(true)
    } finally {
      setLoadingResult(false)
    }
  }

  function reset() {
    setActive(false)
    setWhoMode(null)
    setStep('maps')
    setLinkedPeople([])
    setLocationPins([])
    setConnections([])
  }

  return {
    ownMaps, loadingMaps, checkedMapIds, toggleMap, setAllMaps,
    step, confirmMaps, backToMaps,
    whoMode, confirmMode, loadingResult,
    active, linkedPeople, locationPins, connections,
    reset,
  }
}
