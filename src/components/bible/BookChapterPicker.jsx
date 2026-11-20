import { useMemo, useState } from 'react'
import { ChevronLeft, X, Search, ChevronRight } from 'lucide-react'
import { BIBLE_BOOKS, findBook, bookName, searchBooks, parseReferenceQuery } from '../../lib/bibleBooks'
import { useVerseSearch } from '../../hooks/useBible'
import { useT } from '../../i18n'

// Zweistufiger Picker (Buch -> Kapitel-Raster), aus BibleView.jsx extrahiert,
// damit auch der Verspicker (VersePickerSheet) ihn nutzen kann.
//
// Suchfeld wie in der YouVersion-App:
//  · Buchname/Kürzel ("Joh", "1 Kor", "Psalm") filtert die Bücherliste
//  · Stellenangabe ("Joh 3,16", "John 3:16-18") bietet einen Direktsprung an
//  · Freitext ("Liebe", "fürchte dich nicht") durchsucht den Bibeltext der
//    aktuellen Übersetzung (YouVersion /v1/search-verses)
//
// onSelect(bookCode, chapter, verse?) – `verse` nur bei Verstreffern.
const tertiary = { color: 'var(--color-text-tertiary)' }
const rowBorder = { borderBottom: '1px solid var(--color-border)' }
const overlayStyle = { backgroundColor: 'var(--color-bg)', paddingTop: 'env(safe-area-inset-top, 0px)' }
const listPad = { paddingBottom: 'calc(var(--bottom-nav-h, 64px) + 16px)' }

export default function BookChapterPicker({ currentBook, currentChapter, bibleId, onSelect, onClose }) {
  const { t, lang } = useT()
  const [pendingBook, setPendingBook] = useState(null)
  const [search, setSearch] = useState('')
  const [forcedFor, setForcedFor] = useState('') // Eingabe, für die der Nutzer die Textsuche ausdrücklich gewählt hat
  const q = search.trim()

  const ref = useMemo(() => parseReferenceQuery(q), [q])
  const books = useMemo(() => (q ? searchBooks(q) : BIBLE_BOOKS), [q])
  // Bibeltext nur durchsuchen, wenn die Eingabe nicht schon ein Buch/eine Stelle ist
  const looksLikeBookOrRef = !!ref || (books.length > 0 && q.length <= 12 && !/\s.*\s/.test(q))
  const textSearchWanted = !looksLikeBookOrRef || forcedFor === q
  const textSearch = useVerseSearch(bibleId, q, { enabled: textSearchWanted && !!bibleId })

  if (pendingBook) {
    const info = findBook(pendingBook)
    const chapters = Array.from({ length: info?.chapters || 0 }, (_, i) => i + 1)
    return (
      <div className="fixed inset-0 z-40 flex flex-col" style={overlayStyle}>
        <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setPendingBook(null)} className="p-1 -ml-1" aria-label={t('Zurück')}>
            <ChevronLeft size={20} style={tertiary} />
          </button>
          <h2 className="font-bold flex-1" style={{ color: 'var(--color-text)' }}>
            {t('{book} – Kapitel wählen', { book: bookName(pendingBook, lang) })}
          </h2>
          <button onClick={onClose} aria-label={t('Schließen')}><X size={20} style={tertiary} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4" style={listPad}>
          <div className="grid grid-cols-6 gap-2">
            {chapters.map(ch => {
              const isCurrent = pendingBook === currentBook && ch === currentChapter
              return (
                <button
                  key={ch}
                  onClick={() => onSelect(pendingBook, ch)}
                  className="aspect-square rounded-lg flex items-center justify-center font-medium"
                  style={{
                    backgroundColor: isCurrent ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    color: isCurrent ? 'white' : 'var(--color-text)',
                  }}
                >
                  {ch}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const refLabel = ref
    ? `${bookName(ref.book, lang)} ${ref.chapter}${ref.verseStart != null
      ? `${lang === 'en' ? ':' : ','}${ref.verseStart}${ref.verseEnd && ref.verseEnd !== ref.verseStart ? `-${ref.verseEnd}` : ''}`
      : ''}`
    : null

  const sectionTitle = (text) => (
    <p className="text-xs font-semibold uppercase tracking-wide pt-3 pb-1" style={tertiary}>{text}</p>
  )

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={overlayStyle}>
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>{t('Buch wählen')}</h2>
        <button onClick={onClose} aria-label={t('Schließen')}><X size={20} style={tertiary} /></button>
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <Search size={16} style={tertiary} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Buch, Stelle oder Stichwort suchen…')}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text)' }}
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="search"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label={t('Eingabe löschen')}><X size={16} style={tertiary} /></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2" style={listPad}>
        {/* Direktsprung zu einer Stelle */}
        {ref && (
          <>
            {sectionTitle(t('Gehe zu'))}
            <button
              onClick={() => (ref.verseStart != null ? onSelect(ref.book, ref.chapter, ref.verseStart) : onSelect(ref.book, ref.chapter))}
              className="w-full text-left py-3 flex items-center justify-between font-semibold"
              style={{ ...rowBorder, color: 'var(--color-accent)' }}
            >
              {refLabel}
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Bücher (gefiltert) */}
        {books.length > 0 && (
          <>
            {q && sectionTitle(t('Bücher'))}
            {books.map(b => (
              <button
                key={b.code}
                onClick={() => setPendingBook(b.code)}
                className="w-full text-left py-3 flex items-center justify-between"
                style={{ ...rowBorder, color: b.code === currentBook ? 'var(--color-accent)' : 'var(--color-text)' }}
              >
                {bookName(b.code, lang)}
                {b.code === currentBook && <span style={{ fontSize: 12 }}>{t('aktuell')}</span>}
              </button>
            ))}
          </>
        )}

        {/* Eingabe sieht nach Buch aus, soll aber im Text gesucht werden */}
        {!textSearchWanted && q.length >= 3 && !ref && !!bibleId && (
          <button
            onClick={() => setForcedFor(q)}
            className="w-full text-left py-3 flex items-center gap-2 font-semibold text-sm"
            style={{ color: 'var(--color-accent)' }}
          >
            <Search size={16} /> {t('Im Bibeltext nach „{q}“ suchen', { q })}
          </button>
        )}

        {/* Volltextsuche im Bibeltext */}
        {textSearch.active && (
          <>
            {sectionTitle(t('Im Bibeltext'))}
            {textSearch.loading && <p style={{ ...tertiary, padding: '12px 0' }}>{t('Suche läuft…')}</p>}
            {textSearch.error && !textSearch.loading && (
              <p style={{ ...tertiary, padding: '12px 0' }}>{t('Die Suche ist für diese Übersetzung gerade nicht verfügbar.')}</p>
            )}
            {!textSearch.loading && !textSearch.error && textSearch.results.length === 0 && (
              <p style={{ ...tertiary, padding: '12px 0' }}>{t('Keine Treffer.')}</p>
            )}
            {!textSearch.loading && textSearch.results.map(r => (
              <button
                key={r.ref}
                onClick={() => onSelect(r.book, r.chapter, r.verse)}
                className="w-full text-left py-3"
                style={rowBorder}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-accent)' }}>
                  {r.reference || `${bookName(r.book, lang)} ${r.chapter}${lang === 'en' ? ':' : ','}${r.verse}`}
                </div>
                {r.text && (
                  <div style={{ fontSize: 13, color: 'var(--color-text)', marginTop: 2, lineHeight: 1.4 }}>
                    {r.text.length > 220 ? `${r.text.slice(0, 220)}…` : r.text}
                  </div>
                )}
              </button>
            ))}
            {!textSearch.loading && textSearch.hasMore && (
              <button
                onClick={textSearch.loadMore}
                disabled={textSearch.loadingMore}
                className="w-full py-3 font-semibold text-sm"
                style={{ color: 'var(--color-accent)' }}
              >
                {textSearch.loadingMore ? t('Lädt…') : t('Mehr laden')}
              </button>
            )}
          </>
        )}

        {q && books.length === 0 && !ref && !textSearch.active && (
          <p style={{ ...tertiary, padding: '16px 0' }}>{t('Keine Treffer.')}</p>
        )}
      </div>
    </div>
  )
}
