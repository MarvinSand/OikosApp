import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

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
  // Track the currently logged-in user so theme changes can be persisted to
  // their account (localStorage is only a fast, device-local cache).
  const userIdRef = useRef(null)

  // Apply theme + cache locally whenever it changes (instant, no flicker on reload).
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])

  // Sync with the account: load the saved preference on (re-)login.
  useEffect(() => {
    let active = true

    async function loadFromProfile(userId) {
      userIdRef.current = userId
      try {
        const { data } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', userId)
          .single()
        if (active && (data?.theme_preference === 'dark' || data?.theme_preference === 'light')) {
          setThemeState(data.theme_preference)
        }
      } catch { /* non-critical */ }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadFromProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') loadFromProfile(session.user.id)
        else userIdRef.current = session.user.id
      } else {
        userIdRef.current = null
      }
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [])

  function persist(t) {
    if (!userIdRef.current) return
    supabase
      .from('profiles')
      .update({ theme_preference: t })
      .eq('id', userIdRef.current)
      .then(() => {}, () => { /* non-critical */ })
  }

  function setTheme(t) {
    const next = t === 'dark' ? 'dark' : 'light'
    setThemeState(next)
    persist(next)
  }

  function toggleTheme() {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      persist(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
