import { useState } from 'react'
import { X, Flag, Ban, Check } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useModeration } from '../../hooks/useModeration'

// Gründe nach den Kategorien, die Apple und Google in ihren Review-Vorgaben
// als abzudeckende Fälle nennen.
const REASONS = [
  { key: 'spam',       label: 'Spam oder Werbung' },
  { key: 'harassment', label: 'Belästigung oder Mobbing' },
  { key: 'hate',       label: 'Hassrede oder Diskriminierung' },
  { key: 'sexual',     label: 'Sexueller oder anstößiger Inhalt' },
  { key: 'violence',   label: 'Gewalt oder Bedrohung' },
  { key: 'selfharm',   label: 'Selbstverletzung oder Suizid' },
  { key: 'other',      label: 'Etwas anderes' },
]

/**
 * Sheet zum Melden eines Inhalts – und, wenn ein Urheber bekannt ist,
 * zum Blockieren desselben.
 *
 * targetType:   'post' | 'comment' | 'message' | 'profile' | 'community' | 'prayer'
 * targetId:     ID des gemeldeten Objekts
 * targetUserId: Urheber (optional; ohne ihn wird kein Blockieren angeboten)
 * targetName:   Anzeigename des Urhebers, nur für den Text
 */
export default function ReportSheet({
  targetType,
  targetId,
  targetUserId = null,
  targetName = 'diesen Nutzer',
  onClose,
  onBlocked,
}) {
  const { showToast } = useToast()
  const { reportContent, blockUser } = useModeration()
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(false)
  const [sending, setSending] = useState(false)

  const canBlock = Boolean(targetUserId)

  async function handleSubmit() {
    if (!reason || sending) return
    setSending(true)
    try {
      await reportContent({ targetType, targetId, targetUserId, reason, details })
      if (alsoBlock && canBlock) {
        await blockUser(targetUserId)
        onBlocked?.(targetUserId)
      }
      showToast(
        alsoBlock && canBlock
          ? 'Meldung gesendet und Nutzer blockiert'
          : 'Danke – wir sehen uns die Meldung an',
        'success'
      )
      onClose()
    } catch {
      showToast('Melden fehlgeschlagen', 'error')
      setSending(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 70,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flag size={17} /> Melden
          </h3>
          <button onClick={onClose} aria-label="Schließen" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Was stimmt mit diesem Inhalt nicht? Wir prüfen jede Meldung und entfernen
          Inhalte, die gegen unsere Regeln verstoßen.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {REASONS.map(r => {
            const active = reason === r.key
            return (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px',
                  borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: active ? 'var(--color-accent-light)' : 'var(--color-bg)',
                }}
              >
                <span style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                  {r.label}
                </span>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: active ? 'var(--color-accent)' : 'transparent',
                  border: active ? 'none' : '1.5px solid var(--color-border)',
                }}>
                  {active && <Check size={12} color="#fff" />}
                </div>
              </button>
            )
          })}
        </div>

        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Möchtest du etwas ergänzen? (optional)"
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 12, resize: 'none',
            border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
            fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
            marginBottom: 14,
          }}
        />

        {canBlock && (
          <button
            onClick={() => setAlsoBlock(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 13px',
              borderRadius: 12, textAlign: 'left', cursor: 'pointer', marginBottom: 16,
              border: `1.5px solid ${alsoBlock ? 'var(--color-error)' : 'var(--color-border)'}`,
              background: 'var(--color-bg)',
            }}
          >
            <Ban size={16} color={alsoBlock ? 'var(--color-error)' : 'var(--color-text-muted)'} />
            <span style={{ flex: 1, fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {targetName} zusätzlich blockieren
            </span>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: alsoBlock ? 'var(--color-error)' : 'transparent',
              border: alsoBlock ? 'none' : '1.5px solid var(--color-border)',
            }}>
              {alsoBlock && <Check size={12} color="#fff" />}
            </div>
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={!reason || sending}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            backgroundColor: reason ? 'var(--color-error)' : 'var(--color-warm-3)',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
            cursor: reason ? 'pointer' : 'not-allowed',
          }}
        >
          {sending ? 'Wird gesendet…' : 'Meldung senden'}
        </button>
      </div>
    </>
  )
}
