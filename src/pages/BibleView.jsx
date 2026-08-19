import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, BookMarked, Bookmark, StickyNote, X, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useChapterText, useBibleMarkers, useGermanBibleVersions, saveReadingProgress, DEFAULT_BIBLE_ID } from '../hooks/useBible'
import { useYouVersionAccount } from '../hooks/useYouVersionAccount'
import { BIBLE_BOOKS, findBook } from '../lib/bibleBooks'

const BIBLE_ID_STORAGE_KEY = 'oikos_bible_version_id'

const HIGHLIGHT_COLORS = {
  yellow: '#fde68a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  pink: '#fbcfe8',
}

export default function BibleView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const contentRef = useRef(null)
  const [book, setBook] = useState('JHN')
  const [chapter, setChapter] = useState(3)
  const [bibleId, setBibleId] = useState(() => {
    try { return localStorage.getItem(BIBLE_ID_STORAGE_KEY) || DEFAULT_BIBLE_ID } catch { return DEFAULT_BIBLE_ID }
  })
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [showVersionPicker, setShowVersionPicker] = useState(false)
  // "Marker-Modus" wie in der YouVersion-App: erster Tap auf einen Vers
  // öffnet den Modus und wählt ihn aus, weitere Taps erweitern/verkleinern
  // die Auswahl. Die Aktionsleiste wirkt dann auf den gesamten (zusammen-
  // hängenden) Bereich min…max der ausgewählten Versnummern.
  const [selectedVerses, setSelectedVerses] = useState(new Set())
  const [noteDraft, setNoteDraft] = useState('')

  const bookInfo = findBook(book)
  const { html, loading, error } = useChapterText(bibleId, book, chapter)
  const { versions: bibleVersions } = useGermanBibleVersions()
  const { highlights, notes, bookmarks, addHighlight, removeHighlight, addNote, removeNote, toggleBookmark } = useBibleMarkers(book, chapter)
  const yv = useYouVersionAccount()
  const currentVersion = bibleVersions?.find(v => String(v.id) === String(bibleId))

  function selectVersion(id) {
    setBibleId(String(id))
    try { localStorage.setItem(BIBLE_ID_STORAGE_KEY, String(id)) } catch { /* ignore */ }
    setShowVersionPicker(false)
  }

  function handleContentClick(e) {
    const el = e.target.closest('[data-verse]')
    if (!el) return
    const num = parseInt(el.getAttribute('data-verse'), 10)
    if (isNaN(num)) return
    setSelectedVerses(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const highlightFor = (verseNum) => highlights.find(h => verseNum >= h.verse_start && verseNum <= (h.verse_end ?? h.verse_start))
  const notesFor = (verseNum) => notes.filter(n => verseNum >= n.verse_start && verseNum <= (n.verse_end ?? n.verse_start))
  const isBookmarked = (verseNum) => bookmarks.some(b => b.verse === verseNum)

  // DOM-Overlay für Auswahl + bestehende Markierungen direkt auf die
  // gewrappten [data-verse]-Spans anwenden (dangerouslySetInnerHTML wird
  // von React nicht re-diffed, deshalb hier imperativ).
  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    container.querySelectorAll('[data-verse]').forEach(el => {
      const num = parseInt(el.getAttribute('data-verse'), 10)
      const hl = highlightFor(num)
      if (selectedVerses.has(num)) {
        el.style.backgroundColor = hl ? HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow : 'var(--color-bg-secondary)'
        el.style.boxShadow = '0 0 0 2px var(--color-accent)'
      } else if (hl) {
        el.style.backgroundColor = HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow
        el.style.boxShadow = 'none'
      } else {
        el.style.backgroundColor = 'transparent'
        el.style.boxShadow = 'none'
      }
    })
  }, [html, selectedVerses, highlights])

  function referenceLabel() {
    const nums = Array.from(selectedVerses).sort((a, b) => a - b)
    if (nums.length === 0) return ''
    if (nums.length === 1) return `${bookInfo?.name || book} ${chapter},${nums[0]}`
    return `${bookInfo?.name || book} ${chapter},${nums[0]}-${nums[nums.length - 1]}`
  }

  function goToChapter(nextBook, nextChapter) {
    setBook(nextBook)
    setChapter(nextChapter)
    setSelectedVerses(new Set())
    setShowBookPicker(false)
    if (user) saveReadingProgress(user.id, { bibleId, book: nextBook, chapter: nextChapter })
  }

  function goPrevChapter() {
    if (chapter > 1) return goToChapter(book, chapter - 1)
    const idx = BIBLE_BOOKS.findIndex(b => b.code === book)
    if (idx > 0) goToChapter(BIBLE_BOOKS[idx - 1].code, BIBLE_BOOKS[idx - 1].chapters)
  }

  function goNextChapter() {
    if (bookInfo && chapter < bookInfo.chapters) return goToChapter(book, chapter + 1)
    const idx = BIBLE_BOOKS.findIndex(b => b.code === book)
    if (idx < BIBLE_BOOKS.length - 1) goToChapter(BIBLE_BOOKS[idx + 1].code, 1)
  }

  const selectedNums = Array.from(selectedVerses).sort((a, b) => a - b)
  const verseStart = selectedNums[0]
  const verseEnd = selectedNums[selectedNums.length - 1]
  const activeNotes = selectedNums.length ? notesFor(verseStart).concat(verseEnd !== verseStart ? notesFor(verseEnd) : []) : []
  const uniqueActiveNotes = [...new Map(activeNotes.map(n => [n.id, n])).values()]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <BookMarked size={20} style={{ color: 'var(--color-accent)' }} /> Bibel
          </h1>
          <YouVersionBadge yv={yv} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button onClick={goPrevChapter} className="p-2 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setShowBookPicker(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-semibold"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
          >
            {bookInfo?.name || book} {chapter} <ChevronDown size={16} />
          </button>

          <button onClick={goNextChapter} className="p-2 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={() => setShowVersionPicker(true)}
          className="mt-2 flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          {currentVersion?.localized_abbreviation || currentVersion?.abbreviation || '…'} <ChevronDown size={12} />
        </button>
      </div>

      {/* Content */}
      <div
        className="px-5 py-5"
        style={{ paddingBottom: selectedVerses.size > 0 ? 220 : 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
      >
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
            Bibeltext konnte nicht geladen werden. Falls das dauerhaft passiert: der YouVersion-API-Pfad für
            Bibeltext muss ggf. noch gegen die echte Doku (developers.youversion.com) angepasst werden.
          </div>
        )}

        {!loading && !error && html && (
          // Text stammt aus der eigenen Edge Function (Proxy zu api.youversion.com),
          // nicht aus Nutzereingaben - dangerouslySetInnerHTML ist hier unbedenklich.
          <div
            ref={contentRef}
            className="bible-passage-content"
            onClick={handleContentClick}
            style={{ fontFamily: 'Lora, serif', fontSize: 17, lineHeight: 1.9, color: 'var(--color-text)' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {!loading && !error && !html && (
          <p style={{ color: 'var(--color-text-tertiary)' }}>Kein Text gefunden.</p>
        )}
      </div>

      {/* Marker-Aktionsleiste */}
      {selectedVerses.size > 0 && (
        <VerseActionBar
          referenceLabel={referenceLabel()}
          existingHighlight={verseStart != null ? highlightFor(verseStart) : null}
          bookmarked={verseStart != null && verseEnd === verseStart && isBookmarked(verseStart)}
          showBookmark={verseStart != null && verseEnd === verseStart}
          notes={uniqueActiveNotes}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          onClose={() => { setSelectedVerses(new Set()); setNoteDraft('') }}
          onHighlight={(color) => addHighlight({ verseStart, verseEnd, referenceLabel: referenceLabel(), color, bibleId })}
          onRemoveHighlight={(id) => removeHighlight(id)}
          onBookmark={() => toggleBookmark({ verse: verseStart, referenceLabel: referenceLabel(), bibleId })}
          onSaveNote={async () => {
            if (!noteDraft.trim()) return
            await addNote({ verseStart, verseEnd, referenceLabel: referenceLabel(), note: noteDraft.trim(), bibleId })
            setNoteDraft('')
          }}
          onRemoveNote={(id) => removeNote(id)}
        />
      )}

      {showBookPicker && (
        <BookPicker
          currentBook={book}
          onSelect={(code) => goToChapter(code, 1)}
          onClose={() => setShowBookPicker(false)}
        />
      )}

      {showVersionPicker && (
        <VersionPicker
          versions={bibleVersions}
          currentId={bibleId}
          onSelect={selectVersion}
          onClose={() => setShowVersionPicker(false)}
        />
      )}
    </div>
  )
}

function YouVersionBadge({ yv }) {
  if (yv.connected === null) return null
  if (yv.connected) {
    return (
      <button
        onClick={yv.sync}
        disabled={yv.syncing}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-accent)' }}
        title="Highlights/Notizen aus YouVersion synchronisieren"
      >
        <BookMarked size={12} /> {yv.syncing ? 'Sync…' : 'YouVersion ✓'}
      </button>
    )
  }
  return (
    <button
      onClick={yv.connect}
      disabled={yv.connecting}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
    >
      <BookMarked size={12} /> {yv.connecting ? '…' : 'Mit YouVersion verbinden'}
    </button>
  )
}

function VerseActionBar({
  referenceLabel, existingHighlight, bookmarked, showBookmark, notes, noteDraft, setNoteDraft,
  onClose, onHighlight, onRemoveHighlight, onBookmark, onSaveNote, onRemoveNote,
}) {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-2xl p-4 z-30"
      style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{referenceLabel}</p>
        <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-tertiary)' }} /></button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {Object.entries(HIGHLIGHT_COLORS).map(([name, hex]) => (
          <button
            key={name}
            onClick={() => existingHighlight?.color === name ? onRemoveHighlight(existingHighlight.id) : onHighlight(name)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: hex, boxShadow: existingHighlight?.color === name ? '0 0 0 2px var(--color-accent)' : 'none' }}
          >
            {existingHighlight?.color === name && <span style={{ fontSize: 12 }}>✓</span>}
          </button>
        ))}
        {showBookmark && (
          <button
            onClick={onBookmark}
            className="w-8 h-8 rounded-full flex items-center justify-center ml-auto"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <Bookmark size={16} style={{ color: bookmarked ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }} fill={bookmarked ? 'var(--color-accent)' : 'none'} />
          </button>
        )}
      </div>

      {notes.map(n => (
        <div key={n.id} className="flex items-start justify-between gap-2 mb-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text)' }}>{n.note}</p>
          <button onClick={() => onRemoveNote(n.id)}><X size={14} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <StickyNote size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        <input
          value={noteDraft}
          onChange={e => setNoteDraft(e.target.value)}
          placeholder="Notiz hinzufügen…"
          className="flex-1 px-3 py-2 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        />
        <button
          onClick={onSaveNote}
          className="px-3 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          Sichern
        </button>
      </div>
    </div>
  )
}

function VersionPicker({ versions, currentId, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = versions?.filter(v => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (v.localized_title || v.title || '').toLowerCase().includes(q)
      || (v.localized_abbreviation || v.abbreviation || '').toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Übersetzung wählen</h2>
        <button onClick={onClose}><X size={20} style={{ color: 'var(--color-text-tertiary)' }} /></button>
      </div>
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <Search size={16} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Übersetzung suchen…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text)' }}
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {!versions && <p style={{ color: 'var(--color-text-tertiary)', padding: '16px 0' }}>Lädt…</p>}
        {versions && filtered.length === 0 && (
          <p style={{ color: 'var(--color-text-tertiary)', padding: '16px 0' }}>Keine Übersetzung gefunden.</p>
        )}
        {filtered?.map(v => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className="w-full text-left py-3"
            style={{ borderBottom: '1px solid var(--color-border)', color: String(v.id) === String(currentId) ? 'var(--color-accent)' : 'var(--color-text)' }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{v.localized_title || v.title}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{v.localized_abbreviation || v.abbreviation}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function BookPicker({ currentBook, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Buch wählen</h2>
        <button onClick={onClose}><X size={20} style={{ color: 'var(--color-text-tertiary)' }} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {BIBLE_BOOKS.map(b => (
          <button
            key={b.code}
            onClick={() => onSelect(b.code)}
            className="w-full text-left py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--color-border)', color: b.code === currentBook ? 'var(--color-accent)' : 'var(--color-text)' }}
          >
            {b.name}
            {b.code === currentBook && <span style={{ fontSize: 12 }}>aktuell</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
