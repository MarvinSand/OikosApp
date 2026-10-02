import { useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { BIBLE_BOOKS, findBook } from '../../lib/bibleBooks'

// Zweistufiger Picker (Buch -> Kapitel-Raster), aus BibleView.jsx extrahiert,
// damit auch der Verspicker (VersePickerSheet) ihn nutzen kann.
export default function BookChapterPicker({ currentBook, currentChapter, onSelect, onClose }) {
  const [pendingBook, setPendingBook] = useState(null)

  if (pendingBook) {
    const info = findBook(pendingBook)
    const chapters = Array.from({ length: info?.chapters || 0 }, (_, i) => i + 1)
    return (
      <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setPendingBook(null)} className="p-1 -ml-1">
            <ChevronLeft size={20} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
          <h2 className="font-bold flex-1" style={{ color: 'var(--color-text)' }}>{info?.name} – Kapitel wählen</h2>
          <button onClick={onClose}><X size={20} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
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
            onClick={() => setPendingBook(b.code)}
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
