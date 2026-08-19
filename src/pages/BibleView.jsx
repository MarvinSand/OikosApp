import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, BookMarked, Highlighter, StickyNote, Bookmark, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useChapterText, useBibleMarkers, saveReadingProgress, DEFAULT_BIBLE_ID } from '../hooks/useBible'
import { useYouVersionAccount } from '../hooks/useYouVersionAccount'
import { BIBLE_BOOKS, findBook } from '../lib/bibleBooks'

const HIGHLIGHT_COLORS = {
  yellow: '#fde68a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  pink: '#fbcfe8',
}

export default function BibleView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [book, setBook] = useState('JHN')
  const [chapter, setChapter] = useState(3)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [selectedVerse, setSelectedVerse] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')

  const bookInfo = findBook(book)
  const { verses, loading, error } = useChapterText(DEFAULT_BIBLE_ID, book, chapter)
  const { highlights, notes, bookmarks, addHighlight, removeHighlight, addNote, removeNote, toggleBookmark } = useBibleMarkers(book, chapter)
  const yv = useYouVersionAccount()

  function referenceLabel(verseNum) {
    return `${bookInfo?.name || book} ${chapter},${verseNum}`
  }

  function goToChapter(nextBook, nextChapter) {
    setBook(nextBook)
    setChapter(nextChapter)
    setSelectedVerse(null)
    setShowBookPicker(false)
    if (user) saveReadingProgress(user.id, { book: nextBook, chapter: nextChapter })
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

  const highlightFor = (verseNum) => highlights.find(h => verseNum >= h.verse_start && verseNum <= (h.verse_end ?? h.verse_start))
  const notesFor = (verseNum) => notes.filter(n => verseNum >= n.verse_start && verseNum <= (n.verse_end ?? n.verse_start))
  const isBookmarked = (verseNum) => bookmarks.some(b => b.verse === verseNum)

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
      </div>

      {/* Content */}
      <div className="px-5 py-5" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
            Bibeltext konnte nicht geladen werden. Falls das dauerhaft passiert: der YouVersion-API-Pfad für
            Bibeltext muss ggf. noch gegen die echte Doku (developers.youversion.com) angepasst werden.
          </div>
        )}

        {!loading && !error && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 17, lineHeight: 1.9, color: 'var(--color-text)' }}>
            {(verses || []).map(v => {
              const num = v.verse ?? v.number
              const text = v.text ?? v.content ?? ''
              const hl = highlightFor(num)
              const vNotes = notesFor(num)
              const bookmarked = isBookmarked(num)
              const isSelected = selectedVerse === num

              return (
                <span
                  key={num}
                  onClick={() => setSelectedVerse(isSelected ? null : num)}
                  style={{
                    backgroundColor: hl ? HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow : (isSelected ? 'var(--color-bg-secondary)' : 'transparent'),
                    borderRadius: 4,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px var(--color-accent)' : 'none',
                  }}
                >
                  <sup style={{ fontSize: 11, marginRight: 2, color: 'var(--color-text-tertiary)' }}>{num}</sup>
                  {text}{' '}
                  {bookmarked && <Bookmark size={12} style={{ display: 'inline', color: 'var(--color-accent)' }} fill="var(--color-accent)" />}
                  {vNotes.length > 0 && <StickyNote size={12} style={{ display: 'inline', color: 'var(--color-accent)' }} />}
                </span>
              )
            })}
          </p>
        )}
      </div>

      {/* Verse-Aktionsleiste */}
      {selectedVerse != null && (
        <VerseActionBar
          verseNum={selectedVerse}
          referenceLabel={referenceLabel(selectedVerse)}
          existingHighlight={highlightFor(selectedVerse)}
          bookmarked={isBookmarked(selectedVerse)}
          notes={notesFor(selectedVerse)}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          onClose={() => { setSelectedVerse(null); setNoteDraft('') }}
          onHighlight={(color) => addHighlight({ verseStart: selectedVerse, referenceLabel: referenceLabel(selectedVerse), color })}
          onRemoveHighlight={(id) => removeHighlight(id)}
          onBookmark={() => toggleBookmark({ verse: selectedVerse, referenceLabel: referenceLabel(selectedVerse) })}
          onSaveNote={async () => {
            if (!noteDraft.trim()) return
            await addNote({ verseStart: selectedVerse, referenceLabel: referenceLabel(selectedVerse), note: noteDraft.trim() })
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
  verseNum, referenceLabel, existingHighlight, bookmarked, notes, noteDraft, setNoteDraft,
  onClose, onHighlight, onRemoveHighlight, onBookmark, onSaveNote, onRemoveNote,
}) {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-2xl p-4 z-30"
      style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}
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
            {existingHighlight?.color === name && <Highlighter size={14} />}
          </button>
        ))}
        <button
          onClick={onBookmark}
          className="w-8 h-8 rounded-full flex items-center justify-center ml-auto"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <Bookmark size={16} style={{ color: bookmarked ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }} fill={bookmarked ? 'var(--color-accent)' : 'none'} />
        </button>
      </div>

      {notes.map(n => (
        <div key={n.id} className="flex items-start justify-between gap-2 mb-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text)' }}>{n.note}</p>
          <button onClick={() => onRemoveNote(n.id)}><X size={14} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>
      ))}

      <div className="flex items-center gap-2">
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
