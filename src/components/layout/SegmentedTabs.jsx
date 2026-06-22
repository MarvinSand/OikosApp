// Wiederverwendbare Premium-Segmented-Control (Pillen-Optik).
// tabs: [{ key, label, icon? }] – icon ist eine lucide-Komponente.
// active: aktueller key · onSelect(key)
export default function SegmentedTabs({ tabs, active, onSelect, style }) {
  return (
    <div
      style={{
        display: 'flex', gap: 4, padding: 4,
        borderRadius: 14, backgroundColor: 'var(--color-bg-secondary)',
        ...style,
      }}
    >
      {tabs.map(t => {
        const isActive = t.key === active
        const Icon = t.icon
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            aria-pressed={isActive}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
              fontFamily: 'Lora, serif', fontSize: 14, fontWeight: isActive ? 700 : 600,
              letterSpacing: '-0.01em',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg)' : 'transparent',
              boxShadow: isActive ? '0 2px 8px rgba(58,46,36,0.10)' : 'none',
              transition: 'color 0.2s, background-color 0.2s, box-shadow 0.2s',
            }}
          >
            {Icon && <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
