import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { pathFromScan } from '../../lib/qrLinks'

// Vollbild-Scanner. qr-scanner wird erst beim Öffnen nachgeladen, damit die
// Bibliothek nicht im Start-Bundle landet.
export default function QrScannerSheet({ onClose }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let scanner
    let cancelled = false
    ;(async () => {
      try {
        const { default: QrScanner } = await import('qr-scanner')
        if (cancelled || !videoRef.current) return
        scanner = new QrScanner(
          videoRef.current,
          result => {
            const path = pathFromScan(result.data)
            if (!path) { setError('Das ist kein Oikos-Connect-Code.'); return }
            scanner.stop()
            onClose()
            navigate(path)
          },
          { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
        )
        await scanner.start()
      } catch {
        setError('Kein Zugriff auf die Kamera. Bitte erlaube sie in den Einstellungen.')
      }
    })()
    return () => { cancelled = true; scanner?.destroy() }
  }, [navigate, onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
      <video ref={videoRef} playsInline muted style={{ flex: 1, minHeight: 0, width: '100%', objectFit: 'cover' }} />
      <button onClick={onClose} aria-label="Schließen" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 16, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <X size={20} />
      </button>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)', textAlign: 'center', color: '#fff', fontFamily: 'Lora, serif', fontSize: 14, padding: '0 24px' }}>
        {error || 'QR-Code von Profil oder Community in den Rahmen halten'}
      </div>
    </div>
  )
}
