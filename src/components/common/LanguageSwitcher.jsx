import { Languages } from 'lucide-react'
import { LANGUAGES, useT } from '../../i18n'

// Sprachwahl Deutsch / Englisch (Einstellungen). Die Wahl gilt sofort für die
// ganze App und wird auf dem Gerät gespeichert (localStorage, siehe i18n).
export default function LanguageSwitcher() {
  const { t, lang, setLang } = useT()
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 14,
        border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
        marginBottom: 10,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        backgroundColor: 'var(--color-bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-accent)',
      }}>
        <Languages size={19} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t('Sprache der App')}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{t('Deutsch oder Englisch')}</p>
      </div>
      <div role="radiogroup" aria-label={t('Sprache')} style={{ display: 'flex', borderRadius: 10, padding: 3, backgroundColor: 'var(--color-bg-secondary)', flexShrink: 0 }}>
        {LANGUAGES.map(l => {
          const active = lang === l.code
          return (
            <button
              key={l.code}
              role="radio"
              aria-checked={active}
              onClick={() => setLang(l.code)}
              style={{
                border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8,
                fontSize: 13, fontWeight: active ? 700 : 500,
                backgroundColor: active ? 'var(--color-accent)' : 'transparent',
                color: active ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {l.code.toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
