import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { X, QrCode, ScanLine, Copy, Share2 } from 'lucide-react'
import SwipePager from '../layout/SwipePager'
import SegmentedTabs from '../layout/SegmentedTabs'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useQrScanner } from '../../hooks/useQrScanner'
import { supabase } from '../../lib/supabase'
import { profileLink } from '../../lib/qrLinks'
import { getInitials } from '../../lib/communityTheme'

const TABS = [
  { key: 'code', label: 'Mein Code', icon: QrCode },
  { key: 'scan', label: 'Scannen', icon: ScanLine },
]

function MyCodePane({ user, profile }) {
  const { showToast } = useToast()
  const url = profileLink(user.id)
  const name = profile?.full_name || profile?.username || ''

  async function copy() {
    try { await navigator.clipboard.writeText(url); showToast('Link kopiert ✓') }
    catch { showToast(url, 'info') }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: name || 'Oikos Connect', url }) } catch { /* abgebrochen */ } }
    else copy()
  }
  const btn = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 28px calc(24px + env(safe-area-inset-bottom, 0px))', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : getInitials(name || '?')}
      </div>
      <h3 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{name || ' '}</h3>
      {profile?.username && <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>@{profile.username}</p>}
      <div style={{ padding: 16, backgroundColor: '#fff', borderRadius: 20, margin: '22px 0 16px' }}>
        <QRCodeSVG value={url} size={230} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
      <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 20px', maxWidth: 260 }}>
        Zeig diesen Code, damit andere dich in Oikos Connect finden. Wische nach links zum Scannen.
      </p>
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 300 }}>
        <button onClick={copy} style={btn}><Copy size={15} /> Link</button>
        <button onClick={share} style={btn}><Share2 size={15} /> Teilen</button>
      </div>
    </div>
  )
}

function ScanPane({ active, onClose }) {
  const videoRef = useRef(null)
  const error = useQrScanner(videoRef, active, onClose)
  return (
    <div style={{ position: 'relative', height: '100%', backgroundColor: '#000' }}>
      <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)', textAlign: 'center', color: '#fff', fontFamily: 'Lora, serif', fontSize: 14, padding: '0 24px' }}>
        {error || 'QR-Code von Profil oder Community in den Rahmen halten'}
      </div>
    </div>
  )
}

// WhatsApp-Prinzip: erst der eigene Code, per Wischen (oder Tab) zur Kamera.
export default function QrHubSheet({ onClose, initial = 0 }) {
  const { user } = useAuth()
  const rootRef = useRef(null)
  const [index, setIndex] = useState(initial)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('profiles').select('full_name, username, avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setProfile(data) })
    return () => { cancelled = true }
  }, [user.id])

  // Per Portal an <body>: sonst liegt der Hub im Stacking-Kontext der Kopfleiste
  // (z-index 30) und die Bottom-Nav (z-index 40) läge darüber.
  return createPortal(
    <div ref={rootRef} style={{ position: 'fixed', inset: 0, zIndex: 90, backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
        <div style={{ flex: 1 }}>
          <SegmentedTabs tabs={TABS} active={TABS[index].key} onSelect={k => setIndex(TABS.findIndex(t => t.key === k))} synced />
        </div>
        <button onClick={onClose} aria-label="Schließen" style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <X size={20} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <SwipePager
          count={2}
          index={index}
          onIndexChange={setIndex}
          syncRef={rootRef}
          renderPane={i => i === 0
            ? <MyCodePane user={user} profile={profile} />
            : <ScanPane active={index === 1} onClose={onClose} />}
        />
      </div>
    </div>,
    document.body,
  )
}
