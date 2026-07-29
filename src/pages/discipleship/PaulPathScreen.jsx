import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Bell, Info, BookOpen, HandHeart, MapPin, X, Check } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Jüngerschaft Paul – der Weg im Glauben als Schlängellinie von unten nach oben.
// Er beginnt beim ersten Schritt (gerade zu Gott gefunden) und endet nie:
// nach dem kuratierten Anfang kommen immer wieder Erinnerungen, Challenges
// und Glaubensbekenntnisse, um den Glauben zu festigen.
//
// type: 'bibelvers' | 'challenge' | 'erinnerung' | 'erklaerung' | 'bekenntnis'
// mapLink: true  → Station ist mit der Oikos Map verbunden (Button im Sheet)
// chapter: string → markiert den Beginn eines neuen Kapitels (Band auf dem Weg)
// Reihenfolge: Index 0 = Start (ganz unten), höherer Index = weiter oben.
// ─────────────────────────────────────────────────────────────

// ── Kuratierter Weg: der Anfang der Jüngerschaft ─────────────
const CURATED = [
  // Kapitel 1 – Neu angefangen: zu Gott gefunden
  { chapter: 'Kapitel 1 · Neu angefangen', type: 'erklaerung', title: 'Willkommen zu Hause',
    text: 'Du hast zu Gott gefunden – das ist der Anfang von allem. Dieser Weg begleitet dich Schritt für Schritt. Tippe auf jeden Punkt, gehe nach oben weiter. Er endet nie – der Glaube wächst ein Leben lang.' },
  { type: 'bibelvers', title: 'Der verlorene Sohn', verse: 'Dieser mein Sohn war tot und ist wieder lebendig geworden, er war verloren und ist gefunden worden. Und sie fingen an, fröhlich zu sein.', ref: 'Lukas 15,24',
    text: 'Egal, wo du herkommst – der Vater rennt dir entgegen und feiert deine Rückkehr. So sehr freut sich Gott über dich. Du musst dir seine Liebe nicht verdienen.' },
  { type: 'bibelvers', title: 'So sehr geliebt', verse: 'Denn so sehr hat Gott die Welt geliebt, dass er seinen eingeborenen Sohn gab, damit jeder, der an ihn glaubt, nicht verloren geht, sondern ewiges Leben hat.', ref: 'Johannes 3,16',
    text: 'Das Herz des Evangeliums. Gottes Liebe zu dir hängt nicht an deiner Leistung, sondern an seinem Wesen.' },
  { type: 'challenge', title: 'Dein erstes ehrliches Gebet', text: 'Nimm dir heute 5 Minuten Stille. Rede mit Gott wie mit einem Freund – ganz ehrlich, ohne feste Worte. Danke ihm, dass du nach Hause gefunden hast.' },
  { type: 'bekenntnis', title: 'Ich gehöre zu Jesus', verse: 'Wenn du mit deinem Mund Jesus als Herrn bekennst und in deinem Herzen glaubst, dass Gott ihn aus den Toten auferweckt hat, so wirst du gerettet werden.', ref: 'Römer 10,9',
    text: 'Sprich es laut aus: „Jesus ist mein Herr. Er ist für mich gestorben und auferstanden. Ich gehöre zu ihm." Ein Bekenntnis festigt, was im Herzen begonnen hat.' },

  // Kapitel 2 – Die Taufe
  { chapter: 'Kapitel 2 · Die Taufe', type: 'erklaerung', title: 'Warum Taufe?',
    text: 'Die Taufe ist dein öffentliches Ja zu Jesus – ein sichtbares Zeichen: Das alte Leben ist begraben, ein neues beginnt. Sie rettet dich nicht, aber sie ist der erste Gehorsamsschritt als Nachfolger.' },
  { type: 'bibelvers', title: 'Mit ihm begraben', verse: 'So sind wir nun mit ihm begraben worden durch die Taufe in den Tod, damit, wie Christus aus den Toten auferweckt worden ist, so auch wir in Neuheit des Lebens wandeln.', ref: 'Römer 6,4',
    text: 'Untertauchen und Auftauchen: Das alte Ich stirbt, ein neues Leben beginnt. Taufe erzählt genau diese Geschichte.' },
  { type: 'bibelvers', title: 'Tut Buße und lasst euch taufen', verse: 'Petrus aber sprach zu ihnen: Tut Buße, und jeder von euch lasse sich taufen auf den Namen Jesu Christi zur Vergebung eurer Sünden!', ref: 'Apostelgeschichte 2,38',
    text: 'Von Anfang an gehörten Umkehr und Taufe zusammen. Es ist ein normaler, freudiger Schritt der Nachfolge.' },
  { type: 'challenge', title: 'Sprich über die Taufe', text: 'Rede mit einem reifen Christen oder deiner Gemeinde über deine Taufe. Wenn du noch nicht getauft bist: Mach den nächsten Schritt und frag nach, wie es bei euch geht.' },

  // Kapitel 3 – Deine Identität in Christus
  { chapter: 'Kapitel 3 · Deine Identität', type: 'bibelvers', title: 'Eine neue Schöpfung', verse: 'Wenn also jemand in Christus ist, so ist er eine neue Schöpfung; das Alte ist vergangen, siehe, Neues ist geworden.', ref: '2. Korinther 5,17',
    text: 'Du bist nicht mehr definiert durch deine Vergangenheit, deine Fehler oder die Meinung anderer. In Christus bist du neu.' },
  { type: 'bibelvers', title: 'Kind Gottes', verse: 'Allen aber, die ihn aufnahmen, gab er das Recht, Kinder Gottes zu werden, denen, die an seinen Namen glauben.', ref: 'Johannes 1,12',
    text: 'Deine tiefste Identität: geliebtes Kind des Vaters. Nicht Angestellter, nicht Fremder – Kind.' },
  { type: 'erinnerung', title: 'Geliebt, nicht wegen Leistung', text: 'Erinnere dich heute bewusst: Gott liebt dich nicht mehr, wenn du mehr tust, und nicht weniger, wenn du fällst. Seine Liebe ist der Grund, nicht der Lohn.' },
  { type: 'bekenntnis', title: 'Wer ich in Christus bin', text: 'Sprich aus: „Ich bin geliebt. Ich bin vergeben. Ich bin ein Kind Gottes. Ich bin eine neue Schöpfung. Nichts kann mich von seiner Liebe trennen." Wiederhole es, bis dein Herz es glaubt.' },

  // Kapitel 4 – Liebe & Gnade leben
  { chapter: 'Kapitel 4 · Gnade & Liebe leben', type: 'bibelvers', title: 'Aus Gnade gerettet', verse: 'Denn aus Gnade seid ihr gerettet durch Glauben, und das nicht aus euch – Gottes Gabe ist es; nicht aus Werken, damit niemand sich rühme.', ref: 'Epheser 2,8-9',
    text: 'Gnade heißt: geschenkt, nicht verdient. Nimm sie täglich neu an, gerade an den Tagen, an denen du dich unwürdig fühlst.' },
  { type: 'bibelvers', title: 'Das neue Gebot', verse: 'Ein neues Gebot gebe ich euch, dass ihr euch untereinander liebt, damit, wie ich euch geliebt habe, auch ihr einander liebt.', ref: 'Johannes 13,34-35',
    text: 'Woran die Welt erkennt, dass wir Jesus gehören: an der Liebe. Nicht an Meinungen, sondern an gelebter Liebe.' },
  { type: 'erinnerung', title: 'Gnade täglich annehmen', text: 'Fällst du hin? Steh auf, nimm die Gnade an und geh weiter. Der Feind will, dass du in Scham stehen bleibst – Gott lädt dich zurück in die Beziehung.' },
  { type: 'challenge', title: 'Liebe konkret', text: 'Zeige heute einem Menschen ganz praktisch Liebe: eine Nachricht, ein Zuhören, eine Hilfe, eine Vergebung. Mach die Liebe Gottes für jemanden sichtbar.' },

  // Kapitel 5 – Der Aussendungsauftrag (verbunden mit der Oikos Map)
  { chapter: 'Kapitel 5 · Ausgesandt', type: 'bibelvers', title: 'Der Missionsauftrag', verse: 'Mir ist alle Macht gegeben im Himmel und auf Erden. Geht nun hin und macht alle Nationen zu Jüngern und tauft sie … und lehrt sie alles halten, was ich euch geboten habe.', ref: 'Matthäus 28,18-20',
    text: 'Du bist nicht nur gerettet, um selig zu werden, sondern gesandt. Jünger werden – und Jünger machen. Das ist dein Auftrag.' },
  { type: 'bibelvers', title: 'Meine Zeugen', verse: 'Ihr werdet Kraft empfangen, wenn der Heilige Geist auf euch gekommen ist, und ihr werdet meine Zeugen sein … bis an das Ende der Erde.', ref: 'Apostelgeschichte 1,8',
    text: 'Zeuge sein heißt: erzählen, was du selbst erlebt hast. Dafür brauchst du kein Theologiestudium – nur deine Geschichte mit Jesus.' },
  { type: 'challenge', title: 'Bete für deinen Oikos', mapLink: true, text: 'Dein „Oikos" sind die Menschen in deinem Umfeld. Wähle 3 Menschen, die Jesus noch nicht kennen, und trage sie in deine Oikos Map ein. Bete diese Woche täglich für sie.' },
  { type: 'challenge', title: 'Teile dein Zeugnis', mapLink: true, text: 'Erzähle einer Person aus deiner Oikos Map, was Gott in deinem Leben getan hat. Halte danach in der Impact Map fest, wie das Gespräch war.' },
  { type: 'challenge', title: 'Geh evangelisieren', mapLink: true, text: 'Nimm dir bewusst Zeit, um jemandem von Jesus zu erzählen – im Alltag oder gezielt. Markiere in der Oikos Map, wo und mit wem du einen Schritt gegangen bist.' },
]

// ── Nie endender Teil: wiederkehrende Reminder, Challenges & Bekenntnisse ──
// Diese Pools werden nach dem kuratierten Weg endlos weiter verwoben, damit
// der Weg immer weitergeht und den Glauben festigt.
const REMINDERS = [
  'Lies heute ein Kapitel aus einem Evangelium. Frag dich: Was sagt es über Gott? Was über mich? Was tue ich damit?',
  'Nimm dir 10 Minuten Stille mit Gott – ohne Handy, ohne Ablenkung. Höre einfach hin.',
  'Danke Gott heute für drei konkrete Dinge, bevor du etwas erbittest.',
  'Vergib heute jemandem in deinem Herzen, so wie dir vergeben wurde.',
  'Erinnere dich: Du bist ein geliebtes Kind Gottes – unabhängig von deinem Tag.',
  'Ruhe bewusst. Der Sabbat ist ein Geschenk: Du musst nicht alles selbst tragen.',
  'Bete heute für deinen Oikos – die Menschen, die Jesus noch nicht kennen.',
  'Lobe Gott heute mit einem Lied, das dein Herz ausrichtet.',
]
const CHALLENGES = [
  { title: 'Segne einen Fremden', text: 'Tu heute einem Menschen unerwartet Gutes, ohne etwas zurückzuerwarten.', mapLink: false },
  { title: 'Erzähl deine Geschichte', text: 'Teile mit einer Person aus deiner Oikos Map einen Schritt deines Glaubensweges.', mapLink: true },
  { title: 'Bete mit jemandem', text: 'Frag heute jemanden, ob du für ihn beten darfst – und tu es direkt an Ort und Stelle.', mapLink: false },
  { title: 'Lade jemanden ein', text: 'Lade eine Person zu deiner Gemeinde, Kleingruppe oder einem Gebet ein.', mapLink: true },
  { title: 'Fasten & Fokus', text: 'Verzichte heute auf etwas (Essen, Social Media) und nutze die Zeit bewusst für Gott.', mapLink: false },
  { title: 'Dien im Verborgenen', text: 'Tu heute etwas Gutes, von dem niemand erfährt – nur du und Gott.', mapLink: false },
]
const BEKENNTNISSE = [
  { title: 'Das Apostolische Bekenntnis', verse: 'Ich glaube an Gott, den Vater, den Allmächtigen … und an Jesus Christus, seinen eingeborenen Sohn, unsern Herrn … ich glaube an den Heiligen Geist, die Vergebung der Sünden und das ewige Leben.', ref: 'Apostolisches Glaubensbekenntnis', text: 'Sprich es langsam und laut. Bekenntnis richtet das Herz aus und festigt, was du glaubst.' },
  { title: 'Nichts trennt mich', verse: 'Denn ich bin überzeugt, dass weder Tod noch Leben … noch irgendein anderes Geschöpf uns wird scheiden können von der Liebe Gottes, die in Christus Jesus ist.', ref: 'Römer 8,38-39', text: 'Verankere heute diese Wahrheit: Nichts kann dich von Gottes Liebe trennen.' },
  { title: 'Jesus ist Herr', verse: 'Darum hat Gott ihn hoch erhoben … damit jede Zunge bekenne, dass Jesus Christus Herr ist, zur Ehre Gottes, des Vaters.', ref: 'Philipper 2,9-11', text: 'Bekenne heute neu: Jesus ist Herr – über mein Leben, meine Angst, meine Zukunft.' },
]

// Erzeugt viele wiederkehrende Stationen (fühlt sich endlos an) und verwebt
// Bibelvers/Challenge/Erinnerung/Bekenntnis in einem festen, ausgewogenen Rhythmus.
function buildEndless(count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const mod = i % 4
    if (mod === 0) {
      const r = REMINDERS[Math.floor(i / 4) % REMINDERS.length]
      out.push({ type: 'erinnerung', title: 'Reminder', text: r })
    } else if (mod === 1) {
      const c = CHALLENGES[Math.floor(i / 4) % CHALLENGES.length]
      out.push({ type: 'challenge', title: c.title, text: c.text, mapLink: c.mapLink })
    } else if (mod === 2) {
      const b = BEKENNTNISSE[Math.floor(i / 4) % BEKENNTNISSE.length]
      out.push({ type: 'bekenntnis', title: b.title, verse: b.verse, ref: b.ref, text: b.text })
    } else {
      const r = REMINDERS[(Math.floor(i / 4) + 3) % REMINDERS.length]
      out.push({ type: 'erinnerung', title: 'Erinnerung', text: r })
    }
  }
  return out
}

const CHAPTER_ENDLESS = 'Der Weg geht weiter'

// Volle Stationsliste: kuratierter Anfang + endloser Teil. Stabile IDs.
function buildStations() {
  const endless = buildEndless(48).map((s, i) => ({
    ...s,
    chapter: i === 0 ? CHAPTER_ENDLESS : undefined,
  }))
  return [...CURATED, ...endless].map((s, i) => ({ id: `p${i}`, ...s }))
}

const TYPE_META = {
  bibelvers:  { icon: BookOpen,  label: 'Bibelvers',   color: '#0A84FF', tint: 'rgba(10,132,255,0.14)' },
  challenge:  { icon: Flag,      label: 'Challenge',   color: '#E8B33C', tint: 'rgba(232,179,60,0.16)' },
  erinnerung: { icon: Bell,      label: 'Erinnerung',  color: '#34C759', tint: 'rgba(52,199,89,0.14)' },
  erklaerung: { icon: Info,      label: 'Erklärung',   color: '#5AC8FA', tint: 'rgba(90,200,250,0.16)' },
  bekenntnis: { icon: HandHeart, label: 'Bekenntnis',  color: '#AF52DE', tint: 'rgba(175,82,222,0.14)' },
}

const VIEW_W = 400
const STEP = 172        // vertikaler Abstand zwischen Stationen
const TOP_PAD = 96
const BOTTOM_PAD = 120
const LEFT_X = 128
const RIGHT_X = 272

export default function PaulPathScreen() {
  const navigate = useNavigate()
  const stations = useMemo(() => buildStations(), [])
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

  const n = stations.length
  const totalH = TOP_PAD + BOTTOM_PAD + (n - 1) * STEP

  // Punkte: Index 0 unten, letzter oben; x abwechselnd links/rechts
  const points = stations.map((station, i) => ({
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

  const doneCount = stations.filter(s => done.has(s.id)).length

  return (
    <div ref={scrollRef} style={{ position: 'relative', backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Kopf */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5, padding: '14px 18px 12px',
        backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          Jüngerschaft Paul
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: '3px 0 0' }}>
          Dein Weg im Glauben – vom ersten Schritt an, immer weiter.{doneCount > 0 ? ` · ${doneCount} erledigt` : ''}
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

        {/* Kapitel-Bänder */}
        {points.map(({ y, station }) => (
          station.chapter ? (
            <div key={`ch-${station.id}`} style={{
              position: 'absolute', left: 0, right: 0, top: y + STEP / 2 - 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span style={{
                padding: '5px 14px', borderRadius: 999,
                backgroundColor: 'var(--color-accent)', color: '#fff',
                fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)', whiteSpace: 'nowrap',
              }}>
                {station.chapter}
              </span>
            </div>
          ) : null
        ))}

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
                  position: 'relative',
                  width: 58, height: 58, borderRadius: '50%', cursor: 'pointer',
                  backgroundColor: isDone ? meta.color : 'var(--color-bg)',
                  border: `3px solid ${meta.color}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isDone ? '#fff' : meta.color,
                }}
              >
                {isDone ? <Check size={26} strokeWidth={3} /> : <Icon size={24} />}
                {station.mapLink && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, width: 20, height: 20,
                    borderRadius: '50%', backgroundColor: 'var(--color-bg)',
                    border: `2px solid ${meta.color}`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: meta.color,
                  }}>
                    <MapPin size={11} strokeWidth={2.6} />
                  </span>
                )}
              </button>
              <div style={{
                padding: '4px 10px', borderRadius: 999, textAlign: 'center',
                backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: 11.5, fontWeight: 700, lineHeight: 1.25,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 150,
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
          onOpenMap={() => { setActive(null); navigate('/worldmap') }}
        />
      )}
    </div>
  )
}

function StationSheet({ station, done, onDone, onClose, onOpenMap }) {
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
          <>
            <p style={{
              fontFamily: 'Lora, serif', fontSize: 15, fontStyle: 'italic', lineHeight: 1.6,
              color: 'var(--color-text)', margin: '0 0 6px', paddingLeft: 12,
              borderLeft: `3px solid ${meta.color}`,
            }}>
              „{station.verse}"
            </p>
            {station.ref && (
              <p style={{ fontSize: 12.5, fontWeight: 700, color: meta.color, margin: '0 0 14px', paddingLeft: 12 }}>
                {station.ref}
              </p>
            )}
          </>
        )}

        <p style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 22px' }}>
          {station.text}
        </p>

        {station.mapLink && (
          <button
            onClick={onOpenMap}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, marginBottom: 10,
              border: `1.5px solid ${meta.color}`, backgroundColor: meta.tint,
              color: meta.color, fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <MapPin size={17} /> Zur Oikos Map
          </button>
        )}

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
