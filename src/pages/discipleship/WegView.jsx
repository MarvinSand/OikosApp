import { useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'
import PathSvg from '../../components/discipleship/PathSvg'
import StationNode from '../../components/discipleship/StationNode'
import ChallengeSideNode from '../../components/discipleship/ChallengeSideNode'
import { useDiscipleshipPath } from '../../hooks/useDiscipleshipPath'

const ROW_HEIGHT = 168
const TOP_PADDING = 70
const X_LEFT = 24
const X_RIGHT = 76
const CHALLENGE_OFFSET_X = 22

// Der Weg verläuft visuell von unten (Station 1) nach oben (Station 15 =
// "Wachsen & Senden"), Stationen alternieren links/rechts im Zickzack.
// Layout-Koordinaten sind bewusst fest berechnet (kein DOM-Messen nötig) -
// dieselben x/y-Werte steuern sowohl die SVG-Kurve als auch die absolut
// positionierten Knoten, dadurch bleiben sie exakt deckungsgleich.
export default function WegView() {
  const navigate = useNavigate()
  const { stations, loading, stateFor, challengeStateFor, challengesByStation, openChallengeCount } = useDiscipleshipPath()
  const activeNodeRef = useRef(null)
  const scrolledRef = useRef(false)

  const totalHeight = TOP_PADDING * 2 + Math.max(stations.length - 1, 0) * ROW_HEIGHT

  const layout = useMemo(() => {
    return stations.map((s, idx) => {
      const y = totalHeight - TOP_PADDING - idx * ROW_HEIGHT
      const x = idx % 2 === 0 ? X_LEFT : X_RIGHT
      return { station: s, x, y }
    })
  }, [stations, totalHeight])

  const challengeLayout = useMemo(() => {
    const out = []
    for (const { station, x, y } of layout) {
      const challenges = challengesByStation[station.id] || []
      const state = stateFor(station)
      challenges.forEach((c, i) => {
        const side = x < 50 ? -1 : 1
        out.push({
          challenge: c,
          state: challengeStateFor(c, state),
          fromX: x, fromY: y,
          x: x + side * (CHALLENGE_OFFSET_X + i * 10),
          y: y - 34,
        })
      })
    }
    return out
  }, [layout, challengesByStation, stateFor, challengeStateFor])

  useEffect(() => {
    if (scrolledRef.current || loading || !activeNodeRef.current) return
    activeNodeRef.current.scrollIntoView({ block: 'center' })
    scrolledRef.current = true
  }, [loading])

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active="/juengerschaft" />

      {!loading && openChallengeCount > 0 && (
        <button
          onClick={() => navigate('/juengerschaft/challenges')}
          className="w-full flex items-center gap-2 px-4 py-3"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', textAlign: 'left' }}
        >
          <AlertCircle size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Du hast {openChallengeCount} offene {openChallengeCount === 1 ? 'Challenge' : 'Challenges'}
          </span>
        </button>
      )}

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
            challengeLines={challengeLayout}
            totalHeight={totalHeight}
          />
          {challengeLayout.map(cl => (
            <ChallengeSideNode
              key={cl.challenge.id}
              challenge={cl.challenge}
              state={cl.state}
              x={cl.x}
              y={cl.y}
              onOpen={() => navigate(`/juengerschaft/challenges/${cl.challenge.id}`)}
            />
          ))}
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
                onOpen={s => navigate(`/juengerschaft/station/${s.slug}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
