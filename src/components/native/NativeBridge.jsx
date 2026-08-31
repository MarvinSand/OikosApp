import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// No-op on web: Capacitor is only bundled/native on iOS/Android, this
// component just wires status bar + Android hardware back button once the
// app runs inside the native shell (Capacitor.isNativePlatform()).
export default function NativeBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    let backListener
    let cancelled = false

    ;(async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform() || cancelled) return

      const [{ StatusBar, Style }, { SplashScreen }, { App: CapApp }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
        import('@capacitor/app'),
      ])

      try {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
      } catch {}

      SplashScreen.hide().catch(() => {})

      backListener = await CapApp.addListener('backButton', () => {
        if (window.history.state && window.history.index > 0) {
          navigate(-1)
        } else {
          CapApp.exitApp()
        }
      })
    })()

    return () => {
      cancelled = true
      backListener?.remove()
    }
  }, [navigate])

  return null
}
