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
