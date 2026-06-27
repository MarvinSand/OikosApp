import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { useFriendships } from '../../hooks/useFriendships'
import { useToast } from '../../context/ToastContext'
import { getInitials } from '../../lib/communityTheme'

// Mitglieder-Bottom-Sheet: startet über der unteren Hälfte, fährt beim Scrollen
// auf Vollbild. Pro Mitglied „Verbinden" (Freundschaftsanfrage).
export default function MembersSheet({ members, currentUserId, onClose, onSelectMember }) {
  const { getFriendshipStatus, sendRequest } = useFriendships()
  const { showToast } = useToast()
  const [detent, setDetent] = useState('half') // 'half' | 'full'
  const [sending, setSending] = useState(null)
  const dragStart = useRef(null)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function onListScroll(e) {
    if (detent === 'half' && e.currentTarget.scrollTop > 24) setDetent('full')
  }

  async function handleConnect(e, uid) {
    e.stopPropagation()
    if (sending) return
    setSending(uid)
    try { await sendRequest(uid); showToast('Anfrage gesendet') }
    catch { showToast('Fehler beim Senden', 'error') }
    finally { setSending(null) }
  }

  function onHandleDown(e) { dragStart.current = e.touches?.[0]?.clientY ?? e.clientY }
  function onHandleUp(e) {
    if (dragStart.current == null) return
    const y = e.changedTouches?.[0]?.clientY ?? e.clientY
    const dy = y - dragStart.current
    dragStart.current = null
    if (dy < -40) setDetent('full')
    else if (dy > 40) { if (detent === 'full') setDetent('half'); else onClose() }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0,
        width: '100%', maxWidth: 480, height: detent === 'full' ? '100dvh' : '52dvh',
        backgroundColor: 'var(--color-bg)', borderRadius: detent === 'full' ? 0 : '20px 20px 0 0',
        zIndex: 61, display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.3)', overflow: 'hidden',
        transition: reduceMotion ? 'none' : 'height 0.28s ease, border-radius 0.28s ease',
        paddingTop: detent === 'full' ? 'env(safe-area-inset-top, 0px)' : 0,
      }}>
        {/* Handle + Kopf */}
        <div
          onMouseDown={onHandleDown} onMouseUp={onHandleUp}
          onTouchStart={onHandleDown} onTouchEnd={onHandleUp}
          style={{ flexShrink: 0, cursor: 'grab', paddingTop: 8 }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 10px', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
              Mitglieder — {members.length}
            </p>
            <button onClick={onClose} aria-label="Schließen" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div onScroll={onListScroll} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px calc(80px + env(safe-area-inset-bottom, 0px))' }}>
          {members.map(m => {
            const name = m.profile?.full_name || m.profile?.username || 'Unbekannt'
            const isSelf = m.user_id === currentUserId
            const status = isSelf ? 'self' : getFriendshipStatus(m.user_id)
            return (
              <div
                key={m.id}
                onClick={() => onSelectMember(m)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, cursor: 'pointer' }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: m.profile?.is_christian ? 'var(--color-accent)' : 'var(--color-warm-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 700,
                }}>
                  {getInitials(name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 14.5, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}{isSelf ? ' (Du)' : ''}
                  </p>
                  <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: m.role === 'admin' ? 'var(--color-gold-text)' : 'var(--color-text-muted)', fontWeight: m.role === 'admin' ? 700 : 400, margin: 0 }}>
                    {m.role === 'admin' ? 'Admin' : `@${m.profile?.username || 'user'}`}
                  </p>
                </div>
                {status === 'none' && (
                  <button onClick={(e) => handleConnect(e, m.user_id)} disabled={sending === m.user_id} style={connectBtnStyle}>
                    {sending === m.user_id ? '…' : 'Verbinden'}
                  </button>
                )}
                {status === 'sent' && <span style={badgeStyle}>Angefragt</span>}
                {status === 'received' && <span style={badgeStyle}>Anfrage erhalten</span>}
                {status === 'friends' && <span style={{ ...badgeStyle, color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 700 }}>Verbunden ✓</span>}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

const connectBtnStyle = {
  flexShrink: 0, padding: '8px 15px', borderRadius: 999, border: 'none',
  backgroundColor: 'var(--color-accent)', color: '#fff',
  fontFamily: 'Lora, serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
}
const badgeStyle = {
  flexShrink: 0, fontFamily: 'Lora, serif', fontSize: 11.5,
  color: 'var(--color-text-muted)', fontStyle: 'italic',
}
