import { lazy, Suspense, useState } from 'react'
import { createPortal } from 'react-dom'
import { verseAttachmentFromRow } from '../../lib/bibleLink'

const BiblePassageSheet = lazy(() => import('../discipleship/BiblePassageSheet'))

// Text mit eingebetteter Bibelstelle: Jedes Vorkommen des Stellennamens
// (attachment.referenceLabel, z. B. „Johannes 3,16“) wird blau und antippbar –
// Tippen öffnet den Vers als Sheet mit „Kontext ansehen“ (wie im Bekenntnis).
// Ohne strukturierte Stelle (alte Freitext-Zeilen) oder ohne Treffer: reiner Text.
export function textHasVerseLabel(text, attachment) {
  return !!(attachment?.referenceLabel && attachment.book && text && text.includes(attachment.referenceLabel))
}

// Zitat-/Referenzblock unter dem Beitrag: bei „zitieren“ immer; sonst nur, wenn die
// Stelle nicht schon als blauer Link im Text steht (dann erscheint der Vers erst
// nach dem Tippen).
export function showVerseBlock(post) {
  if (!post?.bible_reference) return false
  if (post.bible_verse) return true
  return !textHasVerseLabel(post.body, verseAttachmentFromRow(post))
}

export default function VerseInlineText({ text, attachment, linkColor = 'var(--color-accent-dark)' }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  if (!textHasVerseLabel(text, attachment)) return text

  const parts = text.split(attachment.referenceLabel)
  const sheet = open && createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }} onClick={e => e.stopPropagation()}>
      <Suspense fallback={null}>
        <BiblePassageSheet
          label={attachment.referenceLabel}
          parsed={{ book: attachment.book, chapter: attachment.chapter, verseStart: attachment.verseStart, verseEnd: attachment.verseEnd }}
          bibleId={attachment.bibleId}
          onClose={() => setOpen(false)}
        />
      </Suspense>
    </div>,
    document.body,
  )

  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(true) }}
              style={{
                display: 'inline', border: 'none', background: 'none', padding: 0, margin: 0,
                font: 'inherit', fontWeight: 700, color: linkColor, cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >{attachment.referenceLabel}</button>
          )}
        </span>
      ))}
      {sheet}
    </>
  )
}
