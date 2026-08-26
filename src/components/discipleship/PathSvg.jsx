// Reine Darstellungskomponente: zeichnet die geschwungene Bézier-Linie
// zwischen den Stationsknoten (x in % der Breite, y in px, aufsteigend nach
// order_index sortiert = von unten nach oben) sowie gestrichelte
// Abzweigungen zu Challenge-Seitenknoten. Positionierung der eigentlichen
// Knoten übernimmt WegView (dieselben Koordinaten, als absolut positionierte
// HTML-Elemente über dieser SVG-Ebene).
export default function PathSvg({ stationPoints, challengeLines, totalHeight }) {
  if (!stationPoints.length) return null

  let mainPath = `M ${stationPoints[0].x} ${stationPoints[0].y}`
  for (let i = 1; i < stationPoints.length; i++) {
    const prev = stationPoints[i - 1]
    const curr = stationPoints[i]
    const midY = (prev.y + curr.y) / 2
    mainPath += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`
  }

  return (
    <svg
      width="100%"
      height={totalHeight}
      viewBox={`0 0 100 ${totalHeight}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <path d={mainPath} fill="none" stroke="var(--color-border)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      {challengeLines.map((l, i) => (
        <path
          key={i}
          d={`M ${l.fromX} ${l.fromY} L ${l.x} ${l.y}`}
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth="1"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
