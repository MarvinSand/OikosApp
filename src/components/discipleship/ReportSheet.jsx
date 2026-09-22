import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'

const REASONS = ['Anstößiger Inhalt', 'Spam', 'Falsche Lehre', 'Sonstiges']

// Generischer Melde-Button-Flow (content_reports) - Apple-Anforderung für
// nutzergenerierte Inhalte. contentType/contentId identifizieren den
// gemeldeten Datensatz, die Tabelle ist bewusst generisch gehalten, damit
// spätere Report-Buttons (z.B. Feed) sie mitnutzen können.
export default function ReportSheet({ contentType, contentId, onClose }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  async function submit(reason) {
    setSaving(true)
    await supabase.from('content_reports').insert({
      reporter_id: user.id, content_type: contentType, content_id: contentId, reason,
    })
    setSaving(false)
    showToast('Danke, wir prüfen das.')
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
          backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', zIndex: 50,
          padding: '16px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>Inhalt melden</p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>
        <div className="space-y-2">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => submit(r)}
              disabled={saving}
              className="w-full text-left px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', fontSize: 14 }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
