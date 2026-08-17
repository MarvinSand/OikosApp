import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
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
