import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
// Schriften lokal gebündelt statt von fonts.googleapis.com: In der iOS-App
// liegt so alles offline im App-Bundle (vorher blockierte das externe
// Stylesheet den ersten Paint, offline bis zum Timeout), und es geht keine
// Nutzer-IP mehr an Google (DSGVO).
import './fonts.css'
import './index.css'

// Community-Gebete zählten früher nur im localStorage (pro Gerät, max. ein
// Gebet). Sie liegen jetzt in personal_prayer_logs / prayer_notes – die alten
// Schlüssel werden einmalig entfernt.
try {
  localStorage.removeItem('comm_prayed')
  localStorage.removeItem('comm_notes')
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
