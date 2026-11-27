// Zentrale Form für eine Bibelvers-Verknüpfung (Feed-Post, Gebet, Teilen aus
// der Bibel selbst) - pure Funktionen, kein React, damit sie überall (Hooks,
// Komponenten, andere Libs) ohne Zyklen importierbar sind.
//
// VerseAttachment = { bibleId, book, chapter, verseStart, verseEnd, referenceLabel, verseText }

import { findBook, bookName } from './bibleBooks'
import { getLang } from '../i18n'
import { DEFAULT_BIBLE_ID } from '../hooks/useBible'

export function formatReferenceLabel({ book, chapter, verseStart, verseEnd }) {
  const name = bookName(book)
  const sep = getLang() === 'en' ? ':' : ','
  if (verseStart == null) return `${name} ${chapter}`
  if (verseEnd && verseEnd !== verseStart) return `${name} ${chapter}${sep}${verseStart}-${verseEnd}`
  return `${name} ${chapter}${sep}${verseStart}`
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

// ── Mehrere Stellen pro Beitrag (feed_posts.bible_verses) ───────────────────

// Alle Stellen eines Beitrags als VerseAttachment[] – neue Beiträge aus
// bible_verses, ältere aus den Einzel-Spalten (dann inkl. verseText = Zitat-Block).
export function versesFromRow(row) {
  if (Array.isArray(row?.bible_verses) && row.bible_verses.length) {
    return row.bible_verses.filter(v => v?.referenceLabel).map(v => ({
      bibleId: v.bibleId ?? null, book: v.book ?? null, chapter: v.chapter ?? null,
      verseStart: v.verseStart ?? null, verseEnd: v.verseEnd ?? null,
      referenceLabel: v.referenceLabel, verseText: null,
    }))
  }
  const single = verseAttachmentFromRow(row)
  return single ? [single] : []
}

// Insert-Felder für mehrere Stellen: bible_verses (ohne Zitat – das steht im Text)
// plus die alten Einzel-Spalten mit der ersten Stelle.
export function verseFieldsFromAttachments(atts) {
  if (!atts?.length) return {}
  return {
    bible_verses: atts.map(a => ({
      bibleId: a.bibleId != null ? String(a.bibleId) : null,
      book: a.book ?? null, chapter: a.chapter ?? null,
      verseStart: a.verseStart ?? null, verseEnd: a.verseEnd ?? null,
      referenceLabel: a.referenceLabel,
    })),
    ...verseFieldsFromAttachment({ ...atts[0], verseText: null }),
  }
}

// ── Stelle + Zitat im Beitragstext ───────────────────────────────────────────
// Zitat steht direkt hinter dem Stellennamen: „Johannes 3,16 „Denn also …““.
export function verseQuote(att) {
  const t = String(att?.verseText || '').replace(/[„“”"]/g, '').replace(/\s+/g, ' ').trim()
  return t ? `„${t}“` : ''
}

// Stelle (und optional Zitat) an Position pos in den Text einfügen. Ist die
// Stelle schon enthalten, wird nur das Zitat ergänzt/entfernt.
export function insertVerseIntoText(body, att, { quote = false, pos = null } = {}) {
  const label = att.referenceLabel
  if (!label) return body
  if (body.includes(label)) return setVerseQuoteInText(body, att, quote)
  const at = Math.min(pos ?? body.length, body.length)
  const before = body.slice(0, at)
  const after = body.slice(at)
  const q = quote ? verseQuote(att) : ''
  const lead = before && !/\s$/.test(before) ? ' ' : ''
  const trail = after && !/^\s/.test(after) ? ' ' : ''
  return before + lead + label + (q ? ` ${q}` : '') + trail + after
}

export function setVerseQuoteInText(body, att, on) {
  const label = att.referenceLabel
  const q = verseQuote(att)
  const i = body.indexOf(label)
  if (i === -1 || !q) return body
  const end = i + label.length
  const has = body.startsWith(` ${q}`, end)
  if (on && !has) return body.slice(0, end) + ` ${q}` + body.slice(end)
  if (!on && has) return body.slice(0, end) + body.slice(end + 1 + q.length)
  return body
}

export function removeVerseFromText(body, att) {
  const label = att.referenceLabel
  if (!label) return body
  let out = setVerseQuoteInText(body, att, false)
  out = out.split(label).join('')
  return out.replace(/[ \t]{2,}/g, ' ')
}
