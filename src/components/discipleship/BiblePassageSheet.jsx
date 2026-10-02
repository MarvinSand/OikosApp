import { X, RotateCw, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStationPassage } from '../../hooks/useStationPassage'

// Bottom-Sheet für eine einzelne Bibelstelle, angetippt aus einer Zeile
// (Bekenntnis, Bibliothek). Nutzt denselben Cache-Hook wie die
// Stationsdetailseite - book/chapter/verse sind hier nur nicht aus einer
// festen Spalte, sondern aus lib/bibleBooks.js#parseGermanReference geparst.
export default function BiblePassageSheet({ label, parsed, onClose }) {
  const navigate = useNavigate()
  const { html, loading, error, retry } = useStationPassage(parsed?.book, parsed?.chapter, parsed?.verseStart, parsed?.verseEnd)

  function openContext() {
    navigate(`/bible?book=${parsed.book}&chapter=${parsed.chapter}&verse=${parsed.verseStart}`)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
          backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', zIndex: 50,
          padding: '16px 20px calc(28px + env(safe-area-inset-bottom, 0px))', maxHeight: '75vh', overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>{label}</p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>

        {!parsed && <p style={{ color: 'var(--color-text-tertiary)' }}>Stelle konnte nicht erkannt werden.</p>}
        {parsed && loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {parsed && error && (
          <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Text konnte nicht geladen werden.</span>
            <button onClick={retry} className="flex items-center gap-1 text-sm font-medium flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
              <RotateCw size={14} /> Erneut
            </button>
          </div>
        )}
        {parsed && !loading && !error && html && (
          <div style={{ fontFamily: 'Lora, serif', fontSize: 16, lineHeight: 1.8, color: 'var(--color-text)' }} dangerouslySetInnerHTML={{ __html: html }} />
        )}

        {parsed && (
          <button
            onClick={openContext}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl font-medium mt-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-accent)' }}
          >
            <BookOpen size={15} /> Kontext ansehen
          </button>
        )}
      </div>
    </>
  )
}
