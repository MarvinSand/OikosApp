// Schalter der Systemkarte „Meine Geschwister in Christus":
// Generationen (Freunde von Freunden), Verbindungen zwischen Freunden, Communities.
const DEPTHS = [[1, 'Verbundene'], [2, '+ Freunde von Freunden'], [3, '+ 3. Generation']]

function Pill({ active, onClick, children, label }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="rounded-full border-none px-3 py-1.5 font-serif text-[12px] font-medium cursor-pointer whitespace-nowrap transition-colors"
      style={{
        background: active ? 'var(--color-warm-1)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary)',
      }}
    >
      {children}
    </button>
  )
}

export default function SiblingsToggles({
  depth, onDepth, showEdges, onShowEdges, showCommunities, onShowCommunities, hasCommunities = true,
}) {
  const box = 'flex items-center gap-1 rounded-full border border-warm-3 bg-paper/90 p-1 shadow-md backdrop-blur-md'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={box} role="group" aria-label="Freunde von Freunden einblenden">
        {DEPTHS.map(([d, label]) => (
          <Pill key={d} active={depth === d} onClick={() => onDepth(d)}>{label}</Pill>
        ))}
      </div>
      <div className={box} role="group" aria-label="Anzeige">
        <Pill active={showEdges} onClick={() => onShowEdges(!showEdges)} label="Verbindungen untereinander">
          Verbindungen
        </Pill>
        {hasCommunities && (
          <Pill active={showCommunities} onClick={() => onShowCommunities(!showCommunities)} label="Communities einblenden">
            Communities
          </Pill>
        )}
      </div>
    </div>
  )
}
