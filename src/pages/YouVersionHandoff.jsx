import { useEffect } from 'react'
import { YOUVERSION_FROM_APP_KEY } from '../hooks/useYouVersionAccount'
import { useT } from '../i18n'

// Brückenseite im System-Browser: Die App startet den YouVersion-Login hier.
// Sie merkt sich im Browser (localStorage dieser Origin), dass der Login aus der
// App kommt, und leitet dann zu YouVersion weiter. Die Callback-Seite liest den
// Merker und zeigt statt der Web-Anmeldung den Link zurück in die App.
export default function YouVersionHandoff() {
  const { t } = useT()
  useEffect(() => {
    const to = new URLSearchParams(window.location.search).get('to') || ''
    // Nur echte YouVersion-Autorisierungsadressen (kein offener Redirect)
    if (!/^https:\/\/api\.youversion\.com\//.test(to)) {
      window.location.replace('/auth')
      return
    }
    try { localStorage.setItem(YOUVERSION_FROM_APP_KEY, String(Date.now())) } catch { /* ignore */ }
    window.location.replace(to)
  }, [])
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>{t('Verbinde mit YouVersion…')}</p>
    </div>
  )
}
