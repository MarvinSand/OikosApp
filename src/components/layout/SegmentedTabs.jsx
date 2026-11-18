// Wiederverwendbare Premium-Segmented-Control (Pillen-Optik).
// tabs: [{ key, label, icon? }] – icon ist eine lucide-Komponente.
// active: aktueller key · onSelect(key)
// stacked: Icon über dem Label (kompakt, für 4–5 Tabs).
// synced: Indikator folgt der CSS-Variable --pager-progress (siehe SwipePager).
export default function SegmentedTabs({ tabs, active, onSelect, style, synced = false, stacked = false }) {
  const n = tabs.length
  const activeIndex = Math.max(0, tabs.findIndex(t => t.key === active))
  return (
    <div
      style={{
        position: 'relative', display: 'flex', gap: 4, padding: 4,
        borderRadius: 14, backgroundColor: 'var(--color-bg-secondary)',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute', top: 4, bottom: 4, left: 4, pointerEvents: 'none',
          width: `calc((100% - ${8 + 4 * (n - 1)}px) / ${n})`,
          borderRadius: 11, backgroundColor: 'var(--color-bg)',
          boxShadow: '0 2px 8px rgba(58,46,36,0.10)',
          transform: `translateX(calc(${synced ? `var(--pager-progress, ${activeIndex})` : activeIndex} * (100% + 4px)))`,
          transition: synced ? 'var(--pager-transition, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1))' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      />
      {tabs.map(t => {
        const isActive = t.key === active
        const Icon = t.icon
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            aria-pressed={isActive}
            style={{
              position: 'relative', zIndex: 1,
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: stacked ? 'column' : 'row', gap: stacked ? 3 : 6,
              padding: stacked ? '8px 2px' : '9px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
              fontFamily: 'Lora, serif', fontSize: stacked ? 11 : 14, fontWeight: isActive ? 700 : 600,
              letterSpacing: '-0.01em', lineHeight: stacked ? 1.1 : undefined,
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              transition: 'color 0.2s',
            }}
          >
            {Icon && <Icon size={stacked ? 18 : 16} strokeWidth={isActive ? 2.4 : 2} />}
            {stacked
              ? <span style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
              : t.label}
          </button>
        )
      })}
    </div>
  )
}
