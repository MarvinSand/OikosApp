import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from '../context/ToastContext'
import { readCache, writeCache } from '../lib/swrCache'

// Pro Karte zuletzt geladener Stand → Kartenwechsel rendert sofort, aktualisiert still.
const mapCacheKey = (mapId) => `oikos-map:${mapId}`

// LocalStorage helpers for is_secondary persistence (fallback if DB column missing)
function getSecondaryIds() {
  try { return new Set(JSON.parse(localStorage.getItem('oikos_secondary_ids') || '[]')) }
  catch { return new Set() }
}
function saveSecondaryId(id, isSecondary) {
  const ids = getSecondaryIds()
  if (isSecondary) ids.add(id); else ids.delete(id)
  localStorage.setItem('oikos_secondary_ids', JSON.stringify([...ids]))
}

export function useOikosMaps({ initialMapId = null, skipLoad = false } = {}) {
  const { user } = useAuth()
  const { showToast } = useToast() ?? {}
  // Kartenliste startet mit dem zuletzt geladenen Stand (swrCache) und wird still aktualisiert
  const [cachedMaps] = useState(() => readCache(user?.id, 'oikosMaps'))
  const [maps, setMaps] = useState(cachedMaps ?? [])
  const [activeMapId, setActiveMapId] = useState(() =>
    cachedMaps?.find(m => m.id === initialMapId)?.id
    ?? cachedMaps?.find(m => m.kind === 'siblings')?.id
    ?? cachedMaps?.[0]?.id ?? null)
  const [people, setPeople] = useState([])
  const [connections, setConnections] = useState([])
  const [overlayData, setOverlayData] = useState([])
  const [loading, setLoading] = useState(!cachedMaps)
  // Zu welcher Karte gehören people/connections/overlayData gerade? (verhindert Vermischen)
  const [dataMapId, setDataMapId] = useState(null)
  const activeMapIdRef = useRef(null)
  activeMapIdRef.current = activeMapId

  function reportError(err, msg = 'Speichern fehlgeschlagen') {
    console.error(msg, err)
    showToast?.(msg, 'error')
  }

  useEffect(() => {
    if (!user || skipLoad) return
    loadMaps()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Route wechselt (/map/A → /map/B) bei gleicher MapView-Instanz → Karte mitwechseln
  useEffect(() => {
    if (initialMapId && maps.some(m => m.id === initialMapId)) setActiveMapId(initialMapId)
  }, [initialMapId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipLoad) return
    if (!activeMapId) { setPeople([]); setConnections([]); setOverlayData([]); setDataMapId(null); return }
    // Gecachten Stand sofort zeigen (kein Spinner), sonst leeren – nie alte Karte stehen lassen
    const cached = user ? readCache(user.id, mapCacheKey(activeMapId)) : undefined
    if (cached) {
      setPeople(cached.people || [])
      setConnections(cached.connections || [])
      setOverlayData(cached.overlayData || [])
      setDataMapId(activeMapId)
    } else {
      setPeople([]); setConnections([]); setOverlayData([]); setDataMapId(null)
    }
    loadMapData(activeMapId)
  }, [activeMapId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Aktuellen Stand der aktiven Karte (inkl. lokaler Änderungen) im Cache halten
  useEffect(() => {
    if (!user || !dataMapId || dataMapId !== activeMapId) return
    writeCache(user.id, mapCacheKey(dataMapId), { people, connections, overlayData })
  }, [people, connections, overlayData, dataMapId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Personen + Verbindungen parallel laden, danach Overlays; veraltete Antworten verwerfen
  async function loadMapData(mapId) {
    const [peopleRes, connRes] = await Promise.all([
      supabase.from('oikos_people').select('*').eq('map_id', mapId).order('created_at'),
      supabase.from('oikos_connections').select('*').eq('map_id', mapId),
    ])
    if (activeMapIdRef.current !== mapId) return
    if (peopleRes.error || connRes.error) {
      console.error('Karte laden fehlgeschlagen', peopleRes.error || connRes.error)
      return // gecachten Stand behalten
    }
    const secondaryIds = getSecondaryIds()
    const persons = (peopleRes.data || []).map(p => ({
      ...p,
      is_secondary: p.is_secondary || secondaryIds.has(p.id),
    }))
    setPeople(persons)
    setConnections(connRes.data || [])
    setDataMapId(mapId)
    await loadOverlayPeopleFor(persons, mapId)
  }

  async function loadMaps() {
    const { data, error } = await supabase
      .from('oikos_maps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    // Fehler: gecachten Stand behalten
    if (error) { setLoading(false); return }
    // Systemkarte „Meine Geschwister in Christus" immer als erste angepinnt
    const sorted = [...(data || [])].sort((a, b) =>
      (b.kind === 'siblings') - (a.kind === 'siblings'))
    setMaps(sorted)
    writeCache(user.id, 'oikosMaps', sorted)
    // Gewählte Karte behalten; sonst gewünschte (Route) oder die angepinnte Systemkarte
    const keep = activeMapIdRef.current && sorted.some(m => m.id === activeMapIdRef.current)
      ? activeMapIdRef.current
      : (sorted.find(m => m.id === initialMapId)?.id ?? sorted[0]?.id ?? null)
    if (keep) setActiveMapId(keep)
    setLoading(false)

    // Freunde in die Systemkarte spiegeln, danach Personen neu laden
    const siblings = sorted.find(m => m.kind === 'siblings')
    if (siblings) {
      supabase.rpc('sync_siblings_map').then(async ({ data: res, error }) => {
        if (error) { console.error('sync_siblings_map', error); return }
        // Personen entfernter/blockierter Freunde aus der Karte nehmen
        const stale = res?.stale_person_ids || []
        if (stale.length > 0) await supabase.from('oikos_people').delete().in('id', stale)
        // Nur nachladen, wenn die Systemkarte noch aktiv ist
        if (activeMapIdRef.current === siblings.id) loadMapData(siblings.id)
      })
    }
  }

  async function loadOverlayPeopleFor(persons, mapId = activeMapIdRef.current) {
    const withOverlay = persons.filter(p => p.overlay_map_ids?.length > 0)
    if (withOverlay.length === 0) { setOverlayData([]); return }

    const [results, connResults] = await Promise.all([
      Promise.all(
        withOverlay.map(p =>
          supabase
            .from('oikos_people')
            .select('*')
            .in('map_id', p.overlay_map_ids)
            .order('created_at')
        )
      ),
      Promise.all(
        withOverlay.map(p =>
          supabase
            .from('oikos_connections')
            .select('*')
            .in('map_id', p.overlay_map_ids)
        )
      ),
    ])
    if (activeMapIdRef.current !== mapId) return // Karte wurde inzwischen gewechselt
    const secondaryIds = getSecondaryIds()
    setOverlayData(withOverlay.map((p, i) => {
      const persons = (results[i].data || []).map(op => ({
        ...op,
        is_secondary: op.is_secondary || secondaryIds.has(op.id),
      }))
      return {
        parentPersonId: p.id,
        persons,
        personCount: persons.length,
        connections: connResults[i].data || [],
        showChristian: p.overlay_show_christian !== false,
        showNonChristian: p.overlay_show_non_christian !== false,
      }
    }))
  }

  async function loadConnections(mapId = activeMapIdRef.current) {
    const { data } = await supabase
      .from('oikos_connections')
      .select('*')
      .eq('map_id', mapId)
    if (activeMapIdRef.current !== mapId) return
    setConnections(data || [])
  }

  async function createMap({ name, visibility = 'private', visibility_user_ids = [], visibility_community_id = null }) {
    const { data, error } = await supabase
      .from('oikos_maps')
      .insert({ user_id: user.id, name, visibility, visibility_user_ids, visibility_community_id })
      .select()
      .single()
    if (error) throw error
    setMaps(prev => [...prev, data])
    setActiveMapId(data.id)
    return data
  }

  async function deleteMap(mapId) {
    if (maps.find(m => m.id === mapId)?.kind === 'siblings') return
    const { error } = await supabase.from('oikos_maps').delete().eq('id', mapId)
    if (error) throw error
    const remaining = maps.filter(m => m.id !== mapId)
    setMaps(remaining)
    if (activeMapId === mapId) {
      setActiveMapId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  async function updateMap(mapId, updates) {
    // Name/Sichtbarkeit der Systemkarte sind fest (privat, „Meine Geschwister in Christus")
    if (maps.find(m => m.id === mapId)?.kind === 'siblings') return maps.find(m => m.id === mapId)
    const { data, error } = await supabase
      .from('oikos_maps')
      .update(updates)
      .eq('id', mapId)
      .select()
      .single()
    if (error) throw error
    setMaps(prev => prev.map(m => m.id === mapId ? data : m))
    return data
  }

  async function addPerson(name, isSecondary = false, extra = {}) {
    const { data, error } = await supabase
      .from('oikos_people')
      .insert({ map_id: activeMapId, user_id: user.id, name, impact_stage: 1, ...extra })
      .select()
      .single()
    if (error) throw error
    const personData = { ...data, ...extra, is_secondary: isSecondary || data.is_secondary || false }
    setPeople(prev => [...prev, personData])
    if (isSecondary) {
      saveSecondaryId(data.id, true)
      supabase.from('oikos_people').update({ is_secondary: true }).eq('id', data.id)
        .then(({ error: err }) => { if (err) console.error('is_secondary save failed', err) })
    }
    return personData
  }

  async function setPersonSecondary(id, isSecondary) {
    saveSecondaryId(id, isSecondary)
    setPeople(prev => prev.map(p => p.id === id ? { ...p, is_secondary: isSecondary } : p))
    supabase.from('oikos_people').update({ is_secondary: isSecondary }).eq('id', id)
      .then(({ error: err }) => { if (err) console.error('is_secondary save failed', err) })
  }

  async function updatePerson(id, updates) {
    // Optimistic update so UI responds immediately
    setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    try {
      const { data, error } = await supabase
        .from('oikos_people')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      // Merge: keep optimistic values for columns DB may not have returned
      setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates, ...data } : p))
    } catch (err) {
      // For new columns (circle_color, name_color) that may not exist yet,
      // keep the optimistic state so at least the session looks right.
      throw err
    }
  }

  async function deletePerson(id) {
    if (maps.find(m => m.id === activeMapId)?.kind === 'siblings') {
      showToast?.('Diese Karte wird automatisch aus deinen Verbindungen erstellt', 'error')
      return
    }
    const { error } = await supabase.from('oikos_people').delete().eq('id', id)
    if (error) {
      reportError(error, 'Löschen fehlgeschlagen')
      loadMapData(activeMapId)
      return
    }
    setPeople(prev => prev.filter(p => p.id !== id))
    setConnections(prev => prev.filter(c => c.source_person_id !== id && c.target_person_id !== id))
    setOverlayData(prev => prev.filter(od => od.parentPersonId !== id))
  }

  async function movePersonPosition(personId, posX, posY) {
    const { error } = await supabase.from('oikos_people').update({ pos_x: posX, pos_y: posY }).eq('id', personId)
    if (error) { reportError(error, 'Position konnte nicht gespeichert werden'); return }
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, pos_x: posX, pos_y: posY } : p))
  }

  async function createConnection(sourceId, targetId, label) {
    const existing = connections.find(c =>
      (c.source_person_id === sourceId && c.target_person_id === targetId) ||
      (c.source_person_id === targetId && c.target_person_id === sourceId)
    )
    if (existing) return existing

    const { data, error } = await supabase
      .from('oikos_connections')
      .insert({ map_id: activeMapId, source_person_id: sourceId, target_person_id: targetId, label: label || null })
      .select()
      .single()
    if (error) throw error
    if (data) setConnections(prev => [...prev, data])
    return data
  }

  async function deleteConnection(connectionId) {
    setConnections(prev => prev.filter(c => c.id !== connectionId))
    const { error } = await supabase.from('oikos_connections').delete().eq('id', connectionId)
    if (error) {
      reportError(error, 'Verbindung konnte nicht gelöscht werden')
      loadConnections(activeMapId)
    }
  }

  async function updateConnectionColor(connectionId, color) {
    setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, color } : c))
    try {
      await supabase.from('oikos_connections').update({ color }).eq('id', connectionId)
    } catch { /* column may not exist yet */ }
  }

  async function linkAccount(personId, linkedUserId) {
    const { error } = await supabase.from('oikos_people').update({ linked_user_id: linkedUserId }).eq('id', personId)
    if (error) { reportError(error, 'Verknüpfung fehlgeschlagen'); return }
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, linked_user_id: linkedUserId } : p))
  }

  async function unlinkAccount(personId) {
    const { error } = await supabase.from('oikos_people').update({ linked_user_id: null, overlay_map_ids: [] }).eq('id', personId)
    if (error) { reportError(error, 'Verknüpfung konnte nicht entfernt werden'); return }
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, linked_user_id: null, overlay_map_ids: [] } : p))
    setOverlayData(prev => prev.filter(od => od.parentPersonId !== personId))
  }

  async function updatePersonOverlay(personId, { overlay_map_ids, overlay_show_christian, overlay_show_non_christian }) {
    const ids = overlay_map_ids || []
    const updates = {
      overlay_map_ids: ids,
      overlay_show_christian: overlay_show_christian !== false,
      overlay_show_non_christian: overlay_show_non_christian !== false,
    }
    const { error } = await supabase.from('oikos_people').update(updates).eq('id', personId)
    if (error) {
      // Spalten fehlen evtl. noch in der DB (siehe supabase/phase44_oikos_people_columns.sql).
      // Overlay trotzdem für diese Session anzeigen, damit der User nicht blockiert ist.
      reportError(error, 'Einstellung nur für diese Sitzung übernommen – Migration phase44 in Supabase ausführen')
    }
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, ...updates } : p))

    if (ids.length > 0) {
      const [{ data }, { data: connData }] = await Promise.all([
        supabase
          .from('oikos_people')
          .select('*')
          .in('map_id', ids)
          .order('created_at'),
        supabase
          .from('oikos_connections')
          .select('*')
          .in('map_id', ids),
      ])
      setOverlayData(prev => {
        const rest = prev.filter(od => od.parentPersonId !== personId)
        const secondaryIds = getSecondaryIds()
        const persons = (data || []).map(op => ({
          ...op,
          is_secondary: op.is_secondary || secondaryIds.has(op.id),
        }))
        return [...rest, {
          parentPersonId: personId,
          persons,
          personCount: persons.length,
          connections: connData || [],
          showChristian: overlay_show_christian !== false,
          showNonChristian: overlay_show_non_christian !== false,
        }]
      })
    } else {
      setOverlayData(prev => prev.filter(od => od.parentPersonId !== personId))
    }
  }

  return {
    maps,
    setMaps,
    activeMapId,
    setActiveMapId,
    activeMap: maps.find(m => m.id === activeMapId),
    people,
    connections,
    overlayData,
    dataMapId,
    loading,
    createMap,
    updateMap,
    deleteMap,
    addPerson,
    setPersonSecondary,
    updatePerson,
    deletePerson,
    movePersonPosition,
    createConnection,
    deleteConnection,
    updateConnectionColor,
    linkAccount,
    unlinkAccount,
    updatePersonOverlay,
    reloadMap: loadMaps,
  }
}
