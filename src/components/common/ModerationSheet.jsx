import { useState } from 'react'
import { X, Flag, Ban, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useBlocks } from '../../hooks/useBlocks'
import { useToast } from '../../context/ToastContext'

// Melden + Blockieren für fremde Inhalte (App-Store-Richtlinie 1.2: Apps mit
// nutzergenerierten Inhalten müssen beides anbieten). Meldungen landen in
// `content_reports` – die müssen innerhalb von 24 h gesichtet werden.
const REASONS = [
  'Belästigung oder Mobbing',
  'Hassrede oder Diskriminierung',
  'Anstößiger oder sexueller Inhalt',
  'Gewalt oder Bedrohung',
  'Spam oder Betrug',
  'Falsche Lehre',
  'Sonstiges',
]

export default function ModerationSheet({ contentType, contentId, authorId, authorName, onClose, onBlocked }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { isBlocked, block, unblock } = useBlocks()
  const [step, setStep] = useState('menu') // 'menu' | 'report' | 'confirmBlock'
  const [busy, setBusy] = useState(false)
  const canBlock = authorId && authorId !== user?.id
  const blocked = canBlock && isBlocked(authorId)
  const name = authorName || 'diese Person'

  async function report(reason) {
    setBusy(true)
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id, content_type: contentType, content_id: contentId, reason,
    })
    setBusy(false)
    if (error) { showToast('Meldung konnte nicht gesendet werden', 'error'); return }
    showToast('Danke – wir prüfen die Meldung innerhalb von 24 Stunden.')
    onClose()
  }

  async function doBlock() {
    setBusy(true)
    try {
      await block(authorId)
      showToast(`${name} ist blockiert`)
      onClose()
      onBlocked?.()
    } catch {
      showToast('Blockieren fehlgeschlagen', 'error')
      setBusy(false)
    }
  }

  async function doUnblock() {
    setBusy(true)
    try {
      await unblock(authorId)
      showToast('Blockierung aufgehoben')
      onClose()
    } catch {
      showToast('Aufheben fehlgeschlagen', 'error')
      setBusy(false)
    }
  }

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
    padding: '13px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
    backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', fontSize: 14,
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
          backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', zIndex: 91,
          padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '85dvh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {step !== 'menu' && (
              <button onClick={() => setStep('menu')} aria-label="Zurück" style={{ border: 'none', background: 'none', padding: 2, cursor: 'pointer', color: 'var(--color-text)', display: 'flex' }}>
                <ChevronLeft size={20} />
              </button>
            )}
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>
              {step === 'report' ? 'Warum meldest du das?' : step === 'confirmBlock' ? `${name} blockieren?` : 'Optionen'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Schließen" style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={18} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>

        {step === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setStep('report')} style={rowStyle}>
              <Flag size={16} /> {contentType === 'user' ? 'Profil melden' : 'Inhalt melden'}
            </button>
            {canBlock && (
              blocked ? (
                <button onClick={doUnblock} disabled={busy} style={rowStyle}>
                  <Ban size={16} /> Blockierung von {name} aufheben
                </button>
              ) : (
                <button onClick={() => setStep('confirmBlock')} style={{ ...rowStyle, color: 'var(--color-error, #C0392B)' }}>
                  <Ban size={16} /> {name} blockieren
                </button>
              )
            )}
          </div>
        )}

        {step === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REASONS.map(r => (
              <button key={r} onClick={() => report(r)} disabled={busy} style={rowStyle}>{r}</button>
            ))}
          </div>
        )}

        {step === 'confirmBlock' && (
          <div>
            <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
              Ihr seht gegenseitig keine Beiträge, Kommentare, Gebete und Nachrichten mehr und könnt euch nicht mehr
              direkt schreiben. Eine bestehende Verbindung wird entfernt. Du kannst das jederzeit in den
              Einstellungen rückgängig machen.
            </p>
            <button
              onClick={doBlock}
              disabled={busy}
              style={{ ...rowStyle, justifyContent: 'center', fontWeight: 700, color: 'white', backgroundColor: 'var(--color-error, #C0392B)' }}
            >
              {busy ? 'Einen Moment…' : 'Blockieren'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
