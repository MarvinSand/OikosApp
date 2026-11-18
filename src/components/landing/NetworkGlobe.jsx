import { useEffect, useRef } from 'react'
import {
  LAND, LAND_EU, BORDERS, COASTS, BORDERS_EU, COASTS_EU,
} from '../../lib/worldGeo'

// Animierte Weltkugel der Landingpage: Länder (4-Farben-Raster, Grenzen,
// Küsten, Namen), darauf Marker im Design der Weltkarte der App
// (Geschwister = runde Avatare, Events = pulsierende Quadrate mit Emoji,
// Gemeinden = Haus-Quadrate) und Lichtbögen, die sie verbinden. Reine
// Illustration, keine echten Nutzerdaten. Canvas statt SVG/WebGL: läuft
// auch auf schwachen Handys flüssig.
//
// `stage` (0–3) blendet das Netz stufenweise auf (Umfeld → Gemeinde →
// Netzwerk → weltweit) und fährt auf Deutschland/Europa heran; `null` =
// alles sichtbar, Kugel dreht sich frei (Hero). `kinds` filtert die
// Markertypen wie die Ebenen-Schalter der Weltkarte.

const D2R = Math.PI / 180
const TWO_PI = Math.PI * 2
const ACCENT = '#5AC8FA'
const ACCENT_DARK = '#0A84FF'
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'

// ── Geodaten entpacken ────────────────────────────────────────────────
function toXYZ(lat, lon) {
  const p = lat * D2R
  const l = lon * D2R
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)]
}

const inEuWindow = (lat, lon) => lat >= 30 && lat <= 66 && lon >= -15 && lon <= 40

// Zeilenweise gepackte Punktraster → xyz + Ton (Länderfärbung) + „liegt im Europa-Fenster“
function decodeLand(arr) {
  const pts = []
  let i = 0
  while (i < arr.length) {
    const lat = arr[i++] / 10
    const n = arr[i++]
    let lon = -1800
    for (let k = 0; k < n; k++) {
      const v = arr[i++]
      lon += v >> 2
      pts.push([lat, lon / 10, v & 3])
    }
  }
  pts.sort((a, b) => a[2] - b[2])
  const xyz = new Float32Array(pts.length * 3)
  const tone = new Uint8Array(pts.length)
  const eu = new Uint8Array(pts.length)
  pts.forEach(([lat, lon, t], j) => {
    xyz.set(toXYZ(lat, lon), j * 3)
    tone[j] = t
    eu[j] = inEuWindow(lat, lon) ? 1 : 0
  })
  return { xyz, tone, eu, n: pts.length }
}

// Delta-codierte Polylinien (0,05°) → xyz-Puffer + Startindizes
function decodeLines(lines) {
  let total = 0
  lines.forEach(l => { total += l.length / 2 })
  const xyz = new Float32Array(total * 3)
  const win = new Uint8Array(total)
  const starts = []
  let c = 0
  lines.forEach(l => {
    starts.push(c)
    let lat = 0
    let lon = 0
    for (let i = 0; i < l.length; i += 2) {
      lat += l[i]
      lon += l[i + 1]
      const la = lat / 20, lo = lon / 20
      xyz.set(toXYZ(la, lo), c * 3)
      win[c] = inEuWindow(la, lo) ? 1 : 0
      c++
    }
  })
  starts.push(c)
  return { xyz, win, starts }
}

const LAND_W = decodeLand(LAND)
const LAND_E = decodeLand(LAND_EU)
const LINES = {
  coast: decodeLines(COASTS),
  border: decodeLines(BORDERS),
  coastEu: decodeLines(COASTS_EU),
  borderEu: decodeLines(BORDERS_EU),
}
const TONE_COLORS = ['#74bfff', '#66dcd8', '#a9b4ff', '#9fe3ff']

// ── Netz: Knoten (Marker) und Verbindungen ───────────────────────────
// kind: sibling | event | gemeinde · tier: ab welcher Vision-Stufe sichtbar ·
// far: auch bei vollem Globus sichtbar (sonst erst beim Heranzoomen)
const NODE_DEFS = [
  { n: 'Frankfurt', lat: 50.11, lon: 8.68, tier: 0, kind: 'sibling', far: true, msg: 'Gebet für Familie' },
  { n: 'Köln', lat: 50.94, lon: 6.96, tier: 0, kind: 'sibling', msg: 'Neues Zeugnis' },
  { n: 'Stuttgart', lat: 48.78, lon: 9.18, tier: 0, kind: 'sibling', msg: 'Gebet erhört' },
  { n: 'Würzburg', lat: 49.79, lon: 9.93, tier: 0, kind: 'sibling', msg: 'Gebet für Freunde' },
  { n: 'Hamburg', lat: 53.55, lon: 9.99, tier: 1, kind: 'gemeinde', msg: 'Hausgemeinde' },
  { n: 'München', lat: 48.14, lon: 11.58, tier: 1, kind: 'event', emoji: '🎵', msg: 'Lobpreisabend' },
  { n: 'Berlin', lat: 52.52, lon: 13.4, tier: 1, kind: 'event', emoji: '🤝', msg: 'Gemeinschaft' },
  { n: 'Zürich', lat: 47.37, lon: 8.54, tier: 1, kind: 'event', emoji: '🙏', msg: 'Gebetsabend' },
  { n: 'Wien', lat: 48.21, lon: 16.37, tier: 1, kind: 'gemeinde', msg: 'Hausgemeinde' },
  { n: 'London', lat: 51.5, lon: -0.12, tier: 2, kind: 'sibling', far: true, msg: 'Gebet erhört' },
  { n: 'Paris', lat: 48.86, lon: 2.35, tier: 2, kind: 'gemeinde', msg: 'Hausgemeinde' },
  { n: 'Madrid', lat: 40.42, lon: -3.7, tier: 2, kind: 'event', emoji: '🎵', far: true, msg: 'Lobpreisabend' },
  { n: 'Rom', lat: 41.9, lon: 12.5, tier: 2, kind: 'event', emoji: '🙏', far: true, msg: 'Gebetsabend' },
  { n: 'Warschau', lat: 52.23, lon: 21.0, tier: 2, kind: 'sibling', msg: 'Neues Zeugnis' },
  { n: 'Stockholm', lat: 59.33, lon: 18.07, tier: 2, kind: 'event', emoji: '📖', far: true, msg: 'Bibelstudium' },
  { n: 'Athen', lat: 37.98, lon: 23.73, tier: 2, kind: 'gemeinde', msg: 'Hausgemeinde' },
  { n: 'Kyiv', lat: 50.45, lon: 30.52, tier: 2, kind: 'event', emoji: '🤝', far: true, msg: 'Gemeinschaft' },
  { n: 'Nairobi', lat: -1.29, lon: 36.82, tier: 3, kind: 'event', emoji: '🎵', far: true, msg: 'Lobpreisabend' },
  { n: 'Lagos', lat: 6.52, lon: 3.38, tier: 3, kind: 'sibling', far: true, msg: 'Gebet erhört' },
  { n: 'Johannesburg', lat: -26.2, lon: 28.05, tier: 3, kind: 'gemeinde', far: true, msg: 'Hausgemeinde' },
  { n: 'New York', lat: 40.71, lon: -74.0, tier: 3, kind: 'event', emoji: '☕', far: true, msg: 'Gebetsfrühstück' },
  { n: 'Toronto', lat: 43.65, lon: -79.38, tier: 3, kind: 'gemeinde', far: true, msg: 'Hausgemeinde' },
  { n: 'Los Angeles', lat: 34.05, lon: -118.24, tier: 3, kind: 'event', emoji: '📖', far: true, msg: 'Bibelstudium' },
  { n: 'Mexiko-Stadt', lat: 19.43, lon: -99.13, tier: 3, kind: 'sibling', far: true, msg: 'Neues Zeugnis' },
  { n: 'Lima', lat: -12.05, lon: -77.04, tier: 3, kind: 'event', emoji: '🎵', far: true, msg: 'Lobpreisabend' },
  { n: 'São Paulo', lat: -23.55, lon: -46.63, tier: 3, kind: 'sibling', far: true, msg: 'Gebet erhört' },
  { n: 'Mumbai', lat: 19.08, lon: 72.88, tier: 3, kind: 'gemeinde', far: true, msg: 'Hausgemeinde' },
  { n: 'Singapur', lat: 1.35, lon: 103.82, tier: 3, kind: 'event', emoji: '🙏', far: true, msg: 'Gebetsabend' },
  { n: 'Manila', lat: 14.6, lon: 120.98, tier: 3, kind: 'gemeinde', far: true, msg: 'Hausgemeinde' },
  { n: 'Seoul', lat: 37.57, lon: 126.98, tier: 3, kind: 'event', emoji: '🙏', far: true, msg: 'Morgengebet' },
  { n: 'Sydney', lat: -33.87, lon: 151.21, tier: 3, kind: 'event', emoji: '📢', far: true, msg: 'Evangelisieren' },
  { n: 'Kapstadt', lat: -33.92, lon: 18.42, tier: 3, kind: 'sibling', far: true, msg: 'Gebet für Freunde' },
]
// Fernverbindungen (immer Stufe 3)
const LONG_LINKS = [
  ['Frankfurt', 'New York'], ['Frankfurt', 'Nairobi'], ['Madrid', 'São Paulo'],
  ['Stockholm', 'Seoul'], ['New York', 'São Paulo'], ['Lagos', 'Madrid'],
  ['Nairobi', 'Mumbai'], ['Seoul', 'Sydney'], ['Manila', 'Sydney'],
  ['Los Angeles', 'Seoul'], ['London', 'Toronto'], ['Johannesburg', 'Sydney'],
]

const STAGE_VIEW = [
  { lon: 8.9, lat: 50.2, zoom: 9 },
  { lon: 10.5, lat: 49.5, zoom: 5 },
  { lon: 14, lat: 44, zoom: 2.5 },
]
const HERO_LAT = 22
const ARC_STEPS = 44

// Avatar-Paletten (Pastell-Hintergründe wie in der App)
const AV_BG = ['#FFE08A', '#FFD2B8', '#D9C8FF', '#BDF0DC', '#BFE3FF', '#FFC9D6']
const AV_SKIN = ['#F6C9A0', '#E0A87A', '#B97A50', '#8A5A3C', '#FADBC0', '#D9A06F']
const AV_HAIR = ['#3B2A20', '#1E1B1B', '#8B4A2B', '#BFB8B0', '#E3B655', '#5A3A2A']
const AV_SHIRT = ['#F28B82', '#8FD19E', '#7FB5F0', '#F5B25A', '#B79CF2', '#6EC9C0']

const NODES = NODE_DEFS.map((d, i) => ({
  ...d,
  i,
  v: toXYZ(d.lat, d.lon),
  prio: d.kind === 'event' ? 1 : d.kind === 'gemeinde' ? 2 : 3,
  av: {
    bg: AV_BG[(i * 5) % AV_BG.length],
    skin: AV_SKIN[(i * 3 + 1) % AV_SKIN.length],
    hair: AV_HAIR[(i * 7 + 2) % AV_HAIR.length],
    shirt: AV_SHIRT[(i * 11) % AV_SHIRT.length],
    style: i % 3,
  },
}))
const byName = Object.fromEntries(NODES.map(n => [n.n, n]))

const ARCS = (() => {
  const dist = (a, b) => Math.acos(Math.min(1, a.v[0] * b.v[0] + a.v[1] * b.v[1] + a.v[2] * b.v[2]))
  const seen = new Set()
  const pairs = []
  const add = (a, b, tier) => {
    const key = a.i < b.i ? `${a.i}-${b.i}` : `${b.i}-${a.i}`
    if (seen.has(key)) return
    seen.add(key)
    pairs.push([a, b, tier])
  }
  // jeder Knoten verbindet sich mit seinen 2 nächsten Nachbarn derselben oder früheren Stufe …
  NODES.forEach(a => {
    NODES.filter(b => b !== a && b.tier <= a.tier)
      .sort((x, y) => dist(a, x) - dist(a, y))
      .slice(0, 2)
      .forEach(b => add(a, b, a.tier))
  })
  // … und die weit sichtbaren Knoten zusätzlich untereinander (sonst hängen sie im Hero lose)
  NODES.filter(n => n.far).forEach(a => {
    NODES.filter(b => b !== a && b.far && b.tier <= a.tier)
      .sort((x, y) => dist(a, x) - dist(a, y))
      .slice(0, 2)
      .forEach(b => add(a, b, a.tier))
  })
  LONG_LINKS.forEach(([x, y]) => add(byName[x], byName[y], 3))

  return pairs.map(([a, b, tier], k) => {
    const w = dist(a, b)
    const alt = 0.05 + 0.24 * (w / Math.PI)
    const pts = new Float32Array((ARC_STEPS + 1) * 3)
    const sw = Math.sin(w) || 1
    for (let s = 0; s <= ARC_STEPS; s++) {
      const t = s / ARC_STEPS
      const s1 = Math.sin((1 - t) * w) / sw
      const s2 = Math.sin(t * w) / sw
      const h = 1 + alt * Math.sin(Math.PI * t)
      for (let c = 0; c < 3; c++) pts[s * 3 + c] = (a.v[c] * s1 + b.v[c] * s2) * h
    }
    return { a, b, tier, pts, phase: (k * 0.37) % 1, speed: 0.1 + ((k * 7) % 5) * 0.025 }
  })
})()

// ── Beschriftungen: Kontinente und Länder ────────────────────────────
// z: ab welchem Zoom sichtbar (Kontinente nur im Überblick)
const LABELS = [
  { t: 'EUROPA', lat: 52, lon: 15, cont: true },
  { t: 'AFRIKA', lat: 4, lon: 21, cont: true },
  { t: 'ASIEN', lat: 46, lon: 90, cont: true },
  { t: 'NORDAMERIKA', lat: 47, lon: -102, cont: true },
  { t: 'SÜDAMERIKA', lat: -14, lon: -60, cont: true },
  { t: 'AUSTRALIEN', lat: -25, lon: 134, cont: true },
  { t: 'Russland', lat: 61, lon: 95, z: 1 },
  { t: 'China', lat: 35.5, lon: 103, z: 1 },
  { t: 'Indien', lat: 22, lon: 79, z: 1 },
  { t: 'USA', lat: 39, lon: -98, z: 1 },
  { t: 'Kanada', lat: 58, lon: -104, z: 1 },
  { t: 'Brasilien', lat: -10, lon: -52, z: 1 },
  { t: 'Argentinien', lat: -36, lon: -65, z: 1 },
  { t: 'Mexiko', lat: 23.5, lon: -102, z: 1.2 },
  { t: 'Algerien', lat: 28, lon: 3, z: 1 },
  { t: 'Ägypten', lat: 26.5, lon: 30, z: 1.2 },
  { t: 'Nigeria', lat: 9.5, lon: 8.5, z: 1.4 },
  { t: 'DR Kongo', lat: -3, lon: 23.5, z: 1 },
  { t: 'Südafrika', lat: -29, lon: 24.5, z: 1.1 },
  { t: 'Äthiopien', lat: 8.5, lon: 40, z: 1.4 },
  { t: 'Saudi-Arabien', lat: 24, lon: 45, z: 1.1 },
  { t: 'Iran', lat: 32.5, lon: 54, z: 1.3 },
  { t: 'Kasachstan', lat: 48, lon: 67, z: 1.1 },
  { t: 'Indonesien', lat: -2.5, lon: 115, z: 1.2 },
  { t: 'Japan', lat: 36.5, lon: 138.5, z: 1.4 },
  { t: 'Türkei', lat: 39, lon: 35, z: 1.45 },
  { t: 'Deutschland', lat: 51, lon: 10.3, z: 1.45 },
  { t: 'Frankreich', lat: 46.6, lon: 2.4, z: 1.45 },
  { t: 'Spanien', lat: 40.3, lon: -3.6, z: 1.45 },
  { t: 'Italien', lat: 42.6, lon: 12.8, z: 1.7 },
  { t: 'Großbritannien', lat: 53.3, lon: -1.9, z: 1.6 },
  { t: 'Polen', lat: 52, lon: 19.3, z: 1.7 },
  { t: 'Ukraine', lat: 49, lon: 31.5, z: 1.5 },
  { t: 'Schweden', lat: 62.5, lon: 15.5, z: 1.5 },
  { t: 'Norwegen', lat: 61, lon: 9, z: 1.7 },
  { t: 'Finnland', lat: 63.5, lon: 26.5, z: 1.7 },
  { t: 'Rumänien', lat: 45.8, lon: 25, z: 2 },
  { t: 'Griechenland', lat: 39.3, lon: 22, z: 2.1 },
  { t: 'Portugal', lat: 39.6, lon: -8, z: 2.2 },
  { t: 'Österreich', lat: 47.5, lon: 14.5, z: 2.4 },
  { t: 'Schweiz', lat: 46.8, lon: 8.2, z: 2.6 },
  { t: 'Tschechien', lat: 49.8, lon: 15.5, z: 2.6 },
  { t: 'Ungarn', lat: 47.1, lon: 19.4, z: 2.6 },
  { t: 'Niederlande', lat: 52.3, lon: 5.4, z: 3 },
  { t: 'Belgien', lat: 50.6, lon: 4.6, z: 3 },
  { t: 'Dänemark', lat: 56, lon: 9.5, z: 2.6 },
  { t: 'Irland', lat: 53.2, lon: -8, z: 2.4 },
  { t: 'Kroatien', lat: 45.2, lon: 15.6, z: 3 },
  { t: 'Serbien', lat: 44, lon: 20.8, z: 3 },
  { t: 'Bulgarien', lat: 42.8, lon: 25.2, z: 3 },
  { t: 'Slowakei', lat: 48.7, lon: 19.5, z: 3.2 },
  { t: 'Luxemburg', lat: 49.8, lon: 6.1, z: 6 },
].map(l => ({ ...l, v: toXYZ(l.lat, l.lon) }))

function shortAngle(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180
}
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function squircle(ctx, x, y, size, r) {
  const h = size / 2
  ctx.beginPath()
  ctx.moveTo(x - h + r, y - h)
  ctx.arcTo(x + h, y - h, x + h, y + h, r)
  ctx.arcTo(x + h, y + h, x - h, y + h, r)
  ctx.arcTo(x - h, y + h, x - h, y - h, r)
  ctx.arcTo(x - h, y - h, x + h, y - h, r)
  ctx.closePath()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Avatar wie in der App: Pastell-Kreis, Kopf, Schultern, Haare
function drawAvatar(ctx, x, y, r, av, detail) {
  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.clip()
  ctx.fillStyle = av.bg
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  if (detail > 0.15) {
    ctx.globalAlpha *= Math.min(1, detail * 1.4)
    if (av.style === 1) { // lange Haare hinter dem Kopf
      ctx.fillStyle = av.hair
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.05, r * 0.52, r * 0.62, 0, 0, TWO_PI); ctx.fill()
    }
    ctx.fillStyle = av.shirt
    ctx.beginPath(); ctx.ellipse(x, y + r * 1.0, r * 0.82, r * 0.58, 0, 0, TWO_PI); ctx.fill()
    ctx.fillStyle = av.skin
    ctx.fillRect(x - r * 0.14, y + r * 0.28, r * 0.28, r * 0.3)
    ctx.beginPath(); ctx.arc(x, y - r * 0.08, r * 0.42, 0, TWO_PI); ctx.fill()
    ctx.fillStyle = av.hair
    ctx.beginPath()
    ctx.arc(x, y - r * 0.12, r * 0.46, Math.PI * 1.02, Math.PI * 1.98)
    ctx.closePath(); ctx.fill()
    if (av.style === 2) { ctx.beginPath(); ctx.arc(x, y - r * 0.58, r * 0.2, 0, TWO_PI); ctx.fill() }
    if (r > 10) {
      ctx.fillStyle = '#2b2220'
      ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.06, r * 0.05, 0, TWO_PI); ctx.arc(x + r * 0.15, y - r * 0.06, r * 0.05, 0, TWO_PI); ctx.fill()
      ctx.strokeStyle = '#2b2220'
      ctx.lineWidth = Math.max(0.8, r * 0.04)
      ctx.beginPath(); ctx.arc(x, y + r * 0.04, r * 0.14, 0.2, Math.PI - 0.2); ctx.stroke()
    }
  }
  ctx.restore()
}

// Marker im Look der Weltkarte. `f` = Detailgrad (0 = kleiner Punkt, 1 = voller Marker)
function drawMarker(ctx, node, x, y, S, f, t, alpha, me, reduced) {
  const size = S * (0.34 + 0.66 * f)
  const bw = Math.max(1.5, Math.min(2.8, size * 0.07))
  ctx.globalAlpha = alpha
  if (node.kind === 'sibling') {
    const r = size / 2
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2
    ctx.fillStyle = ACCENT
    ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.fill()
    ctx.restore()
    drawAvatar(ctx, x, y, r - bw * 0.9, node.av, f)
    ctx.strokeStyle = me ? '#fff' : ACCENT
    ctx.lineWidth = bw
    ctx.beginPath(); ctx.arc(x, y, r - bw / 2, 0, TWO_PI); ctx.stroke()
    if (me && f > 0.6) {
      const fs = Math.max(9, size * 0.26)
      ctx.font = `800 ${fs}px Inter, -apple-system, sans-serif`
      const tw = ctx.measureText('Du').width
      const pw = tw + 12, ph = fs + 6
      roundRect(ctx, x - pw / 2, y + r - ph * 0.55, pw, ph, ph / 2)
      ctx.fillStyle = ACCENT_DARK; ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Du', x, y + r - ph * 0.55 + ph / 2 + 0.5)
    }
  } else {
    const isEvent = node.kind === 'event'
    const radius = size * (isEvent ? 0.34 : 0.3)
    if (isEvent && f > 0.5 && !reduced) {
      // Radar-Ringe wie die Event-Pins der App
      for (let k = 0; k < 2; k++) {
        const ph = ((t / 1.8 - k * 0.5) % 1 + 1) % 1
        const gs = size * (1 + 0.9 * ph)
        ctx.globalAlpha = alpha * (1 - ph) * 0.6 * Math.min(1, (f - 0.5) * 2)
        squircle(ctx, x, y, gs, gs * 0.34)
        ctx.fillStyle = 'rgba(90,200,250,0.35)'; ctx.fill()
        ctx.strokeStyle = 'rgba(90,200,250,0.7)'; ctx.lineWidth = 1.5; ctx.stroke()
      }
      ctx.globalAlpha = alpha
    }
    const beat = isEvent && !reduced && f > 0.5 ? 1 + 0.05 * Math.sin(t * 5.2) : 1
    const sz = size * 0.9 * beat
    ctx.save()
    ctx.shadowColor = isEvent ? 'rgba(90,200,250,0.85)' : 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = isEvent ? 16 : 8; ctx.shadowOffsetY = isEvent ? 3 : 2
    squircle(ctx, x, y, sz, radius)
    ctx.fillStyle = ACCENT; ctx.fill()
    ctx.restore()
    squircle(ctx, x, y, sz, radius)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = bw; ctx.stroke()
    if (f > 0.45) {
      ctx.globalAlpha = alpha * Math.min(1, (f - 0.45) * 2.2)
      ctx.font = `${Math.round(sz * 0.52)}px ${EMOJI_FONT}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#000'
      ctx.fillText(isEvent ? node.emoji : '🏠', x, y + sz * 0.04)
    }
  }
  ctx.globalAlpha = 1
}

const ALL_KINDS = { sibling: true, event: true, gemeinde: true }

export default function NetworkGlobe({ stage = null, className = '', fit = 'hero', kinds = ALL_KINDS }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const stageRef = useRef(stage)
  const kindsRef = useRef(kinds)
  const redrawRef = useRef(() => {})

  useEffect(() => {
    stageRef.current = stage
    kindsRef.current = kinds
    redrawRef.current()
  }, [stage, kinds])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const hasLetterSpacing = 'letterSpacing' in ctx

    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let running = false
    let visible = false
    let last = 0
    let t0 = 0

    const view = { lon: 8, lat: HERO_LAT, zoom: 1 }
    const nodeA = new Float32Array(NODES.length)
    const nodeF = new Float32Array(NODES.length).fill(1)
    const arcA = new Float32Array(ARCS.length)
    const chip = { node: -1, start: -10, lastNode: -1, next: 1.2 }
    const textW = new Map()

    function resize() {
      const r = wrap.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      draw(performance.now(), 0)
    }

    function measure(text, font) {
      const key = font + text
      let v = textW.get(key)
      if (v == null) { ctx.font = font; v = ctx.measureText(text).width; textW.set(key, v) }
      return v
    }

    function draw(now, dt) {
      const st = stageRef.current
      const kindOn = kindsRef.current
      const showTier = st == null ? 3 : st
      const t = (now - t0) / 1000

      // Kamera
      const tv = st == null ? null : STAGE_VIEW[st] || null
      const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6)
      if (tv) {
        // schmale Bildschirme: etwas weniger Zoom, damit die Marker Platz haben
        const tz = w < 500 ? 1 + (tv.zoom - 1) * 0.85 : tv.zoom
        view.lon += shortAngle(view.lon, tv.lon) * k
        view.lat += (tv.lat - view.lat) * k
        view.zoom += (tz - view.zoom) * k
      } else {
        if (!reduced) view.lon = (view.lon + dt * 7) % 360
        view.lat += (HERO_LAT - view.lat) * k
        view.zoom += (1 - view.zoom) * k
      }

      // Sichtbarkeit der Knoten/Bögen (sanft ein-/ausblenden, im Hero gestaffelt)
      const ak = reduced ? 1 : Math.min(1, dt * 2.4)
      const nodeOn = NODES.map(n => {
        const delay = st == null ? 0.3 + n.i * 0.07 : 0
        return n.tier <= showTier && t > delay && (n.far || view.zoom > 1.6) && kindOn[n.kind] !== false
      })
      NODES.forEach(n => { nodeA[n.i] += ((nodeOn[n.i] ? 1 : 0) - nodeA[n.i]) * ak })
      ARCS.forEach((a, i) => {
        const delay = st == null ? 0.9 + i * 0.05 : 0
        const on = a.tier <= showTier && t > delay && nodeOn[a.a.i] && nodeOn[a.b.i]
        arcA[i] += ((on ? 1 : 0) - arcA[i]) * ak
      })

      // Projektion
      const R = (fit === 'hero' ? Math.min(w * 0.43, h * 0.47) : Math.min(w, h) * 0.44) * view.zoom
      const cx = w / 2
      const cy = fit === 'hero' ? h * 0.52 : h / 2
      const l0 = view.lon * D2R
      const tl = view.lat * D2R
      const cl = Math.cos(l0), sl = Math.sin(l0), ct = Math.cos(tl), stl = Math.sin(tl)
      const proj = (x, y, z, out) => {
        const x1 = x * cl - z * sl
        const z1 = x * sl + z * cl
        out[0] = x1
        out[1] = y * ct - z1 * stl
        out[2] = y * stl + z1 * ct
      }
      const p = [0, 0, 0]
      const q = [0, 0, 0]
      const ds = Math.sqrt(Math.min(view.zoom, 4))
      const fine = smooth(1.3, 1.8, view.zoom)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Atmosphäre
      let g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.32)
      g.addColorStop(0, 'rgba(70,150,255,0.34)')
      g.addColorStop(0.45, 'rgba(60,120,255,0.12)')
      g.addColorStop(1, 'rgba(60,120,255,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(R * 1.32, Math.max(w, h) * 2), 0, TWO_PI); ctx.fill()

      // Kugelkörper
      g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R)
      g.addColorStop(0, '#16407a')
      g.addColorStop(0.55, '#0a2146')
      g.addColorStop(1, '#040a1a')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TWO_PI); ctx.fill()
      // warmer Lichtsaum unten rechts (Sonnenaufgang)
      g = ctx.createRadialGradient(cx + R * 0.55, cy + R * 0.75, R * 0.2, cx + R * 0.35, cy + R * 0.45, R * 1.15)
      g.addColorStop(0, 'rgba(255,160,70,0.30)')
      g.addColorStop(1, 'rgba(255,160,70,0)')
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TWO_PI); ctx.clip()
      ctx.fillStyle = g
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      ctx.restore()
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(130,195,255,0.35)'
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TWO_PI); ctx.stroke()

      // ── Land: Punktraster, je Land in einem von 4 Tönen ──
      const dsz = 1.0 + 0.55 * Math.pow(Math.min(view.zoom, 3), 0.7)
      let curTone = -1
      for (let i = 0; i < LAND_W.n; i++) {
        proj(LAND_W.xyz[i * 3], LAND_W.xyz[i * 3 + 1], LAND_W.xyz[i * 3 + 2], p)
        if (p[2] <= 0.02) continue
        const fade = LAND_W.eu[i] ? 1 - fine : 1
        if (fade < 0.02) continue
        if (LAND_W.tone[i] !== curTone) { curTone = LAND_W.tone[i]; ctx.fillStyle = TONE_COLORS[curTone] }
        ctx.globalAlpha = (0.2 + 0.6 * Math.pow(p[2], 0.9)) * fade
        const s = dsz * (0.55 + 0.6 * p[2])
        ctx.fillRect(cx + p[0] * R - s / 2, cy - p[1] * R - s / 2, s, s)
      }
      if (fine > 0.02) {
        const fs = 1.4 + 0.3 * Math.min(view.zoom, 6)
        curTone = -1
        for (let i = 0; i < LAND_E.n; i++) {
          proj(LAND_E.xyz[i * 3], LAND_E.xyz[i * 3 + 1], LAND_E.xyz[i * 3 + 2], p)
          if (p[2] <= 0.02) continue
          const x = cx + p[0] * R, y = cy - p[1] * R
          if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue
          if (LAND_E.tone[i] !== curTone) { curTone = LAND_E.tone[i]; ctx.fillStyle = TONE_COLORS[curTone] }
          ctx.globalAlpha = (0.24 + 0.6 * Math.pow(p[2], 0.9)) * fine
          ctx.fillRect(x - fs / 2, y - fs / 2, fs, fs)
        }
      }
      ctx.globalAlpha = 1

      // ── Küsten und Ländergrenzen ──
      const strokeLines = (set, alphaMul, color, width, fadeIn) => {
        const pOut = new Path2D()
        const pIn = new Path2D()
        const { xyz, win, starts } = set
        for (let li = 0; li < starts.length - 1; li++) {
          let px = 0, py = 0, pv = false, pw = 0
          for (let j = starts[li]; j < starts[li + 1]; j++) {
            proj(xyz[j * 3], xyz[j * 3 + 1], xyz[j * 3 + 2], p)
            if (p[2] <= 0.03) { pv = false; continue }
            const x = cx + p[0] * R, y = cy - p[1] * R
            if (pv) {
              const tgt = fadeIn && win[j] && pw ? pIn : pOut
              tgt.moveTo(px, py); tgt.lineTo(x, y)
            }
            px = x; py = y; pv = true; pw = win[j]
          }
        }
        ctx.lineWidth = width
        ctx.strokeStyle = color
        ctx.globalAlpha = alphaMul
        ctx.stroke(pOut)
        if (fadeIn && fine < 0.98) { ctx.globalAlpha = alphaMul * (1 - fine); ctx.stroke(pIn) }
        ctx.globalAlpha = 1
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const lw = 0.6 + 0.25 * ds
      // Grenzen unter den Küsten; globale Linien im Europa-Fenster blenden beim Zoomen aus
      strokeLines(LINES.border, 1, 'rgba(255,255,255,0.34)', lw, true)
      strokeLines(LINES.coast, 1, 'rgba(170,222,255,0.62)', lw + 0.4, true)
      if (fine > 0.02) {
        strokeLines(LINES.borderEu, fine, 'rgba(255,255,255,0.4)', lw + 0.1, false)
        strokeLines(LINES.coastEu, fine, 'rgba(170,222,255,0.7)', lw + 0.5, false)
      }

      // ── Länder- und Kontinentnamen ──
      const placed = []
      const overlaps = (x0, y0, x1, y1) => placed.some(r => x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1])
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      LABELS.forEach(lb => {
        let a
        if (lb.cont) a = 1 - smooth(1.25, 1.7, view.zoom)
        else a = smooth(lb.z - 0.2, lb.z + 0.05, view.zoom)
        if (a < 0.03) return
        proj(lb.v[0], lb.v[1], lb.v[2], q)
        if (q[2] < 0.3) return
        const x = cx + q[0] * R, y = cy - q[1] * R
        if (x < 6 || x > w - 6 || y < 6 || y > h - 6) return
        const fs = lb.cont ? 12 : Math.round(11 + 1.2 * Math.min(Math.max(view.zoom - lb.z, 0), 3))
        const font = `${lb.cont ? 700 : 600} ${fs}px Inter, -apple-system, sans-serif`
        if (lb.cont && hasLetterSpacing) ctx.letterSpacing = '3px'
        const tw = measure(lb.t, font) + (lb.cont ? lb.t.length * 3 : 0)
        const x0 = x - tw / 2 - 3, x1 = x + tw / 2 + 3, y0 = y - fs / 2 - 2, y1 = y + fs / 2 + 2
        if (overlaps(x0, y0, x1, y1)) { if (hasLetterSpacing) ctx.letterSpacing = '0px'; return }
        placed.push([x0, y0, x1, y1])
        ctx.font = font
        const al = a * smooth(0.3, 0.7, q[2])
        ctx.globalAlpha = al * (lb.cont ? 0.55 : 0.9)
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(4,10,24,0.85)'
        ctx.strokeText(lb.t, x, y)
        ctx.fillStyle = lb.cont ? '#cfe6ff' : '#ffffff'
        ctx.fillText(lb.t, x, y)
        if (hasLetterSpacing) ctx.letterSpacing = '0px'
      })
      ctx.globalAlpha = 1

      // ── Bögen + Impulse (additiv → leuchtet) ──
      ctx.globalCompositeOperation = 'lighter'
      ARCS.forEach((a, ai) => {
        const va = arcA[ai]
        if (va < 0.02) return
        ctx.lineWidth = 0.9 + 0.3 * ds
        ctx.strokeStyle = `rgba(255,190,100,${0.4 * va})`
        ctx.beginPath()
        let pen = false
        for (let s = 0; s <= ARC_STEPS; s++) {
          proj(a.pts[s * 3], a.pts[s * 3 + 1], a.pts[s * 3 + 2], q)
          if (q[2] <= 0.02) { pen = false; continue }
          const x = cx + q[0] * R, y = cy - q[1] * R
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true }
        }
        ctx.stroke()
        const ph = reduced ? a.phase : (t * a.speed + a.phase) % 1
        const head = ph * ARC_STEPS
        const tail = Math.max(0, head - 7)
        ctx.lineWidth = 1.3 + 0.4 * ds
        ctx.strokeStyle = `rgba(255,236,190,${0.8 * va})`
        ctx.beginPath()
        pen = false
        for (let s = Math.floor(tail); s <= Math.min(ARC_STEPS, Math.ceil(head)); s++) {
          proj(a.pts[s * 3], a.pts[s * 3 + 1], a.pts[s * 3 + 2], q)
          if (q[2] <= 0.02) { pen = false; continue }
          const x = cx + q[0] * R, y = cy - q[1] * R
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true }
        }
        ctx.stroke()
      })
      ctx.globalCompositeOperation = 'source-over'

      // ── Marker: Größe nach Platz, bei Gedränge schrumpft der Marker zum Punkt ──
      const S = Math.max(30, Math.min(46, w * 0.062)) * (0.85 + 0.15 * Math.min(view.zoom, 2))
      const screen = []
      NODES.forEach(n => {
        const va = nodeA[n.i]
        if (va < 0.02) return
        proj(n.v[0], n.v[1], n.v[2], q)
        if (q[2] <= 0.1) return
        const x = cx + q[0] * R, y = cy - q[1] * R
        if (x < -S || x > w + S || y < -S || y > h + S) return
        screen.push({ n, x, y, z: q[2], va })
      })
      // Platzvergabe: „Du“ zuerst, dann Events, Gemeinden, Geschwister
      const order = [...screen].sort((a, b) => ((st != null && a.n.i === 0) ? -1 : a.n.prio) - ((st != null && b.n.i === 0) ? -1 : b.n.prio) || b.z - a.z)
      const full = []
      order.forEach(s => {
        const ok = !full.some(o => Math.hypot(o.x - s.x, o.y - s.y) < S * 0.92)
        if (ok) full.push(s)
        const target = ok ? 1 : 0
        nodeF[s.n.i] += (target - nodeF[s.n.i]) * Math.min(1, reduced ? 1 : dt * 6)
      })
      screen.sort((a, b) => a.z - b.z)
      screen.forEach(s => {
        const depth = smooth(0.1, 0.35, s.z)
        drawMarker(ctx, s.n, s.x, s.y, S, nodeF[s.n.i], t, s.va * depth, st != null && s.n.i === 0, reduced)
      })

      // ── Aktivitäts-Hinweis (wechselt von Marker zu Marker) ──
      const label = (x, y, text, a, S2) => {
        const fs = w < 480 ? 11 : 12
        const font = `600 ${fs}px Inter, -apple-system, sans-serif`
        const tw = measure(text, font)
        const bw = tw + 26, bh = fs + 14
        let bx = x + S2 * 0.45, by = y - S2 * 0.5 - bh
        bx = Math.max(8, Math.min(w - bw - 8, bx))
        by = Math.max(8, Math.min(h - bh - 8, by))
        ctx.globalAlpha = a
        roundRect(ctx, bx, by, bw, bh, bh / 2)
        ctx.fillStyle = 'rgba(8,16,36,0.88)'; ctx.fill()
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke()
        ctx.fillStyle = '#FFD60A'
        ctx.beginPath(); ctx.arc(bx + 11, by + bh / 2, 3, 0, TWO_PI); ctx.fill()
        ctx.font = font
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
        ctx.fillText(text, bx + 19, by + bh / 2 + 0.5)
        ctx.globalAlpha = 1
      }
      if (!reduced) {
        if (t > chip.next && chip.node < 0) {
          const cand = screen.filter(s => s.va > 0.9 && s.z > 0.45 && nodeF[s.n.i] > 0.9 && s.n.i !== chip.lastNode && !(st != null && s.n.i === 0))
          if (cand.length) {
            chip.node = cand[Math.floor(Math.random() * cand.length)].n.i
            chip.start = t
          } else chip.next = t + 1
        }
        if (chip.node >= 0) {
          const age = t - chip.start
          const s = screen.find(o => o.n.i === chip.node)
          if (age > 3.4 || !s || s.z < 0.3 || nodeF[chip.node] < 0.8) {
            chip.lastNode = chip.node
            chip.node = -1
            chip.next = t + 0.7
          } else {
            const a = Math.min(1, age / 0.35, (3.4 - age) / 0.5)
            label(s.x, s.y, `${s.n.msg} · ${s.n.n}`, Math.max(0, a), S)
          }
        }
      }
    }

    function loop(now) {
      raf = 0
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000 || 0)
      last = now
      draw(now, dt)
      raf = requestAnimationFrame(loop)
    }
    function start() {
      if (reduced || running || !visible || document.hidden) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }
    function stop() {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    t0 = performance.now()
    // Bei reduzierter Bewegung: Standbild, nach Änderungen neu zeichnen
    redrawRef.current = () => { if (reduced && w) draw(performance.now(), 1) }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      visible ? start() : stop()
    }, { rootMargin: '120px' })
    io.observe(wrap)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    resize()
    if (reduced) { t0 = performance.now() - 6000; draw(performance.now(), 1); draw(performance.now(), 1) }

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      redrawRef.current = () => {}
    }
  }, [fit])

  return (
    <div ref={wrapRef} className={className}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        role="img"
        aria-label="Animierte Weltkugel mit Ländern und Kontinenten: Geschwister, Events und Hausgemeinden auf allen Kontinenten sind durch leuchtende Linien miteinander verbunden. Symbolische Darstellung."
      />
    </div>
  )
}
