import { useRef, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'
import PathSvg from '../../components/discipleship/PathSvg'
import StationNode from '../../components/discipleship/StationNode'
import { useDiscipleshipPath } from '../../hooks/useDiscipleshipPath'

const ROW_HEIGHT = 168
const TOP_PADDING = 70
const X_LEFT = 24
const X_RIGHT = 76

// Der Bible Study-Pfad verläuft visuell von unten (Station 1) nach oben
// (Station 15 = "Wachsen & Senden"), Stationen alternieren links/rechts im
// Zickzack. Layout-Koordinaten sind bewusst fest berechnet (kein
// DOM-Messen nötig) - dieselben x/y-Werte steuern sowohl die SVG-Kurve als
// auch die absolut positionierten Knoten, dadurch bleiben sie exakt
// deckungsgleich.
export default function WegView() {
  const navigate = useNavigate()
  const { stations, loading, stateFor } = useDiscipleshipPath()
  const activeNodeRef = useRef(null)
  const scrolledRef = useRef(false)
  const [previewStation, setPreviewStation] = useState(null)

  const totalHeight = TOP_PADDING * 2 + Math.max(stations.length - 1, 0) * ROW_HEIGHT

  const layout = useMemo(() => {
    return stations.map((s, idx) => {
      const y = totalHeight - TOP_PADDING - idx * ROW_HEIGHT
      const x = idx % 2 === 0 ? X_LEFT : X_RIGHT
      return { station: s, x, y }
    })
  }, [stations, totalHeight])

  useEffect(() => {
    if (scrolledRef.current || loading || !activeNodeRef.current) return
    activeNodeRef.current.scrollIntoView({ block: 'center' })
    scrolledRef.current = true
  }, [loading])

  function handleOpen(station, state) {
    if (state === 'locked') {
      setPreviewStation(station)
      return
    }
    navigate(`/juengerschaft/station/${station.slug}`)
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active="/juengerschaft" />

      {loading && (
        <p className="text-center py-10" style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>
      )}

      {!loading && (
        <div
          className="relative"
          style={{ height: totalHeight, paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
        >
          <PathSvg
            stationPoints={layout.map(l => ({ x: l.x, y: l.y }))}
            challengeLines={[]}
            totalHeight={totalHeight}
          />
          {layout.map(({ station, x, y }) => {
            const state = stateFor(station)
            return (
              <StationNode
                key={station.id}
                station={station}
                state={state}
                x={x}
                y={y}
                nodeRef={state === 'active' ? activeNodeRef : undefined}
                onOpen={s => handleOpen(s, state)}
              />
            )
          })}
        </div>
      )}

      {previewStation && (
        <StationPreview station={previewStation} onClose={() => setPreviewStation(null)} />
      )}
    </div>
  )
}

function StationPreview({ station, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
          backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', zIndex: 50,
          padding: '20px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <p className="font-bold" style={{ fontFamily: 'Lora, serif', fontSize: 18, color: 'var(--color-text)' }}>{station.title}</p>
          <button onClick={onClose} className="p-1 -mr-1 -mt-1 flex-shrink-0"><X size={18} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>
        <p className="mb-3" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-accent)' }}>{station.bible_reference}</p>
        {station.content_head?.intro && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{station.content_head.intro}</p>
        )}
        <p className="mt-4" style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>
          Diese Station schaltet sich frei, sobald die vorherige abgeschlossen ist.
        </p>
      </div>
    </>
  )
}
