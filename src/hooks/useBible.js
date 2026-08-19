import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { fetchBiblePath } from '../lib/youversion'
import { wrapVersesInHtml } from '../lib/biblePassageHtml'

// Numerische YouVersion-Bibel-ID (per GET /v1/bibles?language_ranges[]=deu
// ermittelt). 73 = "Hoffnung für alle". Andere deutsche Übersetzungen (u.a.
// Luther 1912 = 51, Elberfelder 1871 = 58) liefert useGermanBibleVersions() –
// darüber lässt sich die Version wie in der YouVersion-App umschalten.
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

export function useGermanBibleVersions() {
  const [versions, setVersions] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchBiblePath('/v1/bibles?language_ranges[]=deu')
      .then(data => { if (!cancelled) setVersions(data.data ?? data.items ?? []) })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  return { versions, error }
}

// ─── Lokale Marker (eigene + aus YouVersion synchronisierte) ───

export function useBibleMarkers(book, chapter) {
  const { user } = useAuth()
  const [highlights, setHighlights] = useState([])
  const [notes, setNotes] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !book || !chapter) return
    setLoading(true)
    const [h, n, b] = await Promise.all([
      supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
      supabase.from('bible_notes').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
      supabase.from('bible_bookmarks').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter),
    ])
    setHighlights(h.data || [])
    setNotes(n.data || [])
    setBookmarks(b.data || [])
    setLoading(false)
  }, [user?.id, book, chapter])

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
