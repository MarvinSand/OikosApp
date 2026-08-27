import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { buildBibleLink } from '../../lib/bibleLink'

// Rendert eine Bibelvers-Verknüpfung (VerseAttachment) - entweder als kleine
// klickbare Pille ('chip', für Composer-Vorschauen) oder als Block mit
// optionalem Zitat ('block', für Feed-Posts/Gebete). Klickbar (springt zur
// exakten Stelle in /bible) nur wenn strukturierte Felder vorhanden sind -
// alte Freitext-Zeilen (nur bible_reference/bible_verse) werden nicht-
// interaktiv gerendert.
export default function BibleReferenceChip({ attachment, variant = 'block', showVerse = true, onRemove = null }) {
  const navigate = useNavigate()
  if (!attachment) return null

  const to = attachment.book ? buildBibleLink(attachment) : null
  const Tag = to ? 'button' : 'div'

  function handleClick(e) {
    if (!to) return
    e.stopPropagation()
    e.preventDefault()
    navigate(to)
  }

  if (variant === 'chip') {
    return (
      <span className="inline-flex items-center gap-1">
        <Tag
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{
            fontFamily: 'Lora, serif',
            border: '1px solid var(--color-accent)',
            backgroundColor: 'var(--color-accent-light, var(--color-bg-secondary))',
            color: 'var(--color-accent-dark, var(--color-accent))',
            cursor: to ? 'pointer' : 'default',
          }}
        >
          📖 {attachment.referenceLabel}
        </Tag>
        {onRemove && (
          <button onClick={onRemove} aria-label="Vers entfernen" className="p-1">
            <X size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        )}
      </span>
    )
  }

  return (
    <div className="flex items-start gap-2" style={{ marginTop: 8, marginBottom: 8 }}>
      <Tag
        onClick={handleClick}
        className="flex-1 text-left"
        style={{
          borderLeft: '3px solid var(--color-accent)',
          paddingLeft: 10,
          cursor: to ? 'pointer' : 'default',
        }}
      >
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', margin: 0 }}>
          📖 {attachment.referenceLabel}
        </p>
        {showVerse && attachment.verseText && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, fontStyle: 'italic', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            „{attachment.verseText}"
          </p>
        )}
      </Tag>
      {onRemove && (
        <button onClick={onRemove} aria-label="Vers entfernen" className="p-1 flex-shrink-0">
          <X size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
      )}
    </div>
  )
}
