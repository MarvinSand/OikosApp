import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { fetchBiblePath } from '../lib/youversion'
import { wrapVersesInHtml } from '../lib/biblePassageHtml'
import { HIGHLIGHT_COLORS } from '../lib/bibleColors'
import { DEFAULT_STARRED_IDS } from '../lib/bibleVersionDefaults'

// Numerische YouVersion-Bibel-ID. 73 = "Hoffnung für alle" (Default). Alle
// ~1479 verfügbaren Übersetzungen liefert useBibleVersions() – darüber lässt
// sich die Version wie in der YouVersion-App umschalten.
export const DEFAULT_BIBLE_ID = '73'

// ─── Kapitel-Cache ───
// Jeder Kapitelabruf läuft über die bible-api Edge Function zu YouVersion
// (in den Logs ~0,7 s, bei kalter Function deutlich mehr). Bibeltext ändert
// sich nicht – zuletzt gelesene Kapitel deshalb lokal vorhalten: der Bibel-
// Tab öffnet so sofort an der letzten Stelle, Zurückblättern ist instant.
const CHAPTER_CACHE_KEY = 'oikos_bible_chapters_v1'
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

// Modul-Cache: die Liste aller Übersetzungen ändert sich praktisch nie
// innerhalb einer Session, muss also nicht bei jedem Öffnen des Version-
// Pickers neu über ~20 Seiten nachgeladen werden.
let bibleVersionsCache = null // { versions, timestamp }
const BIBLE_VERSIONS_CACHE_MS = 6 * 60 * 60 * 1000

// GET /v1/bibles?language_ranges[]=* liefert ALLE Übersetzungen (aktuell
// ~1479 Stück, Feld total_size), aber paginiert über next_page_token/
// page_token (~65 Einträge pro Seite). Ohne language_ranges[] lehnt die API
// mit 422 ab - "*" ist der (undokumentierte, aber funktionierende) Wildcard-
// Language-Range.
// `enabled: false` lädt nichts (auch nicht aus dem Cache) - Standard-Favoriten
// + aktuell gewählte Übersetzung kommen ohne API-Call aus
// bibleVersionDefaults.js, der ~1479 Einträge umfassende Katalog wird erst
// abgerufen, sobald der Nutzer den Version-Picker tatsächlich öffnet.
export function useBibleVersions({ enabled = true } = {}) {
  const [versions, setVersions] = useState(bibleVersionsCache?.versions ?? null)
  const [loading, setLoading] = useState(enabled && !bibleVersionsCache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) return
    if (bibleVersionsCache && Date.now() - bibleVersionsCache.timestamp < BIBLE_VERSIONS_CACHE_MS) {
      setVersions(bibleVersionsCache.versions)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const all = []
        let path = '/v1/bibles?language_ranges[]=*'
        let guard = 0
        while (path && guard < 40) {
          guard++
          const data = await fetchBiblePath(path)
          all.push(...(data?.data ?? []))
          const token = data?.next_page_token
          path = token ? `/v1/bibles?language_ranges[]=*&page_token=${encodeURIComponent(token)}` : null
        }
        if (cancelled) return
        bibleVersionsCache = { versions: all, timestamp: Date.now() }
        setVersions(all)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [enabled])

  return { versions, loading, error }
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
    setColors((data || []).map(r => r.color))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  function isSaved(hex) {
    return colors.some(c => c.toLowerCase() === hex?.toLowerCase())
  }

  async function toggleColor(hex) {
    if (!hex?.startsWith('#') || !user) return
    const value = hex.toLowerCase()
    const wasSaved = isSaved(value)
    setColors(prev => wasSaved ? prev.filter(c => c.toLowerCase() !== value) : [value, ...prev])
    if (wasSaved) {
      await supabase.from('bible_saved_colors').delete().eq('user_id', user.id).eq('color', value)
    } else {
      await supabase.from('bible_saved_colors').insert({ user_id: user.id, color: value })
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
      if (!c || !c.startsWith('#') || HIGHLIGHT_COLORS[c]) continue
      const key = c.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(c)
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
      const [h, n, b] = await Promise.all([
        supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
        supabase.from('bible_notes').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
        supabase.from('bible_bookmarks').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
      ])
      if (!h.error) setHighlights(h.data || [])
      if (!n.error) setNotes(n.data || [])
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

  async function addHighlight({ verseStart, verseEnd, referenceLabel, color = 'yellow', bibleId = DEFAULT_BIBLE_ID }) {
    const { data, error } = await supabase.from('bible_highlights').insert({
      user_id: user.id, bible_id: bibleId, book, chapter,
      verse_start: verseStart, verse_end: verseEnd ?? null,
      reference_label: referenceLabel, color, source: 'oikos',
    }).select().single()
    if (!error) setHighlights(prev => [...prev, data])
    return { data, error }
  }

  async function removeHighlight(id) {
    await supabase.from('bible_highlights').delete().eq('id', id)
    setHighlights(prev => prev.filter(h => h.id !== id))
  }

  async function addNote({ verseStart, verseEnd, referenceLabel, note, bibleId = DEFAULT_BIBLE_ID }) {
    const { data, error } = await supabase.from('bible_notes').insert({
      user_id: user.id, bible_id: bibleId, book, chapter,
      verse_start: verseStart, verse_end: verseEnd ?? null,
      reference_label: referenceLabel, note, source: 'oikos',
    }).select().single()
    if (!error) setNotes(prev => [...prev, data])
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
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('bible_reading_progress').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProgress(data))
  }, [user?.id])

  return progress
}
