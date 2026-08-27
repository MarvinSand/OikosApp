import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useChapterText, DEFAULT_BIBLE_ID } from '../../hooks/useBible'
import { formatReferenceLabel } from '../../lib/bibleLink'
import { verseTextFromContainer } from '../../lib/biblePassageHtml'
import BookChapterPicker from './BookChapterPicker'

const BIBLE_ID_STORAGE_KEY = 'oikos_bible_version_id'

// Zweiter Schritt nach BookChapterPicker: Kapiteltext anzeigen, Vers(e) per
// Tap auswählen, dann "Vers übernehmen" -> liefert ein VerseAttachment
// { bibleId, book, chapter, verseStart, verseEnd, referenceLabel, verseText }
// zurück. Wird sowohl von den Post-/Gebets-Composern als auch vom "Als
// Beitrag teilen"-Flow aus BibleView genutzt.
export default function VersePickerSheet({ initialBibleId = null, onSelect, onClose }) {
  const [step, setStep] = useState('book') // 'book' | 'verse'
  const [book, setBook] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [selectedVerses, setSelectedVerses] = useState(new Set())
  const contentRef = useRef(null)

  const effectiveBibleId = initialBibleId
    ?? (() => { try { return localStorage.getItem(BIBLE_ID_STORAGE_KEY) } catch { return null } })()
    ?? DEFAULT_BIBLE_ID

  const { html, loading, error } = useChapterText(effectiveBibleId, book, chapter)

  function handleBookSelect(code, ch) {
    setBook(code)
    setChapter(ch)
    setSelectedVerses(new Set())
    setStep('verse')
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

  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    container.querySelectorAll('[data-verse]').forEach(el => {
      const num = parseInt(el.getAttribute('data-verse'), 10)
      if (selectedVerses.has(num)) {
        el.style.backgroundColor = 'var(--color-accent-light, var(--color-bg-secondary))'
        el.style.boxShadow = '0 0 0 2px var(--color-accent)'
      } else {
        el.style.backgroundColor = 'transparent'
        el.style.boxShadow = 'none'
      }
    })
  }, [html, selectedVerses])

  const nums = Array.from(selectedVerses).sort((a, b) => a - b)
  const verseStart = nums[0]
  const verseEnd = nums[nums.length - 1]
  const referenceLabel = nums.length
    ? formatReferenceLabel({ book, chapter, verseStart, verseEnd })
    : formatReferenceLabel({ book, chapter, verseStart: null })

  function handleConfirm() {
    const verseText = nums.length ? verseTextFromContainer(contentRef.current, nums) : ''
    onSelect({
      bibleId: effectiveBibleId,
      book, chapter,
      verseStart: verseStart ?? null,
      verseEnd: verseEnd ?? null,
      referenceLabel,
      verseText,
    })
  }

  if (step === 'book') {
    return <BookChapterPicker currentBook={book} currentChapter={chapter} onSelect={handleBookSelect} onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => setStep('book')} className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
          Buch wechseln
        </button>
        <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>{referenceLabel}</h2>
        <button onClick={onClose}><X size={20} style={{ color: 'var(--color-text-tertiary)' }} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {error && <p style={{ color: 'var(--color-text-tertiary)' }}>Text konnte nicht geladen werden.</p>}
        {!loading && !error && html && (
          <div
            ref={contentRef}
            onClick={handleContentClick}
            style={{ fontFamily: 'Lora, serif', fontSize: 16, lineHeight: 1.8, color: 'var(--color-text)' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid var(--color-border)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <p className="flex-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {nums.length ? referenceLabel : 'Vers(e) antippen'}
        </p>
        <button
          onClick={handleConfirm}
          disabled={nums.length === 0}
          className="px-4 py-2.5 rounded-xl font-medium text-sm"
          style={{
            backgroundColor: nums.length ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            color: nums.length ? 'white' : 'var(--color-text-tertiary)',
          }}
        >
          Vers übernehmen
        </button>
      </div>
    </div>
  )
}
