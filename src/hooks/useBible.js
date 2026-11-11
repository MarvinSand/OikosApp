import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { fetchBiblePath } from '../lib/youversion'
import { wrapVersesInHtml } from '../lib/biblePassageHtml'
import { HIGHLIGHT_COLORS, normalizeColorKey, colorsEqual, isPresetColor } from '../lib/bibleColors'
import { DEFAULT_STARRED_IDS, DEFAULT_STARRED_VERSIONS } from '../lib/bibleVersionDefaults'

// Numerische YouVersion-Bibel-ID. 73 = "Hoffnung für alle" (Default). Alle
// ~1479 verfügbaren Übersetzungen liefert useBibleVersions() – darüber lässt
// sich die Version wie in der YouVersion-App umschalten.
export const DEFAULT_BIBLE_ID = '73'

// ─── Kapitel-Cache ───
// Jeder Kapitelabruf läuft über die bible-api Edge Function zu YouVersion
// (in den Logs ~0,7 s, bei kalter Function deutlich mehr). Bibeltext ändert
// sich nicht – zuletzt gelesene Kapitel deshalb lokal vorhalten: der Bibel-
// Tab öffnet so sofort an der letzten Stelle, Zurückblättern ist instant.
// v2: wrapVersesInHtml wurde gefixt (Poesie-Zeilen ohne eigenen Vers-Marker
// wurden nicht mehr markiert) - alte v1-Cache-Einträge enthalten noch das
// falsch gewrappte HTML und müssen verworfen werden, sonst bleibt der Bug
// trotz Code-Fix für bereits besuchte Kapitel bestehen.
const CHAPTER_CACHE_KEY = 'oikos_bible_chapters_v2'
const CHAPTER_CACHE_MAX = 30
const chapterMem = new Map() // key -> html (Einfügereihenfolge = LRU)
let chapterCacheLoaded = false

function loadChapterCache() {
  if (chapterCacheLoaded) return
  chapterCacheLoaded = true
  try {
    const entries = JSON.parse(localStorage.getItem(CHAPTER_CACHE_KEY) || '[]')
    for (const [k, v] of entries) chapterMem.set(k, v)
  } catch { /* ignore */ }
}

function getCachedChapter(key) {
  loadChapterCache()
  if (!chapterMem.has(key)) return null
  const html = chapterMem.get(key)
  chapterMem.delete(key)
  chapterMem.set(key, html)
  return html
}

function putCachedChapter(key, html) {
  loadChapterCache()
  chapterMem.delete(key)
  chapterMem.set(key, html)
  while (chapterMem.size > CHAPTER_CACHE_MAX) chapterMem.delete(chapterMem.keys().next().value)
  try {
    localStorage.setItem(CHAPTER_CACHE_KEY, JSON.stringify([...chapterMem.entries()]))
  } catch {
    // Speicher voll: persistente Kopie verwerfen, im Speicher weitermachen
    try { localStorage.removeItem(CHAPTER_CACHE_KEY) } catch { /* ignore */ }
  }
}

// GET /v1/bibles/{id}/books/{book}/chapters/{chapter}/verses liefert nur eine
// Referenzliste (id/passage_id/title) OHNE Bibeltext. Der eigentliche Text
// kommt über GET /v1/bibles/{id}/passages/{referenz}?format=html (Feld
// `content`), mit <span class="yv-v" v="N"> als Versmarker – siehe
// wrapVersesInHtml für die Aufbereitung zu antippbaren Vers-Elementen.
export function useChapterText(bibleId, book, chapter) {
  const key = `${bibleId}:${book}.${chapter}`
  const [state, setState] = useState(() => {
    const cached = book && chapter ? getCachedChapter(key) : null
    return { key, html: cached, loading: !cached, error: null }
  })
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!book || !chapter) return
    const cached = getCachedChapter(key)
    if (cached) {
      setState({ key, html: cached, loading: false, error: null })
      return
    }
    let cancelled = false
    setState({ key, html: null, loading: true, error: null })
    fetchBiblePath(`/v1/bibles/${bibleId}/passages/${book}.${chapter}?format=html`)
      .then(data => {
        if (cancelled) return
        const content = data?.data?.content ?? data?.content ?? ''
        const html = wrapVersesInHtml(content)
        if (content) putCachedChapter(key, html)
        setState({ key, html, loading: false, error: null })
      })
      .catch(e => { if (!cancelled) setState({ key, html: null, loading: false, error: e.message }) })
    return () => { cancelled = true }
  }, [key, bibleId, book, chapter, retryToken])

  // Beim Kapitelwechsel nie kurz den Text des vorherigen Kapitels zeigen –
  // ein gecachtes Kapitel aber sofort (ohne „Lädt…"-Frame bis zum Effekt)
  let current = state
  if (state.key !== key) {
    const cachedNow = book && chapter ? getCachedChapter(key) : null
    current = cachedNow
      ? { html: cachedNow, loading: false, error: null }
      : { html: null, loading: true, error: null }
  }
  return { ...current, retry: () => setRetryToken(t => t + 1) }
}

function passageIdFor(book, chapter, verseStart, verseEnd) {
  if (verseStart == null) return `${book}.${chapter}`
  if (verseEnd && verseEnd !== verseStart) return `${book}.${chapter}.${verseStart}-${book}.${chapter}.${verseEnd}`
  return `${book}.${chapter}.${verseStart}`
}

export function usePassageText(bibleId, book, chapter, verseStart, verseEnd) {
  const [html, setHtml] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!book || !chapter) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBiblePath(`/v1/bibles/${bibleId}/passages/${passageIdFor(book, chapter, verseStart, verseEnd)}?format=html`)
      .then(data => {
        if (cancelled) return
        setHtml(wrapVersesInHtml(data?.data?.content ?? data?.content ?? ''))
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bibleId, book, chapter, verseStart, verseEnd])

  return { html, loading, error }
}

// ─── Übersetzungs-Katalog (pro Sprache) ───
//
// Der Gesamtkatalog (~1479 Übersetzungen, ~20 Seiten) wird NICHT mehr am Stück
// geladen. Stattdessen: Favoriten kommen aus Defaults/lokalem Meta-Cache, und
// erst nach Sprachwahl wird nur diese Sprache abgerufen
// (GET /v1/bibles?language_ranges[]=<tag>, paginiert über next_page_token).

const VERSION_META_KEY = 'oikos_bible_version_meta_v1'
const versionMeta = new Map() // id -> { id, title, localized_title, abbreviation, localized_abbreviation, language_tag }
let versionMetaLoaded = false
const metaListeners = new Set()

function slimVersion(v) {
  return {
    id: String(v.id),
    title: v.title,
    localized_title: v.localized_title,
    abbreviation: v.abbreviation,
    localized_abbreviation: v.localized_abbreviation,
    language_tag: v.language_tag,
  }
}

function loadVersionMeta() {
  if (versionMetaLoaded) return
  versionMetaLoaded = true
  for (const v of DEFAULT_STARRED_VERSIONS) versionMeta.set(String(v.id), v)
  try {
    const entries = JSON.parse(localStorage.getItem(VERSION_META_KEY) || '[]')
    for (const v of entries) if (v?.id && !versionMeta.has(String(v.id))) versionMeta.set(String(v.id), v)
  } catch { /* ignore */ }
}

export function rememberVersions(list) {
  loadVersionMeta()
  let changed = false
  for (const v of list || []) {
    if (!v?.id) continue
    const slim = slimVersion(v)
    const old = versionMeta.get(slim.id)
    if (!old || old.localized_title !== slim.localized_title || old.language_tag !== slim.language_tag) {
      versionMeta.set(slim.id, slim)
      changed = true
    }
  }
  if (!changed) return
  try {
    const persist = [...versionMeta.values()].filter(v => !DEFAULT_STARRED_IDS.includes(String(v.id)))
    localStorage.setItem(VERSION_META_KEY, JSON.stringify(persist.slice(-200)))
  } catch { /* ignore */ }
  metaListeners.forEach(fn => fn())
}

// Meta (Titel/Kürzel) für beliebige Übersetzungs-IDs. Unbekannte IDs (z. B. eine
// früher favorisierte spanische Bibel) werden einzeln per GET /v1/bibles/{id}
// nachgeladen und lokal gemerkt - statt dafür den Gesamtkatalog zu laden.
export function useVersionMeta(ids) {
  const [, force] = useState(0)
  loadVersionMeta()
  const key = [...ids].map(String).sort().join(',')

  useEffect(() => {
    const fn = () => force(n => n + 1)
    metaListeners.add(fn)
    return () => { metaListeners.delete(fn) }
  }, [])

  useEffect(() => {
    let cancelled = false
    const missing = key.split(',').filter(id => id && !versionMeta.has(id))
    if (!missing.length) return
    ;(async () => {
      const found = []
      await Promise.all(missing.map(async id => {
        try {
          const res = await fetchBiblePath(`/v1/bibles/${id}`)
          const v = res?.data ?? res
          if (v?.id) found.push(v)
        } catch { /* ignore */ }
      }))
      if (!cancelled && found.length) rememberVersions(found)
    })()
    return () => { cancelled = true }
  }, [key])

  return (id) => versionMeta.get(String(id))
}

const languageCache = new Map() // tag -> { versions, timestamp }
const LANGUAGE_CACHE_MS = 6 * 60 * 60 * 1000

export function useBibleVersionsByLanguage(tag) {
  const [state, setState] = useState({ tag: null, versions: null, error: null })

  useEffect(() => {
    if (!tag) return
    const cached = languageCache.get(tag)
    if (cached && Date.now() - cached.timestamp < LANGUAGE_CACHE_MS) {
      setState({ tag, versions: cached.versions, error: null })
      return
    }
    let cancelled = false
    setState({ tag, versions: null, error: null })
    ;(async () => {
      try {
        const all = []
        const base = `/v1/bibles?language_ranges[]=${encodeURIComponent(tag)}`
        let path = base
        let guard = 0
        while (path && guard < 40) {
          guard++
          const data = await fetchBiblePath(path)
          all.push(...(data?.data ?? []))
          const token = data?.next_page_token
          path = token ? `${base}&page_token=${encodeURIComponent(token)}` : null
        }
        if (cancelled) return
        languageCache.set(tag, { versions: all, timestamp: Date.now() })
        rememberVersions(all)
        setState({ tag, versions: all, error: null })
      } catch (e) {
        if (!cancelled) setState({ tag, versions: null, error: e.message })
      }
    })()
    return () => { cancelled = true }
  }, [tag])

  const ready = state.tag === tag
  return {
    versions: ready ? state.versions : null,
    loading: !!tag && (!ready || (!state.versions && !state.error)),
    error: ready ? state.error : null,
  }
}

// ─── Favoriten-Übersetzungen ───

// Nutzer ohne eigene Auswahl (noch nie einen Stern gesetzt) sehen
// standardmäßig HFA/Elberfelder 1871/Berean Standard Bible markiert - siehe
// bibleVersionDefaults.js. Sobald der Nutzer selbst einen Stern setzt/
// entfernt, übernimmt dessen eigene (dann nicht mehr leere) Liste komplett;
// wird sie durch Entfernen aller Sterne wieder leer, greifen beim nächsten
// Laden erneut die Defaults - ein bewusst einfacher Kompromiss ohne
// zusätzliches "hat schon angepasst"-Flag in der DB.
export function useFavoriteBibleVersions() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState(new Set(DEFAULT_STARRED_IDS))
  const [loading, setLoading] = useState(true)
  // true = die DB hat für diesen Nutzer noch keine eigene Zeile; `favorites`
  // zeigt nur die Defaults an. Erst bei der ersten Änderung materialisieren
  // wir sie als echte Zeilen - sonst würde ein Entfernen eines Defaults beim
  // nächsten Laden sofort wieder zurückkommen (DB wäre ja weiterhin leer).
  const usingDefaultsRef = useRef(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('bible_favorite_versions').select('bible_id').eq('user_id', user.id)
    const own = new Set((data || []).map(r => String(r.bible_id)))
    usingDefaultsRef.current = own.size === 0
    setFavorites(own.size > 0 ? own : new Set(DEFAULT_STARRED_IDS))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  async function toggleFavorite(bibleId) {
    const id = String(bibleId)
    const wasFavorite = favorites.has(id)
    const next = new Set(favorites)
    if (wasFavorite) next.delete(id)
    else next.add(id)
    setFavorites(next)

    if (usingDefaultsRef.current) {
      // Erste Änderung überhaupt: die komplette neue Liste (nicht nur den
      // einen Eintrag) als echte Zeilen schreiben, damit die DB ab jetzt die
      // Wahrheit ist statt weiterhin leer zu sein.
      usingDefaultsRef.current = false
      await supabase.from('bible_favorite_versions').delete().eq('user_id', user.id)
      if (next.size > 0) {
        await supabase.from('bible_favorite_versions').insert(
          [...next].map(bible_id => ({ user_id: user.id, bible_id }))
        )
      }
      return
    }

    if (wasFavorite) {
      await supabase.from('bible_favorite_versions').delete().eq('user_id', user.id).eq('bible_id', id)
    } else {
      await supabase.from('bible_favorite_versions').insert({ user_id: user.id, bible_id: id })
    }
  }

  return { favorites, loading, toggleFavorite }
}

// ─── Gespeicherte + zuletzt verwendete Highlight-Farben ───
//
// Presets (HIGHLIGHT_COLORS) werden per Namen in bible_highlights.color
// gehalten - hier landen ausschließlich Hex-Werte ('#rrggbb'), damit beide
// Quellen sich nie überschneiden.

export function useSavedBibleColors() {
  const { user } = useAuth()
  const [colors, setColors] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('bible_saved_colors')
      .select('color')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    const seen = new Set()
    const next = []
    for (const r of data || []) {
      const key = normalizeColorKey(r.color)
      if (!key.startsWith('#') || seen.has(key)) continue
      seen.add(key)
      next.push(key)
    }
    setColors(next)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  function isSaved(hex) {
    return colors.some(c => colorsEqual(c, hex))
  }

  async function toggleColor(hex) {
    const value = normalizeColorKey(hex)
    if (!value.startsWith('#') || !user) return
    const wasSaved = isSaved(value)
    setColors(prev => wasSaved
      ? prev.filter(c => !colorsEqual(c, value))
      : [value, ...prev.filter(c => !colorsEqual(c, value))])
    if (wasSaved) {
      // Delete any case/format variants the user may have accumulated.
      await supabase.from('bible_saved_colors').delete().eq('user_id', user.id).eq('color', value)
      await supabase.from('bible_saved_colors').delete().eq('user_id', user.id).eq('color', hex)
    } else {
      await supabase.from('bible_saved_colors').upsert({ user_id: user.id, color: value }, { onConflict: 'user_id,color' })
    }
  }

  return { colors, loading, isSaved, toggleColor, reload: load }
}

export function useRecentBibleColors(limit = 6) {
  const { user } = useAuth()
  const [colors, setColors] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    // PostgREST kennt kein "distinct on" - Dedupe passiert client-seitig über
    // die letzten ~60 Highlights des Nutzers.
    const { data } = await supabase
      .from('bible_highlights')
      .select('color, created_at')
      .eq('user_id', user.id)
      .not('color', 'is', null)
      .order('created_at', { ascending: false })
      .limit(60)
    const seen = new Set()
    const deduped = []
    for (const row of data || []) {
      const c = row.color
      const key = normalizeColorKey(c)
      if (!key.startsWith('#') || isPresetColor(key)) continue
      // Skip hex values that equal a preset hex (e.g. '#fde68a')
      if (Object.values(HIGHLIGHT_COLORS).some(h => h.toLowerCase() === key)) continue
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(key)
      if (deduped.length >= limit) break
    }
    setColors(deduped)
    setLoading(false)
  }, [user?.id, limit])

  useEffect(() => { load() }, [load])

  return { colors, loading, reload: load }
}

// ─── Lokale Marker (eigene + aus YouVersion synchronisierte) ───

export function useBibleMarkers(bibleId, book, chapter, { youversionConnected = false } = {}) {
  const { user } = useAuth()
  const [highlights, setHighlights] = useState([])
  const [notes, setNotes] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !book || !chapter) return
    setLoading(true)

    const loadLocal = async () => {
      const [h, ownNotes, othersNotes, b] = await Promise.all([
        supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
        supabase.from('bible_notes').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
        // Fremde Notizen OHNE user_id-Filter - RLS (phase86_bible_notes_visibility.sql)
        // liefert hier automatisch nur, was gemäß visibility tatsächlich für
        // diesen Betrachter freigegeben ist (public/community/siblings/specific).
        supabase.from('bible_notes')
          .select('*, author:profiles!bible_notes_user_id_fkey(id, full_name, username, avatar_url)')
          .neq('user_id', user.id).eq('book', book).eq('chapter', chapter),
        supabase.from('bible_bookmarks').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
      ])
      if (!h.error) setHighlights(h.data || [])
      if (!ownNotes.error || !othersNotes.error) {
        const mine = (ownNotes.data || []).map(n => ({ ...n, isOwn: true }))
        const others = (othersNotes.data || []).map(n => ({ ...n, isOwn: false }))
        setNotes([...mine, ...others])
      }
      if (!b.error) setBookmarks(b.data || [])
      setLoading(false)
    }

    // Eigene Marker sofort laden – vorher warteten sie auf den YouVersion-
    // Sync unten (in den Logs ~1,8 s, teils mit 500ern).
    await loadLocal()

    // Highlights aus der YouVersion-App für dieses Kapitel spiegeln. Die
    // YouVersion Platform API kennt keine "alle Highlights des Nutzers"-Liste,
    // nur GET /v1/highlights?bible_id=&passage_id=<BUCH>.<KAPITEL> - deshalb
    // bei jedem Kapitelaufruf synchronisieren statt über einen globalen
    // "Sync"-Button. Nur für verbundene Konten (sonst wäre es ein garantiert
    // fehlschlagender Round-Trip pro Kapitel); Fehler -> einfach überspringen.
    if (!youversionConnected) return
    try {
      const data = await fetchBiblePath(`/v1/highlights?bible_id=${bibleId}&passage_id=${book}.${chapter}`, { asUser: true })
      const items = data?.data ?? []
      if (items.length) {
        const rows = items.map(h => {
          const parts = String(h.passage_id).split('.')
          const verse = parseInt(parts[parts.length - 1], 10)
          return {
            user_id: user.id,
            bible_id: String(h.bible_id ?? bibleId),
            book, chapter,
            verse_start: verse,
            verse_end: null,
            reference_label: `${book} ${chapter},${verse}`,
            color: h.color ? `#${h.color}` : '#fde68a',
            source: 'youversion',
            youversion_id: String(h.passage_id),
          }
        })
        const { error } = await supabase.from('bible_highlights').upsert(rows, { onConflict: 'user_id,source,youversion_id' })
        if (!error) {
          const { data } = await supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter)
          if (data) setHighlights(data)
        }
      }
    } catch {
      /* YouVersion-API-Fehler - lokale Highlights reichen */
    }
  }, [user?.id, bibleId, book, chapter, youversionConnected])

  useEffect(() => { load() }, [load])

  // Ranges überlappen, wenn sie Verse teilen (inkl. verse_end = null → Single).
  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    const aE = aEnd ?? aStart
    const bE = bEnd ?? bStart
    return aStart <= bE && bStart <= aE
  }

  async function addHighlight({ verseStart, verseEnd, referenceLabel, color = 'yellow', bibleId = DEFAULT_BIBLE_ID }) {
    if (!user) return { data: null, error: new Error('not signed in') }
    const end = verseEnd ?? null
    // Farbe normalisieren: Preset-Namen bleiben Namen, Hex wird lowercase #rrggbb.
    const storedColor = isPresetColor(color) ? normalizeColorKey(color) : (normalizeColorKey(color) || color)

    // Bestehende eigene Oikos-Highlights im gleichen Kapitel, die den neuen
    // Bereich überlappen → ersetzen (Update Farbe/Range), statt Duplikate
    // anzulegen. Sonst zeigt highlightFor() die älteste Farbe und die UI
    // wirkt "buggy" beim Umfärben.
    const overlapping = highlights.filter(h =>
      h.source === 'oikos'
      && rangesOverlap(verseStart, end, h.verse_start, h.verse_end)
    )

    const tempId = `tmp-${Date.now()}`
    const optimistic = {
      id: overlapping[0]?.id || tempId,
      user_id: user.id, bible_id: bibleId, book, chapter,
      verse_start: verseStart, verse_end: end,
      reference_label: referenceLabel, color: storedColor, source: 'oikos',
    }

    // Optimistic: overlapping raus, neuer rein.
    setHighlights(prev => [
      ...prev.filter(h => !overlapping.some(o => o.id === h.id)),
      optimistic,
    ])

    // Persist: delete extras first, then update-or-insert the keeper.
    const extras = overlapping.slice(1)
    if (extras.length) {
      await supabase.from('bible_highlights').delete().in('id', extras.map(h => h.id))
    }

    let data = null
    let error = null
    if (overlapping[0]) {
      const res = await supabase.from('bible_highlights').update({
        verse_start: verseStart, verse_end: end,
        reference_label: referenceLabel, color: storedColor, bible_id: bibleId,
      }).eq('id', overlapping[0].id).select().single()
      data = res.data; error = res.error
    } else {
      const res = await supabase.from('bible_highlights').insert({
        user_id: user.id, bible_id: bibleId, book, chapter,
        verse_start: verseStart, verse_end: end,
        reference_label: referenceLabel, color: storedColor, source: 'oikos',
      }).select().single()
      data = res.data; error = res.error
    }

    if (error) {
      // Rollback optimistic change by reloading chapter markers.
      const { data: fresh } = await supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter)
      if (fresh) setHighlights(fresh)
      return { data: null, error }
    }
    setHighlights(prev => prev.map(h => (h.id === optimistic.id || h.id === tempId) ? data : h))
    return { data, error: null }
  }

  async function removeHighlight(id) {
    if (!id) return
    setHighlights(prev => prev.filter(h => h.id !== id))
    if (String(id).startsWith('tmp-')) return
    const { error } = await supabase.from('bible_highlights').delete().eq('id', id)
    if (error) {
      const { data: fresh } = await supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter)
      if (fresh) setHighlights(fresh)
    }
  }

  async function addNote({
    verseStart, verseEnd, referenceLabel, note, bibleId = DEFAULT_BIBLE_ID,
    visibility = 'private', visibilityCommunityId = null, visibilitySiblingIds = [], linkedVerses = [],
  }) {
    const { data, error } = await supabase.from('bible_notes').insert({
      user_id: user.id, bible_id: bibleId, book, chapter,
      verse_start: verseStart, verse_end: verseEnd ?? null,
      reference_label: referenceLabel, note, source: 'oikos',
      visibility,
      visibility_community_id: visibility === 'community' ? visibilityCommunityId : null,
      visibility_user_ids: visibility === 'specific' ? visibilitySiblingIds : [],
      linked_verses: linkedVerses,
    }).select().single()
    if (!error) setNotes(prev => [...prev, { ...data, isOwn: true }])
    return { data, error }
  }

  async function removeNote(id) {
    await supabase.from('bible_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  async function toggleBookmark({ verse, referenceLabel, bibleId = DEFAULT_BIBLE_ID }) {
    const existing = bookmarks.find(b => b.verse === verse)
    if (existing) {
      await supabase.from('bible_bookmarks').delete().eq('id', existing.id)
      setBookmarks(prev => prev.filter(b => b.id !== existing.id))
      return
    }
    const { data, error } = await supabase.from('bible_bookmarks').insert({
      user_id: user.id, bible_id: bibleId, book, chapter, verse, reference_label: referenceLabel, source: 'oikos',
    }).select().single()
    if (!error) setBookmarks(prev => [...prev, data])
  }

  return { highlights, notes, bookmarks, loading, addHighlight, removeHighlight, addNote, removeNote, toggleBookmark, reload: load }
}

// Letzte Leseposition zusätzlich lokal: der Bibel-Tab kann so sofort an der
// richtigen Stelle öffnen, statt erst Johannes 3 zu laden und nach dem
// DB-Round-Trip zur gespeicherten Stelle zu springen (doppelter Kapitel-
// Abruf + sichtbarer Sprung).
const LOCAL_POSITION_KEY = 'oikos_bible_position'

export function getLocalReadingPosition() {
  try {
    const pos = JSON.parse(localStorage.getItem(LOCAL_POSITION_KEY) || 'null')
    return pos?.book && pos?.chapter ? pos : null
  } catch {
    return null
  }
}

export async function saveReadingProgress(userId, { bibleId = DEFAULT_BIBLE_ID, book, chapter }) {
  try { localStorage.setItem(LOCAL_POSITION_KEY, JSON.stringify({ book, chapter, bibleId: String(bibleId) })) } catch { /* ignore */ }
  await supabase.from('bible_reading_progress').upsert({
    user_id: userId, bible_id: bibleId, book, chapter, updated_at: new Date().toISOString(),
  })
}

export function useReadingProgress() {
  const { user } = useAuth()
  // undefined = wird noch geladen, null = keine gespeicherte Stelle (oder Fehler)
  const [progress, setProgress] = useState(undefined)

  useEffect(() => {
    if (!user) return
    supabase.from('bible_reading_progress').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProgress(data ?? null), () => setProgress(null))
  }, [user?.id])

  return progress
}

// ─── Wo ein Vers sonst noch verlinkt wurde ───
//
// feed_posts/personal_prayer_requests/creed_lines tragen seit phase62/phase74
// strukturierte Vers-Verknüpfungen (bible_book/bible_chapter/bible_verse_start/
// bible_verse_end). Hier wird NICHT erneut nachgebaut, wer was sehen darf -
// jede Tabelle hat dafür schon ihre eigene RLS-Policy; ein ungefilterter
// Select liefert automatisch nur das, was für den aktuellen Betrachter
// freigegeben ist (gleiches Prinzip wie bei den Bibel-Notizen oben).
function withVerseOverlap(query, verseStart, verseEnd) {
  return query
    .lte('bible_verse_start', verseEnd)
    .or(`bible_verse_end.gte.${verseStart},and(bible_verse_end.is.null,bible_verse_start.gte.${verseStart})`)
}

export function useVerseReferences(book, chapter, verseStart, verseEnd) {
  const [feedPosts, setFeedPosts] = useState([])
  const [prayers, setPrayers] = useState([])
  const [creeds, setCreeds] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!book || !chapter || verseStart == null) return
    setLoading(true)
    const end = verseEnd ?? verseStart

    const [feedRes, prayerRes, creedRes] = await Promise.all([
      withVerseOverlap(
        supabase.from('feed_posts')
          .select('id, body, bible_reference, created_at, author:profiles!feed_posts_author_id_fkey(id, full_name, username, avatar_url)')
          .eq('bible_book', book).eq('bible_chapter', chapter),
        verseStart, end,
      ),
      withVerseOverlap(
        supabase.from('personal_prayer_requests')
          .select('id, title, description, bible_reference, created_at, author:profiles!personal_prayer_requests_owner_id_fkey(id, full_name, username, avatar_url)')
          .eq('bible_book', book).eq('bible_chapter', chapter),
        verseStart, end,
      ),
      withVerseOverlap(
        supabase.from('creed_lines')
          .select('id, body, bible_reference, creed:creeds!creed_lines_creed_id_fkey(id, title, user_id, author:profiles!creeds_user_id_fkey(id, full_name, username, avatar_url))')
          .eq('bible_book', book).eq('bible_chapter', chapter),
        verseStart, end,
      ),
    ])

    setFeedPosts(feedRes.error ? [] : (feedRes.data || []))
    setPrayers(prayerRes.error ? [] : (prayerRes.data || []))
    setCreeds(creedRes.error ? [] : (creedRes.data || []))
    setLoading(false)
  }, [book, chapter, verseStart, verseEnd])

  useEffect(() => { load() }, [load])

  return { feedPosts, prayers, creeds, loading, reload: load }
}
