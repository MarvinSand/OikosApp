import { Plus, X } from 'lucide-react'
import { useT } from '../../i18n'

// Weitere Einzeltermine für ein Event (recurrence_freq = 'custom').
// `dates` = Array lokaler datetime-local-Strings; der erste Termin steht
// im Start-Feld des Formulars. Dauer je Termin = Ende − Start.
function toLocalInput(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function CustomDatesEditor({ dates, onChange, startsAt, C, inputStyle }) {
  const { t } = useT()

  function add() {
    const base = dates.length ? dates[dates.length - 1] : startsAt
    const d = base ? new Date(base) : new Date()
    if (base) d.setDate(d.getDate() + 7)
    onChange([...dates, toLocalInput(d)])
  }

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: C.bgSec, border: `1px solid ${C.border}` }}>
      <p style={{ fontSize: 12, color: C.textSec, margin: '0 0 8px', lineHeight: 1.5 }}>
        {t('Der erste Termin ist oben. Hier kommen weitere dazu – das Event und sein Chat bleiben bestehen.')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dates.map((value, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="datetime-local"
              value={value}
              onChange={e => onChange(dates.map((d, j) => (j === i ? e.target.value : d)))}
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              onClick={() => onChange(dates.filter((_, j) => j !== i))}
              aria-label={t('Termin entfernen')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 6, display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        style={{
          marginTop: dates.length ? 10 : 0, width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          border: `1.5px dashed ${C.accent}`, background: 'transparent', color: C.accentDark,
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <Plus size={15} /> {t('Termin hinzufügen')}
      </button>
    </div>
  )
}

// Lokale Eingaben → sortierte, eindeutige ISO-Strings (leere/ungültige entfallen)
export function datesToIso(dates) {
  const list = (dates || [])
    .filter(Boolean)
    .map(v => new Date(v))
    .filter(d => !isNaN(d))
    .map(d => d.getTime())
  return [...new Set(list)].sort((a, b) => a - b).map(ms => new Date(ms).toISOString())
}
