import { useEffect, useRef } from 'react'
import { LAND, LAND_EU } from '../../lib/worldDots'

// Animierte Weltkugel der Landingpage: Land als Punktraster, Städte als
// leuchtende Knoten, dazwischen Lichtbögen mit wandernden Impulsen – die
// Vision „Christen weltweit untereinander verbunden“. Reine Illustration
// (keine echten Nutzerdaten). Canvas statt SVG/WebGL: ~2.300 Punkte + ~60
// Bögen laufen damit auch auf schwachen Handys flüssig.
//
// `stage` (0–3) blendet das Netz stufenweise auf (Umfeld → Gemeinde →
// Netzwerk → weltweit) und fährt auf Europa heran; `null` = alles sichtbar,
// Kugel dreht sich frei (Hero).

const D2R = Math.PI / 180
const TWO_PI = Math.PI * 2

// tier: ab welcher Stufe der Knoten erscheint
const NODE_DEFS = [
  { n: 'Frankfurt', lat: 50.11, lon: 8.68, tier: 0, msg: 'Gebet für Familie' },
  { n: 'Köln', lat: 50.94, lon: 6.96, tier: 0, msg: 'Hauskreis' },
  { n: 'Stuttgart', lat: 48.78, lon: 9.18, tier: 0, msg: 'Bibelstudium' },
  { n: 'Würzburg', lat: 49.79, lon: 9.93, tier: 0, msg: 'Lobpreisabend' },
  { n: 'Hamburg', lat: 53.55, lon: 9.99, tier: 1, msg: 'Gebetskreis' },
  { n: 'München', lat: 48.14, lon: 11.58, tier: 1, msg: 'Neues Zeugnis' },
  { n: 'Berlin', lat: 52.52, lon: 13.4, tier: 1, msg: 'Jugendkreis' },
  { n: 'Zürich', lat: 47.37, lon: 8.54, tier: 1, msg: 'Gebetsabend' },
  { n: 'Wien', lat: 48.21, lon: 16.37, tier: 1, msg: 'Bibelstudium' },
  { n: 'London', lat: 51.5, lon: -0.12, tier: 2, msg: 'Gebet erhört' },
  { n: 'Paris', lat: 48.86, lon: 2.35, tier: 2, msg: 'Hauskreis' },
  { n: 'Madrid', lat: 40.42, lon: -3.7, tier: 2, msg: 'Lobpreis' },
  { n: 'Rom', lat: 41.9, lon: 12.5, tier: 2, msg: 'Gebetskreis' },
  { n: 'Warschau', lat: 52.23, lon: 21.0, tier: 2, msg: 'Neues Zeugnis' },
  { n: 'Stockholm', lat: 59.33, lon: 18.07, tier: 2, msg: 'Bibelstudium' },
  { n: 'Athen', lat: 37.98, lon: 23.73, tier: 2, msg: 'Hauskreis' },
  { n: 'Kyiv', lat: 50.45, lon: 30.52, tier: 2, msg: 'Gebetsabend' },
  { n: 'Nairobi', lat: -1.29, lon: 36.82, tier: 3, msg: 'Lobpreis' },
  { n: 'Lagos', lat: 6.52, lon: 3.38, tier: 3, msg: 'Gebet erhört' },
  { n: 'Johannesburg', lat: -26.2, lon: 28.05, tier: 3, msg: 'Gemeindegründung' },
  { n: 'New York', lat: 40.71, lon: -74.0, tier: 3, msg: 'Gebetsfrühstück' },
  { n: 'Toronto', lat: 43.65, lon: -79.38, tier: 3, msg: 'Hauskreis' },
  { n: 'Los Angeles', lat: 34.05, lon: -118.24, tier: 3, msg: 'Bibelstudium' },
  { n: 'Mexiko-Stadt', lat: 19.43, lon: -99.13, tier: 3, msg: 'Gebetskreis' },
  { n: 'Lima', lat: -12.05, lon: -77.04, tier: 3, msg: 'Lobpreis' },
  { n: 'São Paulo', lat: -23.55, lon: -46.63, tier: 3, msg: 'Neues Zeugnis' },
  { n: 'Mumbai', lat: 19.08, lon: 72.88, tier: 3, msg: 'Hauskreis' },
  { n: 'Singapur', lat: 1.35, lon: 103.82, tier: 3, msg: 'Gebetsabend' },
  { n: 'Manila', lat: 14.6, lon: 120.98, tier: 3, msg: 'Hauskreis' },
  { n: 'Seoul', lat: 37.57, lon: 126.98, tier: 3, msg: 'Morgengebet' },
  { n: 'Sydney', lat: -33.87, lon: 151.21, tier: 3, msg: 'Bibelstudium' },
  { n: 'Kapstadt', lat: -33.92, lon: 18.42, tier: 3, msg: 'Gebet erhört' },
]
// Fernverbindungen (immer Stufe 3)
const LONG_LINKS = [
  ['Frankfurt', 'New York'], ['Frankfurt', 'Nairobi'], ['Madrid', 'São Paulo'],
  ['Stockholm', 'Seoul'], ['New York', 'São Paulo'], ['Paris', 'Lagos'], ['Nairobi', 'Mumbai'],
  ['Seoul', 'Sydney'], ['Manila', 'Sydney'], ['Lagos', 'São Paulo'],
  ['Los Angeles', 'Seoul'], ['London', 'Toronto'], ['Johannesburg', 'Sydney'],
]

const STAGE_VIEW = [
  { lon: 9, lat: 47, zoom: 3.0 },
  { lon: 10, lat: 46, zoom: 2.4 },
  { lon: 14, lat: 36, zoom: 1.5 },
]
const HERO_LAT = 24
const ARC_STEPS = 44

function toXYZ(lat, lon) {
  const p = lat * D2R
  const l = lon * D2R
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)]
}

// Statische Geometrie einmal pro Modul aufbauen
const DOTS = (() => {
  const a = new Float32Array((LAND.length / 2) * 3)
  for (let i = 0; i < LAND.length; i += 2) {
    const v = toXYZ(LAND[i] / 10, LAND[i + 1] / 10)
    a.set(v, (i / 2) * 3)
  }
  return a
})()

// Feines Europa-Raster: nur sichtbar, wenn die Kamera nah heranfährt
const DOTS_EU = (() => {
  const a = new Float32Array((LAND_EU.length / 2) * 3)
  for (let i = 0; i < LAND_EU.length; i += 2) a.set(toXYZ(LAND_EU[i] / 10, LAND_EU[i + 1] / 10), (i / 2) * 3)
  return a
})()
// Grobe Punkte im Europa-Fenster werden beim Heranzoomen durch das feine Raster ersetzt
const IN_EU = (() => {
  const f = new Uint8Array(LAND.length / 2)
  for (let i = 0; i < LAND.length; i += 2) {
    const lat = LAND[i] / 10, lon = LAND[i + 1] / 10
    f[i / 2] = lat >= 30 && lat <= 66 && lon >= -15 && lon <= 40 ? 1 : 0
  }
  return f
})()

const NODES = NODE_DEFS.map((d, i) => ({ ...d, i, v: toXYZ(d.lat, d.lon) }))

const ARCS = (() => {
  const byName = Object.fromEntries(NODES.map(n => [n.n, n]))
  const dist = (a, b) => Math.acos(Math.min(1, a.v[0] * b.v[0] + a.v[1] * b.v[1] + a.v[2] * b.v[2]))
  const seen = new Set()
  const pairs = []
  const add = (a, b, tier) => {
    const key = a.i < b.i ? `${a.i}-${b.i}` : `${b.i}-${a.i}`
    if (seen.has(key)) return
    seen.add(key)
    pairs.push([a, b, tier])
  }
  // jeder Knoten verbindet sich mit seinen 2 nächsten Nachbarn derselben oder früheren Stufe
  NODES.forEach(a => {
    NODES.filter(b => b !== a && b.tier <= a.tier)
      .sort((x, y) => dist(a, x) - dist(a, y))
      .slice(0, a.tier === 0 ? 2 : 2)
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

function shortAngle(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180
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

export default function NetworkGlobe({ stage = null, className = '', fit = 'hero' }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const stageRef = useRef(stage)
  const redrawRef = useRef(() => {})

  useEffect(() => {
    stageRef.current = stage
    redrawRef.current()
  }, [stage])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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
    const arcA = new Float32Array(ARCS.length)
    const chip = { node: -1, start: -10, lastNode: -1, next: 1.2 }

    function resize() {
      const r = wrap.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      draw(performance.now(), 0)
    }

    function targetView(st) {
      if (st == null) return null
      return STAGE_VIEW[st] || null
    }

    function draw(now, dt) {
      const st = stageRef.current
      const showTier = st == null ? 3 : st
      const t = (now - t0) / 1000

      // Kamera
      const tv = targetView(st)
      const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6)
      if (tv) {
        // auf schmalen Bildschirmen weniger stark heranfahren (Punktraster bleibt dicht genug)
        const tz = w < 500 ? 1 + (tv.zoom - 1) * 0.6 : tv.zoom
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
      NODES.forEach(n => {
        const delay = st == null ? 0.3 + n.i * 0.07 : 0
        const target = n.tier <= showTier && t > delay ? 1 : 0
        nodeA[n.i] += (target - nodeA[n.i]) * ak
      })
      ARCS.forEach((a, i) => {
        const delay = st == null ? 0.9 + i * 0.05 : 0
        const target = a.tier <= showTier && t > delay ? 1 : 0
        arcA[i] += (target - arcA[i]) * ak
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
      const ds = Math.sqrt(view.zoom)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Atmosphäre
      let g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.32)
      g.addColorStop(0, 'rgba(70,150,255,0.34)')
      g.addColorStop(0.45, 'rgba(60,120,255,0.12)')
      g.addColorStop(1, 'rgba(60,120,255,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.32, 0, TWO_PI); ctx.fill()

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

      // Land: grobes Raster weltweit, beim Heranzoomen feines Raster über Europa
      ctx.fillStyle = '#8fd0ff'
      const fine = Math.max(0, Math.min(1, (view.zoom - 1.3) / 0.5))
      const dsz = 1.15 + 0.75 * Math.pow(Math.min(view.zoom, 2), 0.7)
      for (let i = 0; i < DOTS.length; i += 3) {
        proj(DOTS[i], DOTS[i + 1], DOTS[i + 2], p)
        if (p[2] <= 0.02) continue
        const fade = IN_EU[i / 3] ? 1 - fine : 1
        if (fade < 0.02) continue
        ctx.globalAlpha = (0.2 + 0.7 * Math.pow(p[2], 0.9)) * fade
        const s = dsz * (0.55 + 0.6 * p[2])
        ctx.fillRect(cx + p[0] * R - s / 2, cy - p[1] * R - s / 2, s, s)
      }
      if (fine > 0.02) {
        const fs = 1.3 + 0.35 * Math.min(view.zoom, 4)
        for (let i = 0; i < DOTS_EU.length; i += 3) {
          proj(DOTS_EU[i], DOTS_EU[i + 1], DOTS_EU[i + 2], p)
          if (p[2] <= 0.02) continue
          const x = cx + p[0] * R, y = cy - p[1] * R
          if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue
          ctx.globalAlpha = (0.22 + 0.7 * Math.pow(p[2], 0.9)) * fine
          ctx.fillRect(x - fs / 2, y - fs / 2, fs, fs)
        }
      }
      ctx.globalAlpha = 1

      // Bögen + Impulse (additiv → leuchtet)
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const q = [0, 0, 0]
      ARCS.forEach((a, ai) => {
        const va = arcA[ai]
        if (va < 0.02) return
        // Linie
        ctx.lineWidth = 0.9 + 0.3 * ds
        ctx.strokeStyle = `rgba(255,190,100,${0.34 * va})`
        ctx.beginPath()
        let pen = false
        for (let s = 0; s <= ARC_STEPS; s++) {
          proj(a.pts[s * 3], a.pts[s * 3 + 1], a.pts[s * 3 + 2], q)
          if (q[2] <= 0.02) { pen = false; continue }
          const x = cx + q[0] * R, y = cy - q[1] * R
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true }
        }
        ctx.stroke()
        // wandernder Impuls
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

      // Knoten
      const screen = new Array(NODES.length)
      NODES.forEach(n => {
        const va = nodeA[n.i]
        if (va < 0.02) return
        proj(n.v[0], n.v[1], n.v[2], q)
        if (q[2] <= 0.05) return
        const x = cx + q[0] * R, y = cy - q[1] * R
        screen[n.i] = [x, y, q[2], va]
        const me = n.i === 0 && st != null
        const sc = (me ? 1.5 : 1) * (0.8 + 0.35 * ds)
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 12 * sc)
        gr.addColorStop(0, `rgba(255,205,110,${0.5 * va})`)
        gr.addColorStop(1, 'rgba(255,170,60,0)')
        ctx.fillStyle = gr
        ctx.beginPath(); ctx.arc(x, y, 12 * sc, 0, TWO_PI); ctx.fill()
        ctx.fillStyle = `rgba(255,240,200,${va})`
        ctx.beginPath(); ctx.arc(x, y, 2.3 * sc, 0, TWO_PI); ctx.fill()
        if (!reduced) {
          const rp = (t * 0.6 + n.i * 0.21) % 1
          ctx.strokeStyle = `rgba(255,210,130,${(1 - rp) * 0.55 * va})`
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(x, y, (3 + 11 * rp) * sc, 0, TWO_PI); ctx.stroke()
        }
      })
      ctx.globalCompositeOperation = 'source-over'

      // Beschriftungen: „Du“ (Staffelung) + wechselnde Aktivitäten
      const label = (x, y, text, a, strong, below) => {
        const fs = w < 480 ? 11 : 12
        ctx.font = `600 ${fs}px Inter, -apple-system, sans-serif`
        const tw = ctx.measureText(text).width
        const bw = tw + 26, bh = fs + 14
        let bx = x + 12, by = below ? y + 10 : y - bh - 8
        bx = Math.max(8, Math.min(w - bw - 8, bx))
        by = Math.max(8, Math.min(h - bh - 8, by))
        ctx.globalAlpha = a
        roundRect(ctx, bx, by, bw, bh, bh / 2)
        ctx.fillStyle = strong ? 'rgba(255,214,10,0.95)' : 'rgba(8,16,36,0.82)'
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = strong ? 'rgba(255,214,10,1)' : 'rgba(255,255,255,0.2)'
        ctx.stroke()
        if (!strong) {
          ctx.fillStyle = '#FFD60A'
          ctx.beginPath(); ctx.arc(bx + 11, by + bh / 2, 3, 0, TWO_PI); ctx.fill()
        }
        ctx.fillStyle = strong ? '#000' : '#fff'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, bx + (strong ? 13 : 19), by + bh / 2 + 0.5)
        ctx.globalAlpha = 1
      }
      if (st != null && screen[0]) label(screen[0][0], screen[0][1], 'Du', Math.min(1, screen[0][3]), true, true)

      if (!reduced) {
        if (t > chip.next && chip.node < 0) {
          const cand = screen.map((s, i) => (s && s[3] > 0.9 && s[2] > 0.4 && i !== chip.lastNode && !(st != null && i === 0) ? i : -1)).filter(i => i >= 0)
          if (cand.length) {
            chip.node = cand[Math.floor(Math.random() * cand.length)]
            chip.start = t
          } else chip.next = t + 1
        }
        if (chip.node >= 0) {
          const age = t - chip.start
          const s = screen[chip.node]
          if (age > 3.4 || !s || s[2] < 0.3) {
            chip.lastNode = chip.node
            chip.node = -1
            chip.next = t + 0.7
          } else {
            const a = Math.min(1, age / 0.35, (3.4 - age) / 0.5)
            const nd = NODES[chip.node]
            label(s[0], s[1], `${nd.msg} · ${nd.n}`, Math.max(0, a), false)
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
    // Bei reduzierter Bewegung: Standbild, nach Stufenwechsel neu zeichnen
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
    if (reduced) { t0 = performance.now() - 6000; draw(performance.now(), 1) }

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
        aria-label="Animierte Weltkugel: Christen auf allen Kontinenten sind durch leuchtende Linien miteinander verbunden. Symbolische Darstellung."
      />
    </div>
  )
}
