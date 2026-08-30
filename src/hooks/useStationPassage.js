import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchBiblePath } from '../lib/youversion'
import { wrapVersesInHtml, extractVerseRange } from '../lib/biblePassageHtml'
import { DEFAULT_BIBLE_ID } from './useBible'

// Wie usePassageText (src/hooks/useBible.js), aber mit serverseitigem
// Cache in bible_verses_cache davor: die 14+1 Stationen fragen immer
// dieselben festen Stellen ab, ein Cache-Treffer spart den kompletten
// Edge-Function-Roundtrip. Fehlerfall: Stelle bleibt anzeigbar, Retry statt
// Blocker (siehe StationDetailView).
//
// Die YouVersion-API liefert für Vers-Bereiche als Passage-ID (z.B.
// "LUK.15.11-LUK.15.32") einen 404 - nur Einzelverse und ganze Kapitel
// funktionieren als Passage-ID. Deshalb wird immer das ganze Kapitel
// geladen und per extractVerseRange auf verseStart..verseEnd zugeschnitten.
export function useStationPassage(book, chapter, verseStart, verseEnd, bibleId = DEFAULT_BIBLE_ID) {
  const [html, setHtml] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => setAttempt(a => a + 1), [])

  useEffect(() => {
    if (!book || !chapter || !verseStart) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: cached } = await supabase
          .from('bible_verses_cache')
          .select('html')
          .eq('bible_id', bibleId)
          .eq('book', book)
          .eq('chapter', chapter)
          .eq('verse_start', verseStart)
          .eq('verse_end', verseEnd ?? verseStart)
          .maybeSingle()

        if (cancelled) return
        if (cached?.html) {
          setHtml(cached.html)
          setLoading(false)
          return
        }

        const data = await fetchBiblePath(`/v1/bibles/${bibleId}/passages/${book}.${chapter}?format=html`)
        if (cancelled) return
        const wrapped = wrapVersesInHtml(data?.data?.content ?? data?.content ?? '')
        const trimmed = extractVerseRange(wrapped, verseStart, verseEnd)
        setHtml(trimmed)

        supabase.from('bible_verses_cache').upsert({
          bible_id: bibleId, book, chapter,
          verse_start: verseStart, verse_end: verseEnd ?? verseStart,
          html: trimmed,
        }, { onConflict: 'bible_id,book,chapter,verse_start,verse_end' }).then(() => {})
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [book, chapter, verseStart, verseEnd, bibleId, attempt])

  return { html, loading, error, retry }
}
