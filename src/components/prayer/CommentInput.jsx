import { useState } from 'react'
import { Send } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

// Kommentar-Eingabe unter einer Gebets-Karte. „Nur Ersteller" schreibt den
// Kommentar als nicht-öffentliche Notiz (prayer_notes.is_public = false).
export default function CommentInput({ onSubmit }) {
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSend() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(text.trim(), isPublic)
      setText('')
    } catch {
      showToast('Fehler beim Kommentieren', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[
          { val: true, label: 'Für alle' },
          { val: false, label: 'Nur Ersteller' },
        ].map(o => (
          <button
            key={String(o.val)}
            onClick={() => setIsPublic(o.val)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--color-border)',
              background: isPublic === o.val ? 'var(--color-accent)' : 'var(--color-bg)',
              color: isPublic === o.val ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Kommentar schreiben…"
          rows={2}
          style={{
            flex: 1, resize: 'none', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '8px 10px', fontSize: 13,
            backgroundColor: 'var(--color-bg)', color: 'var(--color-text)',
            outline: 'none', lineHeight: 1.4,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || submitting}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: text.trim() ? 'var(--color-accent)' : 'var(--color-border)',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
