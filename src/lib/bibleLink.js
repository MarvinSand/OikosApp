// Zentrale Form für eine Bibelvers-Verknüpfung (Feed-Post, Gebet, Teilen aus
// der Bibel selbst) - pure Funktionen, kein React, damit sie überall (Hooks,
// Komponenten, andere Libs) ohne Zyklen importierbar sind.
//
// VerseAttachment = { bibleId, book, chapter, verseStart, verseEnd, referenceLabel, verseText }

import { findBook } from './bibleBooks'
import { DEFAULT_BIBLE_ID } from '../hooks/useBible'

export function formatReferenceLabel({ book, chapter, verseStart, verseEnd }) {
  const name = findBook(book)?.name || book
  if (verseStart == null) return `${name} ${chapter}`
  if (verseEnd && verseEnd !== verseStart) return `${name} ${chapter},${verseStart}-${verseEnd}`
  return `${name} ${chapter},${verseStart}`
}

export function buildBibleLink({ bibleId, book, chapter, verseStart, verseEnd }) {
  const params = new URLSearchParams()
  if (book) params.set('book', book)
  if (chapter != null) params.set('chapter', String(chapter))
  if (verseStart != null) params.set('verse', String(verseStart))
  if (verseEnd != null && verseEnd !== verseStart) params.set('verseEnd', String(verseEnd))
  if (bibleId != null && String(bibleId) !== String(DEFAULT_BIBLE_ID)) params.set('bibleId', String(bibleId))
  return `/bible?${params.toString()}`
}

// Validiert URL-Parameter statt sie blind zu übernehmen - eine manipulierte
// oder alte URL soll nie einen kaputten Zustand im Reader erzeugen.
export function parseBibleLinkParams(searchParams) {
  const book = searchParams.get('book')
  const bookInfo = book ? findBook(book) : null
  if (!bookInfo) return null

  const chapterRaw = parseInt(searchParams.get('chapter'), 10)
  const chapter = Number.isFinite(chapterRaw) ? Math.min(Math.max(chapterRaw, 1), bookInfo.chapters) : 1

  const verseRaw = parseInt(searchParams.get('verse'), 10)
  const verseStart = Number.isFinite(verseRaw) ? verseRaw : null

  const verseEndRaw = parseInt(searchParams.get('verseEnd'), 10)
  const verseEnd = Number.isFinite(verseEndRaw) ? verseEndRaw : null

  const bibleId = searchParams.get('bibleId') || null

  return { book: bookInfo.code, chapter, verseStart, verseEnd, bibleId }
}

// {} bei null ist bewusst so gewählt: gespreadet in ein Insert-Payload fügt
// es dann schlicht nichts hinzu - ein Post/Gebet ohne Vers bekommt keine
// dieser Spalten übergeben (siehe CLAUDE.md: eine im Payload enthaltene, in
// der DB fehlende Spalte lässt das GESAMTE Insert/Update scheitern).
export function verseFieldsFromAttachment(att) {
  if (!att) return {}
  return {
    bible_reference: att.referenceLabel ?? null,
    bible_verse: att.verseText ?? null,
    bible_id: att.bibleId != null ? String(att.bibleId) : null,
    bible_book: att.book ?? null,
    bible_chapter: att.chapter ?? null,
    bible_verse_start: att.verseStart ?? null,
    bible_verse_end: att.verseEnd ?? null,
  }
}

// Toleriert alte Zeilen, die nur die Freitext-Spalten bible_reference/
// bible_verse gesetzt haben (kein book/chapter) - liefert dann book: null,
// wodurch der Chip als nicht-klickbar gerendert wird (siehe BibleReferenceChip).
export function verseAttachmentFromRow(row) {
  if (!row?.bible_book && !row?.bible_reference) return null
  return {
    bibleId: row.bible_id ?? null,
    book: row.bible_book ?? null,
    chapter: row.bible_chapter ?? null,
    verseStart: row.bible_verse_start ?? null,
    verseEnd: row.bible_verse_end ?? null,
    referenceLabel: row.bible_reference ?? null,
    verseText: row.bible_verse ?? null,
  }
}
