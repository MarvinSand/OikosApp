import { DATE_PRESETS } from '../../lib/dateFilter'
import MiniCalendar from './MiniCalendar'

// Reusable date-range filter: preset chips + a mini calendar for custom ranges.
// value: { preset, from, to }   onChange(nextValue)
export default function DateFilterControl({ value, onChange }) {
  const preset = value?.preset || 'all'

  function pick(key) {
    if (key === 'custom') {
      onChange({ preset: 'custom', from: value?.from || null, to: value?.to || null })
    } else {
      onChange({ preset: key, from: null, to: null })
    }
  }

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>
        Zeitraum
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DATE_PRESETS.map(p => {
          const active = preset === p.key
          return (
            <button
              key={p.key}
              onClick={() => pick(p.key)}
              style={{
                padding: '6px 11px', borderRadius: 999,
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                backgroundColor: active ? 'rgba(74,103,65,0.12)' : 'var(--color-bg-secondary)',
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {preset === 'custom' && (
        <MiniCalendar
          value={{ from: value?.from || null, to: value?.to || null }}
          onChange={({ from, to }) => onChange({ preset: 'custom', from, to })}
        />
      )}
    </div>
  )
}
