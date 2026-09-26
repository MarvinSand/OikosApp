// ─── ProgressBar ──────────────────────────────────────────────
// Wiederverwendbarer Fortschrittsbalken für Gebetsziele u.a.
// Stunden-Ziele speichern current_value als Bruchteil einer Stunde
// (`round(minutes/60, 1)`, siehe contribute_to_prayer_goal-RPC). Unter einer
// vollen Stunde liest sich "0,1 Std" wie ein kaputter Wert (Dezimalstunden
// sind hierzulande unüblich) - darunter zeigen wir stattdessen die Minuten.
function formatAmount(n, unitLabel) {
  if (unitLabel === 'Std' && n > 0 && n < 1) return `${Math.round(n * 60)} Min`
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10
  return `${rounded.toLocaleString('de-DE')}${unitLabel ? ` ${unitLabel}` : ''}`
}

export default function ProgressBar({ value = 0, target = 1, color = 'var(--color-accent)', height = 10, showLabel = true, unitLabel = '' }) {
  const safeTarget = target > 0 ? target : 1
  const pct = Math.min(100, Math.round((value / safeTarget) * 100))

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
            {formatAmount(value, unitLabel)} / {formatAmount(safeTarget, unitLabel)}
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
