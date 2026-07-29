import { useState, useRef, useEffect } from 'react'
import { Flag, Bell, Info, BookOpen, X, Check } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Jüngerschaft Paul – Pilgerweg als Schlängellinie von unten nach oben.
// Selbst-enthaltend (keine DB nötig) – Inhalte hier editierbar.
// type: 'challenge' | 'erinnerung' | 'erklaerung' | 'bibelvers'
// Reihenfolge: Index 0 = Start (unten), letzter Eintrag = oben.
// ─────────────────────────────────────────────────────────────
const STATIONS = [
  { id: 's1',  type: 'erklaerung', title: 'Willkommen',            text: 'Dein Weg im Glauben beginnt hier. Scrolle nach oben und gehe Schritt für Schritt weiter – jeder Punkt ist eine Station.' },
  { id: 's2',  type: 'bibelvers',  title: 'Johannes 3,16',         verse: 'Denn so sehr hat Gott die Welt geliebt, dass er seinen eingeborenen Sohn gab, damit jeder, der an ihn glaubt, nicht verloren geht, sondern ewiges Leben hat.', text: 'Der wohl bekannteste Vers – das Herz des Evangeliums. Was bedeutet „geliebt" für dich ganz persönlich?' },
  { id: 's3',  type: 'challenge',  title: 'Erste Challenge',       text: 'Nimm dir heute 5 Minuten Stille. Sprich mit Gott, als würdest du mit einem Freund reden – ganz ehrlich, ohne feste Worte.' },
  { id: 's4',  type: 'erinnerung', title: 'Erinnerung',            text: 'Gott begegnet dir im Alltag. Achte heute bewusst auf einen Moment, in dem du seine Nähe spürst.' },
  { id: 's5',  type: 'erklaerung', title: 'Was ist Gebet?',        text: 'Gebet ist Gespräch mit Gott – Danken, Bitten, Klagen, Hören. Es braucht keine perfekten Worte, nur ein offenes Herz.' },
  { id: 's6',  type: 'bibelvers',  title: 'Philipper 4,6-7',       verse: 'Sorgt euch um nichts, sondern bringt in allem eure Anliegen im Gebet und Flehen mit Danksagung vor Gott.', text: 'Ein Vers gegen die Sorge. Schreib dir eine Sache auf, die du heute bewusst „abgibst".' },
  { id: 's7',  type: 'challenge',  title: 'Dankbarkeit',           text: 'Notiere heute Abend drei Dinge, für die du dankbar bist. Wiederhole das eine Woche lang.' },
  { id: 's8',  type: 'erklaerung', title: 'Die Bibel lesen',       text: 'Fang klein an: ein Kapitel aus einem Evangelium (z.B. Markus). Frag dich: Was sagt es über Gott? Was über mich? Was tue ich damit?' },
  { id: 's9',  type: 'erinnerung', title: 'Du bist nicht allein',  text: 'Glaube wächst in Gemeinschaft. Wer sind Menschen, mit denen du deinen Weg teilen kannst?' },
  { id: 's10', type: 'bibelvers',  title: 'Matthäus 28,19',        verse: 'Geht nun hin und macht alle Nationen zu Jüngern und tauft sie und lehrt sie alles halten, was ich euch geboten habe.', text: 'Der Missionsauftrag. Jünger werden – und Jünger machen. Für wen betest du, dass er Jesus kennenlernt?' },
]

const TYPE_META = {
  challenge:  { icon: Flag,     label: 'Challenge',  color: '#E8B33C', tint: 'rgba(232,179,60,0.14)' },
  erinnerung: { icon: Bell,     label: 'Erinnerung', color: '#34C759', tint: 'rgba(52,199,89,0.14)' },
  erklaerung: { icon: Info,     label: 'Erklärung',  color: '#5AC8FA', tint: 'rgba(90,200,250,0.16)' },
  bibelvers:  { icon: BookOpen, label: 'Bibelvers',  color: '#0A84FF', tint: 'rgba(10,132,255,0.14)' },
}

const VIEW_W = 400
const STEP = 180        // vertikaler Abstand zwischen Stationen
const TOP_PAD = 90
const BOTTOM_PAD = 120
const LEFT_X = 128
const RIGHT_X = 272

export default function PaulPathScreen() {
  const [active, setActive] = useState(null)   // ausgewählte Station
  const [done, setDone] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('paul_path_done') || '[]')) } catch { return new Set() }
  })
  const scrollRef = useRef(null)

  // Beim Öffnen ans untere Ende (Start) scrollen
  useEffect(() => {
    const el = scrollRef.current?.closest('.overflow-y-auto') || scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  function markDone(id) {
    setDone(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem('paul_path_done', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const n = STATIONS.length
  const totalH = TOP_PAD + BOTTOM_PAD + (n - 1) * STEP

  // Punkte: Index 0 unten, letzter oben; x abwechselnd links/rechts
  const points = STATIONS.map((station, i) => ({
    x: i % 2 === 0 ? LEFT_X : RIGHT_X,
    y: totalH - BOTTOM_PAD - i * STEP,
    station,
  }))

  // Bezier-Pfad, der sich zwischen den Punkten schlängelt
  let d = `M ${points[0].x} ${totalH} L ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1]
    const midY = (a.y + b.y) / 2
    d += ` C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`
  }

  return (
    <div ref={scrollRef} style={{ position: 'relative', backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Kopf */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5, padding: '16px 18px 12px',
        backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          Jüngerschaft Paul
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: '3px 0 0' }}>
          Dein Weg im Glauben – Schritt für Schritt nach oben.
        </p>
      </div>

      {/* Weg */}
      <div style={{ position: 'relative', width: '100%', height: totalH }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${totalH}`}
          width="100%" height={totalH}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden="true"
        >
          {/* Untergrund-Linie */}
          <path d={d} fill="none" stroke="var(--color-border)" strokeWidth="10" strokeLinecap="round" />
          {/* Akzent-Linie */}
          <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 14" opacity="0.9" />
        </svg>

        {points.map(({ x, y, station }) => {
          const meta = TYPE_META[station.type]
          const Icon = meta.icon
          const isDone = done.has(station.id)
          return (
            <div key={station.id} style={{
              position: 'absolute', left: `${(x / VIEW_W) * 100}%`, top: y,
              transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 7, width: 150,
            }}>
              <button
                onClick={() => setActive(station)}
                className="press-scale"
                aria-label={station.title}
                style={{
                  width: 58, height: 58, borderRadius: '50%', cursor: 'pointer',
                  backgroundColor: isDone ? meta.color : 'var(--color-bg)',
                  border: `3px solid ${meta.color}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isDone ? '#fff' : meta.color,
                }}
              >
                {isDone ? <Check size={26} strokeWidth={3} /> : <Icon size={24} />}
              </button>
              <div style={{
                padding: '4px 10px', borderRadius: 999, textAlign: 'center',
                backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: 11.5, fontWeight: 700, lineHeight: 1.25,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}>
                {station.title}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail-Sheet */}
      {active && (
        <StationSheet
          station={active}
          done={done.has(active.id)}
          onDone={() => { markDone(active.id); setActive(null) }}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}

function StationSheet({ station, done, onDone, onClose }) {
  const meta = TYPE_META[station.type]
  const Icon = meta.icon
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
    >
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0',
        padding: '18px 20px 40px', maxHeight: '85vh', overflowY: 'auto',
        animation: 'sheetSlideUp 0.25s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999, backgroundColor: meta.tint,
            color: meta.color, fontSize: 12, fontWeight: 700,
          }}>
            <Icon size={14} /> {meta.label}
          </span>
          <button onClick={onClose} aria-label="Schließen" style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none',
            backgroundColor: 'var(--color-bg-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)',
          }}>
            <X size={16} />
          </button>
        </div>

        <h2 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 10px' }}>
          {station.title}
        </h2>

        {station.verse && (
          <p style={{
            fontFamily: 'Lora, serif', fontSize: 15, fontStyle: 'italic', lineHeight: 1.6,
            color: 'var(--color-text)', margin: '0 0 12px', paddingLeft: 12,
            borderLeft: `3px solid ${meta.color}`,
          }}>
            „{station.verse}"
          </p>
        )}

        <p style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 22px' }}>
          {station.text}
        </p>

        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            backgroundColor: done ? 'var(--color-bg-secondary)' : 'var(--color-accent)',
            color: done ? 'var(--color-text-secondary)' : '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {done ? <><Check size={17} /> Erledigt</> : 'Als erledigt markieren'}
        </button>
      </div>
    </div>
  )
}
