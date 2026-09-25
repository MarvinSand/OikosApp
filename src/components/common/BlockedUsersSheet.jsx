import { useState } from 'react'
import { X } from 'lucide-react'
import { useBlocks } from '../../hooks/useBlocks'
import { useToast } from '../../context/ToastContext'

// Liste der blockierten Personen mit „Aufheben" (Einstellungen → Blockierte Nutzer)
export default function BlockedUsersSheet({ onClose }) {
  const { blockedRows, loading, unblock } = useBlocks()
  const { showToast } = useToast()
  const [busyId, setBusyId] = useState(null)

  async function handleUnblock(id) {
    setBusyId(id)
    try {
      await unblock(id)
      showToast('Blockierung aufgehoben')
    } catch {
      showToast('Aufheben fehlgeschlagen', 'error')
    } finally {
      setBusyId(null)
    }
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
          padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))', maxHeight: '80dvh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>Blockierte Nutzer</p>
          <button onClick={onClose} aria-label="Schließen" style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={18} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>

        {loading && <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {!loading && blockedRows.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Du hast niemanden blockiert.</p>
        )}
        {blockedRows.map(row => {
          const name = row.profile?.full_name || row.profile?.username || 'Unbekannt'
          return (
            <div key={row.blocked_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{name}</p>
                {row.profile?.username && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>@{row.profile.username}</p>
                )}
              </div>
              <button
                onClick={() => handleUnblock(row.blocked_id)}
                disabled={busyId === row.blocked_id}
                style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid var(--color-border)', background: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}
              >
                Aufheben
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
