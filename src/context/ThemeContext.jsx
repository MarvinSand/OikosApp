import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {}, setTheme: () => {} })

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* ignore */ }
  return 'light'
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#FFFFFF')
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])

  function setTheme(t) { setThemeState(t === 'dark' ? 'dark' : 'light') }
  function toggleTheme() { setThemeState(t => (t === 'dark' ? 'light' : 'dark')) }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
