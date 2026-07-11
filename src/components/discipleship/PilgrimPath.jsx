import StationNode from './StationNode'

const WIDTH = 400
const STEP = 190
const TOP_PAD = 100
const BOTTOM_PAD = 140

// Datengetriebener, vertikaler Bezier-Pfad: Station 0 (erste Stufe) unten,
// letzte Station oben. Höhe skaliert automatisch mit der Anzahl Stationen.
export default function PilgrimPath({ stations, onStationClick }) {
  if (!stations.length) return null

  const totalH = TOP_PAD + BOTTOM_PAD + (stations.length - 1) * STEP

  const points = stations.map((station, i) => ({
    x: i % 2 === 0 ? 130 : 270,
    y: totalH - BOTTOM_PAD - i * STEP,
    station,
  }))

  let solidD = `M ${points[0].x} ${totalH} L ${points[0].x} ${points[0].y}`
  let dashedD = ''

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const midY = (a.y + b.y) / 2
    const seg = ` C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`
    if (a.station.status === 'done') {
      solidD += seg
    } else {
      if (!dashedD) dashedD = `M ${a.x} ${a.y}`
      dashedD += seg
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: totalH }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${totalH}`}
        width="100%"
        height={totalH}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
        aria-hidden="true"
      >
        {dashedD && (
          <path
            d={dashedD}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="5"
            strokeDasharray="2 13"
            strokeLinecap="round"
          />
        )}
        <path d={solidD} fill="none" stroke="#E8B33C" strokeWidth="5" strokeLinecap="round" />
      </svg>

      {points.map(({ x, y, station }) => (
        <div
          key={station.id}
          data-station-status={station.status}
          style={{ position: 'absolute', left: `${(x / WIDTH) * 100}%`, top: y, transform: 'translate(-50%, -50%)' }}
        >
          <StationNode station={station} onClick={() => onStationClick(station)} />
        </div>
      ))}
    </div>
  )
}
