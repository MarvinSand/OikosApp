import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useConnectionsList } from './useConnectionsList'
import { KIND_OIKOS } from '../lib/prayerModel'

// ════════════════════════════════════════════════════════════════════════
// Mehrstufiger Oikos-Filter: Von wem → welche Maps → welche Personen
// ════════════════════════════════════════════════════════════════════════
// Lädt Referenzdaten (Geschwister, eigene Maps, Geschwister-Maps, Personen
// je Map) und hält den Auswahlzustand. Default = alles an, also identisch
// zum bisherigen ungefilterten Oikos-Feed. usePrayerFeed('oikos', …) lädt
// bereits das volle sichtbare Universum – dieser Hook schränkt nur
// clientseitig ein, kein zusätzlicher Feed-Refetch nötig.
export function useOikosFilterSource({ enabled }) {
  const { user } = useAuth()
  const { connections: siblings, loading: siblingsLoading } = useConnectionsList(enabled ? user?.id : null)

  const [ownMaps, setOwnMaps] = useState([])
  const [siblingMaps, setSiblingMaps] = useState([])
  const [peopleByMap, setPeopleByMap] = useState({})   // map_id -> [{id, name}]
  const [loading, setLoading] = useState(false)

  const [mineOn, setMineOn] = useState(true)
  const [siblingsOn, setSiblingsOn] = useState(true)
  const [checkedSiblingIds, setCheckedSiblingIds] = useState(new Set())
  const [checkedMapIds, setCheckedMapIds] = useState(new Set())
  const [checkedPersonIds, setCheckedPersonIds] = useState(new Set())

  // ── Eigene Maps laden ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !user) return
    supabase.from('oikos_maps').select('id, name').eq('user_id', user.id).order('created_at')
      .then(({ data }) => setOwnMaps(data || []))
  }, [enabled, user?.id])

  // ── Geschwister-Maps laden, sobald es Geschwister gibt ──────────────
  useEffect(() => {
    if (!enabled || siblings.length === 0) { setSiblingMaps([]); return }
    const siblingIds = siblings.map(s => s.id)
    supabase.from('oikos_maps').select('id, name, user_id').in('user_id', siblingIds).order('created_at')
      .then(({ data }) => setSiblingMaps(data || []))
  }, [enabled, siblings.length])

  // ── Personen je Map laden ────────────────────────────────────────────
  const allMapIds = useMemo(
    () => [...new Set([...ownMaps.map(m => m.id), ...siblingMaps.map(m => m.id)])],
    [ownMaps, siblingMaps],
  )
  const allMapIdsKey = allMapIds.join(',')
  useEffect(() => {
    if (!enabled || allMapIds.length === 0) { setPeopleByMap({}); return }
    setLoading(true)
    supabase.from('oikos_people').select('id, name, map_id').in('map_id', allMapIds)
      .then(({ data }) => {
        const byMap = {}
        for (const p of (data || [])) (byMap[p.map_id] ||= []).push(p)
        setPeopleByMap(byMap)
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, allMapIdsKey])

  // ── Geschwister-Häkchen: default = alle, neue Geschwister automatisch mit ──
  const knownSiblingIdsRef = useRef(new Set())
  useEffect(() => {
    if (siblings.length === 0) return
    setCheckedSiblingIds(prev => {
      const next = new Set(prev)
      for (const s of siblings) {
        if (!knownSiblingIdsRef.current.has(s.id)) next.add(s.id)
      }
      knownSiblingIdsRef.current = new Set(siblings.map(s => s.id))
      return next
    })
  }, [siblings])

  // ── Verfügbare Maps aus der Herkunfts-Auswahl ableiten ──────────────
  const siblingById = useMemo(() => Object.fromEntries(siblings.map(s => [s.id, s])), [siblings])
  const availableMaps = useMemo(() => {
    const own = mineOn ? ownMaps.map(m => ({ id: m.id, name: m.name, ownerId: user?.id, ownerName: null, isOwn: true })) : []
    const fromSiblings = siblingsOn
      ? siblingMaps.filter(m => checkedSiblingIds.has(m.user_id)).map(m => {
          const owner = siblingById[m.user_id]
          return {
            id: m.id, name: m.name, ownerId: m.user_id, isOwn: false,
            ownerName: owner ? (owner.full_name || owner.username) : 'Geschwister',
          }
        })
      : []
    return [...own, ...fromSiblings]
  }, [mineOn, siblingsOn, ownMaps, siblingMaps, checkedSiblingIds, siblingById, user?.id])
  const availableMapIdsKey = availableMaps.map(m => m.id).join(',')

  // ── Map-Häkchen: bestehende behalten, neu verfügbare automatisch mit,
  //    nicht mehr verfügbare verwerfen. So bleibt "Alle" wirklich alle. ──
  const knownMapIdsRef = useRef(new Set())
  useEffect(() => {
    const availableIds = new Set(availableMaps.map(m => m.id))
    setCheckedMapIds(prev => {
      const next = new Set()
      for (const id of prev) if (availableIds.has(id)) next.add(id)
      for (const id of availableIds) if (!knownMapIdsRef.current.has(id)) next.add(id)
      knownMapIdsRef.current = availableIds
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMapIdsKey])

  // ── Verfügbare Personen aus den angehakten Maps ──────────────────────
  const availablePeople = useMemo(() => {
    const list = []
    for (const mapId of checkedMapIds) {
      const map = availableMaps.find(m => m.id === mapId)
      for (const p of (peopleByMap[mapId] || [])) list.push({ id: p.id, name: p.name, mapId, mapName: map?.name || null })
    }
    return list
  }, [checkedMapIds, peopleByMap, availableMaps])
  const availablePersonIdsKey = availablePeople.map(p => p.id).join(',')

  const knownPersonIdsRef = useRef(new Set())
  useEffect(() => {
    const availableIds = new Set(availablePeople.map(p => p.id))
    setCheckedPersonIds(prev => {
      const next = new Set()
      for (const id of prev) if (availableIds.has(id)) next.add(id)
      for (const id of availableIds) if (!knownPersonIdsRef.current.has(id)) next.add(id)
      knownPersonIdsRef.current = availableIds
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePersonIdsKey])

  // ── Bulk-Aktionen ────────────────────────────────────────────────────
  function setAllSiblings(on) {
    setCheckedSiblingIds(on ? new Set(siblings.map(s => s.id)) : new Set())
  }
  function setAllMaps(on) {
    setCheckedMapIds(on ? new Set(availableMaps.map(m => m.id)) : new Set())
  }
  function setAllPeople(on) {
    setCheckedPersonIds(on ? new Set(availablePeople.map(p => p.id)) : new Set())
  }
  function toggleSibling(id) {
    setCheckedSiblingIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleMap(id) {
    setCheckedMapIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function togglePerson(id) {
    setCheckedPersonIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Anwenden auf ein Gebet ───────────────────────────────────────────
  function matchesPrayer(prayer) {
    if (prayer.kind !== KIND_OIKOS) return true
    const ownerOk = prayer.isOwnMap ? mineOn : (siblingsOn && checkedSiblingIds.has(prayer.mapOwnerId))
    if (!ownerOk) return false
    if (prayer.mapId && !checkedMapIds.has(prayer.mapId)) return false
    if (prayer.personId && !checkedPersonIds.has(prayer.personId)) return false
    return true
  }

  const isActive =
    !mineOn || !siblingsOn ||
    checkedSiblingIds.size !== siblings.length ||
    checkedMapIds.size !== availableMaps.length ||
    checkedPersonIds.size !== availablePeople.length

  return {
    loading: loading || siblingsLoading,
    siblings, ownMaps, availableMaps, availablePeople,
    mineOn, setMineOn, siblingsOn, setSiblingsOn,
    checkedSiblingIds, checkedMapIds, checkedPersonIds,
    toggleSibling, toggleMap, togglePerson,
    setAllSiblings, setAllMaps, setAllPeople,
    matchesPrayer, isActive,
  }
}
