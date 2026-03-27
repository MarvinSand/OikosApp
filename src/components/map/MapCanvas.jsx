export default function MapCanvas({ userName, people, onPersonClick }) {
  const n = people.length
  const ringRadius = n === 0 ? 150 : Math.max(150, n * 18)
  const pad = 70
  const vbSize = ringRadius * 2 + pad * 2
  const cx = vbSize / 2
  const cy = vbSize / 2
  const userR = 48
  const personR = 38

  function getPos(index) {
    const angle = (index * 2 * Math.PI / Math.max(n, 1)) - Math.PI / 2
    return {
      x: cx + ringRadius * Math.cos(angle),
      y: cy + ringRadius * Math.sin(angle),
    }
  }

  function shortName(name) {
    if (!name) return '?'
    const first = name.trim().split(' ')[0]
    return first.length > 9 ? first.slice(0, 8) + '…' : first
  }

  return (
    <svg
      viewBox={`0 0 ${vbSize} ${vbSize}`}
      style={{ width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gestrichelter Ring um Zentrum */}
      <circle
        cx={cx} cy={cy}
        r={userR + 20}
        fill="none"
        stroke="var(--color-warm-3)"
        strokeWidth={1.2}
        strokeDasharray="5 5"
      />

      {/* Verbindungslinien */}
      {people.map((p, i) => {
        const pos = getPos(i)
        return (
          <line
            key={p.id + '_line'}
            x1={cx} y1={cy}
            x2={pos.x} y2={pos.y}
            stroke="var(--color-warm-3)"
            strokeWidth={1.5}
          />
        )
      })}

      {/* Zentrum – User */}
      <circle cx={cx} cy={cy} r={userR} fill="var(--color-warm-1)" />
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dy="0.35em"
        fill="#FFFDF8"
        fontSize={13}
        fontFamily="Lora, Georgia, serif"
        fontWeight="600"
      >
        {shortName(userName)}
      </text>

      {/* Personen */}
      {people.map((p, i) => {
        const pos = getPos(i)
        const stageColor = p.impact_stage >= 5
          ? 'var(--color-accent)'
          : p.impact_stage >= 3
            ? 'var(--color-gold)'
            : 'var(--color-warm-1)'

        return (
          <g key={p.id} onClick={() => onPersonClick(p)} style={{ cursor: 'pointer' }}>
            <circle
              cx={pos.x} cy={pos.y}
              r={personR}
              fill="var(--color-warm-4)"
              stroke="var(--color-warm-3)"
              strokeWidth={1.5}
            />
            {/* Stufen-Bogen */}
            <circle
              cx={pos.x} cy={pos.y}
              r={personR}
              fill="none"
              stroke={stageColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${(p.impact_stage / 6) * 2 * Math.PI * personR} 1000`}
              transform={`rotate(-90 ${pos.x} ${pos.y})`}
              opacity={0.8}
            />
            <text
              x={pos.x} y={pos.y}
              textAnchor="middle"
              dy="0.35em"
              fill="var(--color-text)"
              fontSize={10}
              fontFamily="Lora, Georgia, serif"
            >
              {shortName(p.name)}
            </text>
          </g>
        )
      })}

      {/* Leerer Zustand */}
      {n === 0 && (
        <text
          x={cx} y={cy + userR + 44}
          textAnchor="middle"
          fill="var(--color-text-light)"
          fontSize={12}
          fontFamily="Lora, Georgia, serif"
          fontStyle="italic"
        >
          Tippe „+ Person" um zu beginnen
        </text>
      )}
    </svg>
  )
}
