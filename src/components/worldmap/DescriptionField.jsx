import { useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { useT } from '../../i18n'

// Infos-Textfeld mit „Link hinzufügen“: Text + Adresse (ohne https nötig) → fügt
// [Text](adresse) an der Cursor-Position ein; angezeigt wird nur der Text als Link.
export default function DescriptionField({ value, onChange, rows = 4, C, inputStyle }) {
  const { t } = useT()
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  function insert() {
    const addr = url.trim()
    if (!addr) return
    const text = label.trim()
    const snippet = text ? `[${text.replace(/[\[\]]/g, '')}](${addr.replace(/\s/g, '')})` : addr
    const el = ref.current
    const pos = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? pos
    const before = value.slice(0, pos)
    const sep = before && !/\s$/.test(before) ? ' ' : ''
    onChange(`${before}${sep}${snippet}${value.slice(end)}`)
    setLabel(''); setUrl(''); setOpen(false)
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('Was sollten andere wissen?')}
        rows={rows}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ marginTop: 6, border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', color: C.accentDark, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Link2 size={15} /> {t('Link hinzufügen')}
        </button>
      ) : (
        <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: C.bgSec, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t('Angezeigter Text, z. B. Anmeldung')} style={inputStyle} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t('Adresse, z. B. beispiel.de')} autoCapitalize="none" autoCorrect="off" inputMode="url" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'none', color: C.textSec, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('Abbrechen')}</button>
            <button type="button" onClick={insert} disabled={!url.trim()} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: url.trim() ? 1 : 0.5 }}>{t('Einfügen')}</button>
          </div>
        </div>
      )}
      <p style={{ fontSize: 11.5, color: C.textTer, margin: '6px 0 0' }}>
        {t('Webadressen wie beispiel.de werden automatisch anklickbar.')}
      </p>
    </div>
  )
}
