import { getLang } from '../i18n'

// Statische Bücherliste (66 protestantische Bücher, USFM-3-Buchstaben-Codes).
// Unabhängig von der YouVersion-API nutzbar für Navigation/Auswahl – nur das
// Laden des eigentlichen Bibeltexts hängt am API-Proxy.
export const BIBLE_BOOKS = [
  { code: 'GEN', name: '1. Mose', chapters: 50 },
  { code: 'EXO', name: '2. Mose', chapters: 40 },
  { code: 'LEV', name: '3. Mose', chapters: 27 },
  { code: 'NUM', name: '4. Mose', chapters: 36 },
  { code: 'DEU', name: '5. Mose', chapters: 34 },
  { code: 'JOS', name: 'Josua', chapters: 24 },
  { code: 'JDG', name: 'Richter', chapters: 21 },
  { code: 'RUT', name: 'Ruth', chapters: 4 },
  { code: '1SA', name: '1. Samuel', chapters: 31 },
  { code: '2SA', name: '2. Samuel', chapters: 24 },
  { code: '1KI', name: '1. Könige', chapters: 22 },
  { code: '2KI', name: '2. Könige', chapters: 25 },
  { code: '1CH', name: '1. Chronik', chapters: 29 },
  { code: '2CH', name: '2. Chronik', chapters: 36 },
  { code: 'EZR', name: 'Esra', chapters: 10 },
  { code: 'NEH', name: 'Nehemia', chapters: 13 },
  { code: 'EST', name: 'Esther', chapters: 10 },
  { code: 'JOB', name: 'Hiob', chapters: 42 },
  { code: 'PSA', name: 'Psalm', chapters: 150 },
  { code: 'PRO', name: 'Sprüche', chapters: 31 },
  { code: 'ECC', name: 'Prediger', chapters: 12 },
  { code: 'SNG', name: 'Hoheslied', chapters: 8 },
  { code: 'ISA', name: 'Jesaja', chapters: 66 },
  { code: 'JER', name: 'Jeremia', chapters: 52 },
  { code: 'LAM', name: 'Klagelieder', chapters: 5 },
  { code: 'EZK', name: 'Hesekiel', chapters: 48 },
  { code: 'DAN', name: 'Daniel', chapters: 12 },
  { code: 'HOS', name: 'Hosea', chapters: 14 },
  { code: 'JOL', name: 'Joel', chapters: 3 },
  { code: 'AMO', name: 'Amos', chapters: 9 },
  { code: 'OBA', name: 'Obadja', chapters: 1 },
  { code: 'JON', name: 'Jona', chapters: 4 },
  { code: 'MIC', name: 'Micha', chapters: 7 },
  { code: 'NAM', name: 'Nahum', chapters: 3 },
  { code: 'HAB', name: 'Habakuk', chapters: 3 },
  { code: 'ZEP', name: 'Zefanja', chapters: 3 },
  { code: 'HAG', name: 'Haggai', chapters: 2 },
  { code: 'ZEC', name: 'Sacharja', chapters: 14 },
  { code: 'MAL', name: 'Maleachi', chapters: 4 },
  { code: 'MAT', name: 'Matthäus', chapters: 28 },
  { code: 'MRK', name: 'Markus', chapters: 16 },
  { code: 'LUK', name: 'Lukas', chapters: 24 },
  { code: 'JHN', name: 'Johannes', chapters: 21 },
  { code: 'ACT', name: 'Apostelgeschichte', chapters: 28 },
  { code: 'ROM', name: 'Römer', chapters: 16 },
  { code: '1CO', name: '1. Korinther', chapters: 16 },
  { code: '2CO', name: '2. Korinther', chapters: 13 },
  { code: 'GAL', name: 'Galater', chapters: 6 },
  { code: 'EPH', name: 'Epheser', chapters: 6 },
  { code: 'PHP', name: 'Philipper', chapters: 4 },
  { code: 'COL', name: 'Kolosser', chapters: 4 },
  { code: '1TH', name: '1. Thessalonicher', chapters: 5 },
  { code: '2TH', name: '2. Thessalonicher', chapters: 3 },
  { code: '1TI', name: '1. Timotheus', chapters: 6 },
  { code: '2TI', name: '2. Timotheus', chapters: 4 },
  { code: 'TIT', name: 'Titus', chapters: 3 },
  { code: 'PHM', name: 'Philemon', chapters: 1 },
  { code: 'HEB', name: 'Hebräer', chapters: 13 },
  { code: 'JAS', name: 'Jakobus', chapters: 5 },
  { code: '1PE', name: '1. Petrus', chapters: 5 },
  { code: '2PE', name: '2. Petrus', chapters: 3 },
  { code: '1JN', name: '1. Johannes', chapters: 5 },
  { code: '2JN', name: '2. Johannes', chapters: 1 },
  { code: '3JN', name: '3. Johannes', chapters: 1 },
  { code: 'JUD', name: 'Judas', chapters: 1 },
  { code: 'REV', name: 'Offenbarung', chapters: 22 },
]

export function findBook(code) {
  return BIBLE_BOOKS.find(b => b.code === code) || null
}

// Englische Buchnamen (gleiche Reihenfolge wie BIBLE_BOOKS)
const EN_NAMES = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy',
  JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalms', PRO: 'Proverbs',
  ECC: 'Ecclesiastes', SNG: 'Song of Solomon', ISA: 'Isaiah', JER: 'Jeremiah', LAM: 'Lamentations',
  EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel', AMO: 'Amos', OBA: 'Obadiah',
  JON: 'Jonah', MIC: 'Micah', NAM: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai',
  ZEC: 'Zechariah', MAL: 'Malachi', MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John',
  ACT: 'Acts', ROM: 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians', GAL: 'Galatians',
  EPH: 'Ephesians', PHP: 'Philippians', COL: 'Colossians', '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy', TIT: 'Titus', PHM: 'Philemon',
  HEB: 'Hebrews', JAS: 'James', '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John',
  '2JN': '2 John', '3JN': '3 John', JUD: 'Jude', REV: 'Revelation',
}

// Gängige Kürzel (zusätzlich zu Namen und USFM-Code) für die Suche
const EXTRA_ALIASES = {
  GEN: ['1mo', '1mos'], EXO: ['2mo', '2mos', 'ex'], LEV: ['3mo', '3mos', 'lv'], NUM: ['4mo', '4mos', 'nm'],
  DEU: ['5mo', '5mos', 'dt', 'deut'], JOS: ['jos', 'josh'], JDG: ['ri', 'judg'], '1SA': ['1sam'], '2SA': ['2sam'],
  '1KI': ['1kön', '1koen', '1kg'], '2KI': ['2kön', '2koen', '2kg'], '1CH': ['1chr'], '2CH': ['2chr'],
  PSA: ['ps', 'psalm', 'psalmen', 'psa'], PRO: ['spr', 'prov'], ECC: ['pred', 'eccl'], SNG: ['hld', 'hl', 'song'],
  ISA: ['jes'], JER: ['jer'], LAM: ['klgl', 'kla'], EZK: ['hes', 'hez', 'ezek'], DAN: ['dan'], JOL: ['joel'],
  OBA: ['obd', 'obad'], MIC: ['mi'], HAB: ['hab'], ZEP: ['zef', 'zeph'], ZEC: ['sach', 'zech'],
  MAT: ['mt', 'matt', 'matth'], MRK: ['mk', 'mar'], LUK: ['lk', 'luk'], JHN: ['joh', 'jn'], ACT: ['apg', 'apostelgeschichte'],
  ROM: ['röm', 'roem', 'rm'], '1CO': ['1kor', '1cor'], '2CO': ['2kor', '2cor'], GAL: ['gal'], EPH: ['eph'],
  PHP: ['phil', 'phlp'], COL: ['kol'], '1TH': ['1thes', '1thess'], '2TH': ['2thes', '2thess'],
  '1TI': ['1tim'], '2TI': ['2tim'], HEB: ['hebr', 'hebräer', 'heb'], JAS: ['jak', 'jam'], '1PE': ['1petr', '1pet'],
  '2PE': ['2petr', '2pet'], '1JN': ['1joh', '1john'], '2JN': ['2joh', '2john'], '3JN': ['3joh', '3john'],
  JUD: ['jud', 'judas'], REV: ['offb', 'offenb', 'rev', 'apk'],
}

// Buchname in der gewählten App-Sprache
export function bookName(code, lang = getLang()) {
  if (lang === 'en') return EN_NAMES[code] || findBook(code)?.name || code
  return findBook(code)?.name || code
}

const norm = (str) => str.toLowerCase().replace(/[.\s]+/g, '')

// Suchschlüssel pro Buch: DE-/EN-Name, USFM-Code, Kürzel (alle ohne Punkte/Leerzeichen)
const SEARCH_KEYS = BIBLE_BOOKS.map(b => ({
  code: b.code,
  keys: [...new Set([b.name, EN_NAMES[b.code], b.code, ...(EXTRA_ALIASES[b.code] || [])].filter(Boolean).map(norm))],
}))

// Bücher, die zu einer Eingabe passen („joh“, „1 kor“, „psalm“, „matthew“, „korinther“).
// Genau-Treffer zuerst, dann Präfix, dann Teilstring (ab 3 Zeichen).
export function searchBooks(query) {
  const k = norm(query || '')
  if (!k) return BIBLE_BOOKS
  const scored = []
  for (const { code, keys } of SEARCH_KEYS) {
    let best = 0
    for (const key of keys) {
      if (key === k) best = Math.max(best, 3)
      else if (key.startsWith(k)) best = Math.max(best, 2)
      else if (k.length >= 3 && key.includes(k)) best = Math.max(best, 1)
    }
    if (best) scored.push({ code, best })
  }
  // stabil: bei gleichem Score Bibelreihenfolge
  const order = new Map(BIBLE_BOOKS.map((b, i) => [b.code, i]))
  scored.sort((a, b) => b.best - a.best || order.get(a.code) - order.get(b.code))
  return scored.map(s => findBook(s.code))
}

// Erkennt Stellenangaben: „Joh 3“, „Johannes 3,16“, „John 3:16-18“, „1 Kor 13“.
// Liefert { book, chapter, verseStart, verseEnd } oder null. Das Buch ist der
// beste Treffer; Kapitel/Verse werden gegen die Kapitelzahl geprüft.
export function parseReferenceQuery(query) {
  const m = (query || '').trim().match(/^(\d?\s?\.?\s?[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.]*(?:\s+[A-Za-zÄÖÜäöüß]+)?)\s*(\d{1,3})(?:\s*[:,.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/)
  if (!m) return null
  const [, rawBook, ch, vs, ve] = m
  const book = searchBooks(rawBook)[0]
  if (!book) return null
  const chapter = parseInt(ch, 10)
  if (chapter < 1 || chapter > book.chapters) return null
  return {
    book: book.code,
    chapter,
    verseStart: vs ? parseInt(vs, 10) : null,
    verseEnd: ve ? parseInt(ve, 10) : null,
  }
}

// Sehr einfacher Parser für Referenzen wie "Joh 3,16" oder "Joh 3,16-18" –
// reicht für die Freitext-Felder, die im Jüngerschaftsbereich schon existieren
// (course_lessons.bible_reference / weekly_impulses.bible_reference).
const NAME_TO_CODE = Object.fromEntries(
  BIBLE_BOOKS.map(b => [b.name.toLowerCase(), b.code])
)

export function parseGermanReference(ref) {
  if (!ref) return null
  const match = ref.trim().match(/^([1-3]?\.?\s?[A-Za-zÄÖÜäöüß]+)\.?\s+(\d+)(?:,(\d+)(?:-(\d+))?)?$/)
  if (!match) return null
  const [, rawName, chapter, verseStart, verseEnd] = match
  const normalized = rawName.replace(/\s+/g, ' ').trim().toLowerCase()
  const code = NAME_TO_CODE[normalized]
  if (!code) return null
  return {
    book: code,
    chapter: parseInt(chapter, 10),
    verseStart: verseStart ? parseInt(verseStart, 10) : null,
    verseEnd: verseEnd ? parseInt(verseEnd, 10) : null,
  }
}
