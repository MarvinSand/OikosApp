import { useChapterText, DEFAULT_BIBLE_ID } from '../../hooks/useBible'

// Eingebettete Bibelstelle für Bible Studies im Jüngerschaftsbereich, z. B.:
//   <BiblePassage book="JHN" chapter={3} verseStart={16} verseEnd={16} referenceLabel="Joh 3,16" />
// Zeigt bei API-Fehlern die referenceLabel + einen Hinweis statt kaputt zu wirken.
export default function BiblePassage({ book, chapter, verseStart, verseEnd, referenceLabel, bibleId = DEFAULT_BIBLE_ID }) {
  const { verses, loading, error } = useChapterText(bibleId, book, chapter)

  const filtered = verses?.filter(v => {
    const num = v.verse ?? v.number
    if (verseStart == null) return true
    if (verseEnd) return num >= verseStart && num <= verseEnd
    return num === verseStart
  })

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-accent)' }}>
        📖 {referenceLabel}
      </p>

      {loading && (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Lädt Bibeltext…</p>
      )}

      {error && (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, fontStyle: 'italic' }}>
          Bibeltext gerade nicht verfügbar – {referenceLabel} kann in der YouVersion-App nachgeschlagen werden.
        </p>
      )}

      {!loading && !error && filtered?.length > 0 && (
        <p style={{ fontFamily: 'Lora, serif', fontSize: 15, lineHeight: 1.7, color: 'var(--color-text)' }}>
          {filtered.map(v => (v.text ?? v.content ?? '')).join(' ')}
        </p>
      )}

      {!loading && !error && filtered?.length === 0 && (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Kein Text gefunden.</p>
      )}
    </div>
  )
}
