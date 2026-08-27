import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { fetchBiblePath } from '../lib/youversion'
import { wrapVersesInHtml } from '../lib/biblePassageHtml'
import { HIGHLIGHT_COLORS } from '../lib/bibleColors'

// Numerische YouVersion-Bibel-ID. 73 = "Hoffnung für alle" (Default). Alle
// ~1479 verfügbaren Übersetzungen liefert useBibleVersions() – darüber lässt
// sich die Version wie in der YouVersion-App umschalten.
export const DEFAULT_BIBLE_ID = '73'

// GET /v1/bibles/{id}/books/{book}/chapters/{chapter}/verses liefert nur eine
// Referenzliste (id/passage_id/title) OHNE Bibeltext. Der eigentliche Text
// kommt über GET /v1/bibles/{id}/passages/{referenz}?format=html (Feld
// `content`), mit <span class="yv-v" v="N"> als Versmarker – siehe
// wrapVersesInHtml für die Aufbereitung zu antippbaren Vers-Elementen.
export function useChapterText(bibleId, book, chapter) {
  const [html, setHtml] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!book || !chapter) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBiblePath(`/v1/bibles/${bibleId}/passages/${book}.${chapter}?format=html`)
      .then(data => {
        if (cancelled) return
        const content = data?.data?.content ?? data?.content ?? ''
        setHtml(wrapVersesInHtml(content))
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bibleId, book, chapter])

  return { html, loading, error }
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
export function useBibleVersions() {
  const [versions, setVersions] = useState(bibleVersionsCache?.versions ?? null)
  const [loading, setLoading] = useState(!bibleVersionsCache)
  const [error, setError] = useState(null)

  useEffect(() => {
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
  }, [])

  return { versions, loading, error }
}

// ─── Favoriten-Übersetzungen ───

export function useFavoriteBibleVersions() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('bible_favorite_versions').select('bible_id').eq('user_id', user.id)
    setFavorites(new Set((data || []).map(r => String(r.bible_id))))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  async function toggleFavorite(bibleId) {
    const id = String(bibleId)
    const wasFavorite = favorites.has(id)
    setFavorites(prev => {
      const next = new Set(prev)
      if (wasFavorite) next.delete(id)
      else next.add(id)
      return next
    })
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

export function useBibleMarkers(bibleId, book, chapter) {
  const { user } = useAuth()
  const [highlights, setHighlights] = useState([])
  const [notes, setNotes] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !book || !chapter) return
    setLoading(true)

    // Highlights aus der YouVersion-App für dieses Kapitel spiegeln. Die
    // YouVersion Platform API kennt keine "alle Highlights des Nutzers"-Liste,
    // nur GET /v1/highlights?bible_id=&passage_id=<BUCH>.<KAPITEL> - deshalb
    // bei jedem Kapitelaufruf synchronisieren statt über einen globalen
    // "Sync"-Button. Nicht verbunden/Fehler -> einfach überspringen, lokale
    // Highlights werden trotzdem geladen.
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
        await supabase.from('bible_highlights').upsert(rows, { onConflict: 'user_id,source,youversion_id' })
      }
    } catch {
      /* nicht verbunden oder YouVersion-API-Fehler - lokale Highlights reichen */
    }

    const [h, n, b] = await Promise.all([
      supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
      supabase.from('bible_notes').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
      supabase.from('bible_bookmarks').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
    ])
    setHighlights(h.data || [])
    setNotes(n.data || [])
    setBookmarks(b.data || [])
    setLoading(false)
  }, [user?.id, bibleId, book, chapter])

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

export async function saveReadingProgress(userId, { bibleId = DEFAULT_BIBLE_ID, book, chapter }) {
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
