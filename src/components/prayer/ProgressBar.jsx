// ─── ProgressBar ──────────────────────────────────────────────
// Wiederverwendbarer Fortschrittsbalken für Gebetsziele u.a.
export default function ProgressBar({ value = 0, target = 1, color = 'var(--color-accent)', height = 10, showLabel = true, unitLabel = '' }) {
  const safeTarget = target > 0 ? target : 1
  const pct = Math.min(100, Math.round((value / safeTarget) * 100))
  const formattedValue = Number.isInteger(value) ? value : Math.round(value * 10) / 10
  const formattedTarget = Number.isInteger(safeTarget) ? safeTarget : Math.round(safeTarget * 10) / 10

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
            {formattedValue.toLocaleString('de-DE')} / {formattedTarget.toLocaleString('de-DE')}{unitLabel ? ` ${unitLabel}` : ''}
          </span>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color }}>
            {pct}%
          </span>
        </div>
      )}
      <div style={{
        width: '100%', height, borderRadius: height, overflow: 'hidden',
        backgroundColor: 'var(--color-warm-4)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: height,
          background: `linear-gradient(90deg, ${color}, ${color}CC)`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}
