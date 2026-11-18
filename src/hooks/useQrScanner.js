import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pathFromScan } from '../lib/qrLinks'

// Startet/stoppt den Kamera-Scanner passend zu `active`. qr-scanner wird erst
// beim ersten Aktivieren nachgeladen, damit die Bibliothek nicht im Start-
// Bundle landet und die Kamera-Berechtigung erst beim Wechsel zum Scanner
// abgefragt wird.
export function useQrScanner(videoRef, active, onDone) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (!active) return
    let scanner
    let cancelled = false
    setError('')
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
            doneRef.current?.()
            navigate(path)
          },
          { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
        )
        await scanner.start()
      } catch {
        if (!cancelled) setError('Kein Zugriff auf die Kamera. Bitte erlaube sie in den Einstellungen.')
      }
    })()
    return () => { cancelled = true; scanner?.destroy() }
  }, [active, navigate, videoRef])

  return error
}
