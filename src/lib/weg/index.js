import { RAW, STATIONS } from './content'
import { PRODIGAL } from './prodigal'

// Gemeinsamer Aufbau für die Bibelstudien: jede Studie ist eine Liste von
// „Schritten“ (Einstieg, Lesen, Fragen, Gebet, Wochenschritt, Vertiefung).
// Die ausführliche Studie 1 bringt ihre Schritte selbst mit, die übrigen
// werden aus den Rohinhalten in content.js erzeugt.

export const PHASES = {
  e: 'Einstieg',
  k: 'Kopf',
  h: 'Herz',
  x: 'Hand',
  v: 'Vertiefung',
}

const STEP_HINT = 'Ein konkreter Schritt statt vieler guter Vorsätze.'

function build(r) {
  const steps = [{ p: 'e', t: 'intro' }, { p: 'e', t: 'read' }]
  r.kopf.forEach(([q, hint]) => steps.push({ p: 'k', t: 'text', q, hint, lbl: 'Auflösung', m: r.m[0] }))
  if (r.cards) {
    steps.push({
      p: 'k', t: 'cards', layout: r.cards.layout, title: r.cards.title, intro: r.cards.intro,
      items: r.cards.items,
    })
  }
  r.herz.forEach(([q, hint]) => steps.push({ p: 'h', t: 'text', q, hint, lbl: 'Gedanke dazu', m: r.m[1] }))
  r.hand.forEach(([q, hint]) => steps.push({ p: 'x', t: 'text', q, hint, lbl: 'Impuls', m: r.m[2] }))
  steps.push({
    p: 'x', t: 'choice', q: 'Dein Schritt für diese Woche', m: STEP_HINT,
    o: [
      ...r.steps.map(([label, text]) => ({ label, text })),
      { label: 'Eigenen Schritt erstellen', text: 'Formuliere ihn so konkret, dass du am Ende der Woche sagen kannst: erledigt oder nicht.', custom: true },
    ],
  })
  steps.push({ p: 'x', t: 'prayer', text: r.prayer })
  steps.push({ p: 'v', t: 'more' })
  return { ...r, steps }
}

const all = [PRODIGAL, ...RAW.map(build)].map(s => ({
  ...s,
  minutes: Math.max(10, Math.round(s.steps.length * 1.2)),
}))

export const STUDIES = all.sort((a, b) => a.nr - b.nr)
export { STATIONS }

export function getStudy(id) {
  return STUDIES.find(s => s.id === id) || null
}

export function studiesOf(stationId) {
  return STUDIES.filter(s => s.station === stationId)
}
