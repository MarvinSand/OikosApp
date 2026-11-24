import { Plus, X } from 'lucide-react'
import { useT } from '../../i18n'

// Weitere Einzeltermine für ein Event (recurrence_freq = 'custom').
// `dates` = [{ start, end }] mit lokalen datetime-local-Strings; der erste Termin
// steht in Beginn/Ende des Formulars. Jeder Termin hat eigenen Beginn und eigenes Ende.
function toLocalInput(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function CustomDatesEditor({ dates, onChange, startsAt, endsAt, C, inputStyle }) {
  const { t } = useT()

  function add() {
    const last = dates.length ? dates[dates.length - 1] : { start: startsAt, end: endsAt }
    const shift = (v) => {
      if (!v) return ''
      const d = new Date(v)
      d.setDate(d.getDate() + 7)
      return toLocalInput(d)
    }
    onChange([...dates, { start: shift(last.start), end: shift(last.end) }])
  }

  function patch(i, key, value) {
    onChange(dates.map((d, j) => (j === i ? { ...d, [key]: value } : d)))
  }

  const labelS = { fontSize: 11, color: C.textSec, margin: '0 0 3px' }

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: C.bgSec, border: `1px solid ${C.border}` }}>
      <p style={{ fontSize: 12, color: C.textSec, margin: '0 0 10px', lineHeight: 1.5 }}>
        {t('Der erste Termin ist oben. Hier kommen weitere dazu – das Event und sein Chat bleiben bestehen.')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dates.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={labelS}>{t('Beginn')}</p>
                <input type="datetime-local" value={d.start} onChange={e => patch(i, 'start', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={labelS}>{t('Ende')}</p>
                <input type="datetime-local" value={d.end} min={d.start || undefined} onChange={e => patch(i, 'end', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(dates.filter((_, j) => j !== i))}
              aria-label={t('Termin entfernen')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textTer, padding: 6, marginTop: 18, display: 'flex' }}
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
          marginTop: dates.length ? 12 : 0, width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          border: `1.5px dashed ${C.accent}`, background: 'transparent', color: C.accentDark,
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <Plus size={15} /> {t('Termin hinzufügen')}
      </button>
    </div>
  )
}

// Lokale Eingaben → [{ start, end }] als ISO, sortiert, ohne Duplikate.
// Leerer/ungültiger Beginn entfällt; ein Ende vor dem Beginn wird verworfen.
export function datesToIso(dates) {
  const seen = new Map()
  for (const d of dates || []) {
    const s = d?.start ? new Date(d.start) : null
    if (!s || isNaN(s)) continue
    const e = d.end ? new Date(d.end) : null
    seen.set(s.getTime(), { start: s.toISOString(), end: e && !isNaN(e) && e > s ? e.toISOString() : null })
  }
  return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
}

// Prüft, ob bei einem Termin das Ende vor/gleich dem Beginn liegt
export function hasInvalidSlot(dates) {
  return (dates || []).some(d => d?.start && d?.end && new Date(d.end) <= new Date(d.start))
}
