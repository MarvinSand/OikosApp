import { lazy, Suspense, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { versesFromRow } from '../../lib/bibleLink'

const BiblePassageSheet = lazy(() => import('../discipleship/BiblePassageSheet'))

// Text mit eingebetteten Bibelstellen: Jedes Vorkommen eines Stellennamens
// (attachment.referenceLabel, z. B. „Johannes 3,16“) wird blau und antippbar –
// Tippen öffnet den Vers als Sheet mit „Kontext ansehen“ (wie im Bekenntnis).
// Ein Zitat direkt hinter dem Namen („…“) wird kursiv dargestellt.
// Ohne strukturierte Stelle (alte Freitext-Zeilen) oder ohne Treffer: reiner Text.
const isLinkable = (a) => !!(a?.referenceLabel && a.book)
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function textHasVerseLabel(text, attachment) {
  return !!(isLinkable(attachment) && text && text.includes(attachment.referenceLabel))
}

// Blöcke unter dem Beitrag: alte Beiträge mit Zitat-Block wie bisher; sonst nur
// Stellen, die nicht als blauer Link im Text stehen (Fallback, z. B. wenn der
// Name aus dem Text gelöscht wurde).
export function verseBlocks(post, body = post?.body) {
  const verses = versesFromRow(post)
  if (!verses.length) return []
  const legacy = !(Array.isArray(post.bible_verses) && post.bible_verses.length)
  return verses.filter(v => (legacy && v.verseText) || !textHasVerseLabel(body, v))
}

export default function VerseInlineText({ text, attachments }) {
  const [openIdx, setOpenIdx] = useState(null)
  const list = useMemo(() => (attachments || []).filter(isLinkable), [attachments])
  const parts = useMemo(() => {
    if (!text || !list.length) return null
    const labels = [...new Set(list.map(a => a.referenceLabel))].sort((a, b) => b.length - a.length)
    const re = new RegExp(`(${labels.map(escapeRe).join('|')})(\\s*„[^“]*“)?`, 'g')
    const out = []
    let last = 0, m
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ text: text.slice(last, m.index) })
      out.push({ label: m[1], quote: m[2] || '' })
      last = m.index + m[0].length
    }
    if (!out.some(p => p.label)) return null
    if (last < text.length) out.push({ text: text.slice(last) })
    return out
  }, [text, list])

  if (!text) return null
  if (!parts) return text

  const current = openIdx != null ? list.find(a => a.referenceLabel === openIdx) : null
  const sheet = current && createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }} onClick={e => e.stopPropagation()}>
      <Suspense fallback={null}>
        <BiblePassageSheet
          label={current.referenceLabel}
          parsed={{ book: current.book, chapter: current.chapter, verseStart: current.verseStart, verseEnd: current.verseEnd }}
          bibleId={current.bibleId}
          onClose={() => setOpenIdx(null)}
        />
      </Suspense>
    </div>,
    document.body,
  )

  return (
    <>
      {parts.map((p, i) => p.label ? (
        <span key={i}>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); e.preventDefault(); setOpenIdx(p.label) }}
            style={{
              display: 'inline', border: 'none', background: 'none', padding: 0, margin: 0,
              font: 'inherit', fontWeight: 700, color: 'var(--color-accent-dark)', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >{p.label}</button>
          {p.quote && <i style={{ color: 'var(--color-text-secondary)' }}>{p.quote}</i>}
        </span>
      ) : <span key={i}>{p.text}</span>)}
      {sheet}
    </>
  )
}
