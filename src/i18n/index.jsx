import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './en'

// Einfaches, abhängigkeitsfreies i18n (Deutsch = Quellsprache).
//
// Der deutsche Text ist selbst der Schlüssel: `t('Mein OIKOS')`. Für Englisch
// wird er in `en.js` nachgeschlagen; fehlt ein Eintrag, bleibt der deutsche Text
// stehen (nie ein leerer oder kaputter Schlüssel). So lässt sich Seite für Seite
// übersetzen, ohne etwas zu brechen. Platzhalter: `t('{n} Personen', { n: 3 })`.
//
// Neue UI-Texte immer mit t() schreiben und die englische Übersetzung in
// `en.js` ergänzen.

export const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
]

const STORAGE_KEY = 'oikos_lang'
const DICTS = { en }

function detectLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'de' || stored === 'en') return stored
  } catch { /* ignore */ }
  // Ohne eigene Wahl: immer Deutsch (Standardsprache der App). Englisch gibt es
  // nur, wenn der Nutzer es in den Einstellungen ausdrücklich wählt.
  return 'de'
}

// Aktuelle Sprache auch außerhalb von React (z. B. bibleBooks.js, Intl-Helfer).
let currentLang = detectLang()
export const getLang = () => currentLang

export function translate(text, lang = currentLang, vars) {
  let out = lang === 'de' ? text : (DICTS[lang]?.[text] ?? text)
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m))
  return out
}

// Für Nicht-React-Code
export const tr = (text, vars) => translate(text, currentLang, vars)

const LanguageContext = createContext({ lang: 'de', setLang: () => {}, t: (s, v) => translate(s, 'de', v) })

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(currentLang)

  useEffect(() => {
    currentLang = lang
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    if (next !== 'de' && next !== 'en') return
    currentLang = next
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (text, vars) => translate(text, lang, vars),
  }), [lang, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useT() {
  return useContext(LanguageContext)
}
