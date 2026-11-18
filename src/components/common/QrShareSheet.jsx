import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Copy, Share2, Download } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

// QR-Code zum Teilen von Profil oder Community. Der Code liegt immer auf
// weißem Grund (auch im Dark Mode), sonst lesen Kameras ihn nicht zuverlässig.
export default function QrShareSheet({ title, subtitle, url, onClose }) {
  const { showToast } = useToast()
  const boxRef = useRef(null)

  async function copy() {
    try { await navigator.clipboard.writeText(url); showToast('Link kopiert ✓') }
    catch { showToast(url, 'info') }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch { /* abgebrochen */ }
    } else copy()
  }

  function download() {
    const svg = boxRef.current?.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const size = 1024
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 64, 64, size - 128, size - 128)
      const a = document.createElement('a')
      a.download = 'oikos-connect-qr.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  }

  const btn = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', color: 'var(--color-text)', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 340, backgroundColor: 'var(--color-surface)', borderRadius: 24, padding: '24px 20px 20px', textAlign: 'center' }}>
        <button onClick={onClose} aria-label="Schließen" style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} />
        </button>
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 28px 2px' }}>{title}</h3>
        {subtitle && <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>{subtitle}</p>}
        <div ref={boxRef} style={{ display: 'inline-block', padding: 14, backgroundColor: '#fff', borderRadius: 16, marginTop: subtitle ? 0 : 16 }}>
          <QRCodeSVG value={url} size={220} level="M" bgColor="#ffffff" fgColor="#000000" />
        </div>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '14px 0 16px' }}>
          Mit der Kamera oder in Oikos Connect scannen
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copy} style={btn}><Copy size={15} /> Link</button>
          <button onClick={share} style={btn}><Share2 size={15} /> Teilen</button>
          <button onClick={download} style={btn}><Download size={15} /> Bild</button>
        </div>
      </div>
    </div>
  )
}
