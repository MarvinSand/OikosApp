import { useCallback, useEffect, useRef, useState } from 'react'
import { HandHeart } from 'lucide-react'

// Oikos-Motion-Graphic „Gebet vermehrt sich“: Dein Umfeld als Kreis (wie die
// Oikos Map der App). Wer für jemanden betet, schickt einen Lichtstrahl nach
// oben. Kommt ein Mensch zum Glauben, wird er golden, bekommt ein Kreuz-Siegel
// und sein eigenes Umfeld wächst um ihn herum: neue Menschen, für die er jetzt
// selbst betet. Daraus werden Generationen, das Netz wächst multiplikativ und
// der Himmel wird heller. Tippen löst ein Gebet aus, ohne Eingabe läuft es von
// selbst. Reine Illustration, keine echten Nutzerdaten.

const TWO_PI = Math.PI * 2
const RING = [
  { n: 'Mama', c: '#FFA726' }, { n: 'Papa', c: '#FFA726' }, { n: 'Oma', c: '#FFA726' }, { n: 'Lisa', c: '#FFA726' },
  { n: 'Ben', c: '#42A5F5' }, { n: 'Lukas', c: '#42A5F5' }, { n: 'Mia', c: '#42A5F5' },
  { n: 'Anna', c: '#66BB6A' }, { n: 'Sven', c: '#66BB6A' }, { n: 'Kai', c: '#66BB6A' },
  { n: 'Nora', c: '#EC407A' }, { n: 'Pastor', c: '#E8E2D6' },
]
const NEW_NAMES = ['Jonas', 'Emma', 'Tim', 'Sara', 'Paul', 'Lea', 'Noah', 'Mira', 'Elias', 'Hanna', 'Finn', 'Ruth', 'David', 'Eva', 'Jan', 'Lena', 'Ole', 'Mina', 'Tom', 'Joy', 'Ben', 'Amy', 'Luis', 'Nele', 'Max', 'Ida', 'Karl', 'Zoe', 'Levi', 'Maja', 'Ali', 'Rosa', 'Eli', 'Tina', 'Moritz', 'Clara', 'Nico', 'Jule', 'Sami', 'Greta']
const TINTS = ['#7FD1F5', '#86E3C3', '#C3A6FF', '#FFC27A', '#F6A6C1', '#A7E36F']
const GOLD = '#F6C177'
const GOLD_LIGHT = '#FFF1C9'
const RING_RX = 250
const RING_RY = 150
const CAP = 62
const BEAM_S = 1.5
const KIDS = [0, 3, 2, 2, 0]
const NEED = [0, 2, 1, 1, 1]
const RADIUS = [34, 26, 18, 14, 11]

const smooth = (t) => t * t * (3 - 2 * t)
const rand = (a, b) => a + Math.random() * (b - a)

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export default function PrayerField({ className = '' }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const apiRef = useRef({ pray: () => {}, reset: () => {} })
  const [stats, setStats] = useState({ prayers: 0, saved: 0, reached: 0, gen: 1 })

  const pray = useCallback(() => apiRef.current.pray(), [])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1, raf = 0, running = false, visible = false, last = 0, t = 0
    let nodes = []
    let beams = [], particles = [], ripples = [], pending = [], chips = []
    let prayers = 0, light = 0, nextAuto = 0.5, quietUntil = 0, doneAt = -1, hover = null
    let nameIdx = 0
    let fade = 1, resetting = false
    let idc = 0
    const cam = { x: 0, y: 0, s: 0.7 }
    const stars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.55, r: rand(0.4, 1.3), p: Math.random() * 6 }))
    let shown = { prayers: -1, saved: -1, reached: -1, gen: -1 }

    function makeNode(o) {
      return { id: idc++, name: '', c: '#fff', gen: 1, parent: null, x: 0, y: 0, vx: 0, vy: 0, fixed: false, state: 'open', prayers: 0, born: t, glow: 0, pulse: 0, saveT: -9, sx: 0, sy: 0, sr: 0, ...o }
    }
    function init() {
      nodes = []; beams = []; particles = []; ripples = []; pending = []; chips = []
      prayers = 0; light = 0; doneAt = -1; nextAuto = t + 0.5; nameIdx = Math.floor(Math.random() * NEW_NAMES.length)
      idc = 0
      const root = makeNode({ name: 'Du', c: '#fff', gen: 0, fixed: true, born: -9 })
      root.state = 'saved'
      nodes.push(root)
      RING.forEach((p, i) => {
        const a = -Math.PI / 2 + (i / RING.length) * TWO_PI + 0.18
        nodes.push(makeNode({ name: p.n, c: p.c, gen: 1, parent: root, fixed: true, x: Math.cos(a) * RING_RX, y: Math.sin(a) * RING_RY, born: -9 }))
      })
    }
    const R = (n) => RADIUS[Math.min(n.gen, RADIUS.length - 1)]
    const kidsOf = (n) => nodes.filter(k => k.parent === n)

    function spawnKids(n) {
      const want = KIDS[Math.min(n.gen, KIDS.length - 1)]
      const k = Math.max(0, Math.min(want, CAP - nodes.length))
      const outward = Math.atan2(n.y, n.x || 0.001)
      for (let i = 0; i < k; i++) {
        const a = outward + (i - (k - 1) / 2) * 0.7 + rand(-0.12, 0.12)
        const gen = n.gen + 1
        const name = NEW_NAMES[nameIdx++ % NEW_NAMES.length]
        const kid = makeNode({ name, c: TINTS[(nameIdx + i) % TINTS.length], gen, parent: n, x: n.x + Math.cos(a) * 20, y: n.y + Math.sin(a) * 20, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 })
        nodes.push(kid)
        beams.push({ n: kid, t0: t + 0.2 + i * 0.25, born: true })
      }
      return k
    }

    function pushChip(n, text, kind) {
      chips = chips.filter(c => c.n !== n)
      chips.push({ n, text, t0: t, kind })
      if (chips.length > (w < 500 ? 2 : 3)) chips.shift()
    }

    function burst(x, y, k, c) {
      for (let i = 0; i < k; i++) {
        const a = rand(0, TWO_PI), s = rand(30, 170)
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0, max: rand(0.8, 1.7), c, r: rand(1, 2.7) })
      }
    }

    function savedBy(n) {
      n.state = 'saved'
      n.saveT = t
      n.pulse = 1.4
      light = Math.min(1, light + 0.16)
      burst(n.sx, n.sy, 36, '#ffe6a8')
      ripples.push({ x: n.sx, y: n.sy, t0: t, c: GOLD, big: true })
      pushChip(n, `${n.name} hat Jesus kennengelernt`, 'saved')
      pending.push({ t: t + 0.9, n })
    }

    function prayFor(n) {
      n.prayers += 1
      n.pulse = Math.max(n.pulse, 1)
      n.glow = 1
      beams.push({ n, t0: t })
      ripples.push({ x: n.sx, y: n.sy, t0: t, c: n.c })
      prayers += 1
      if (n.state === 'open') {
        pushChip(n, `Gebet für ${n.name}`, 'pray')
        const savedSoFar = nodes.filter(x => x.gen > 0 && (x.state === 'saved' || x.willSave)).length
        // die ersten beiden kommen schon nach einem Gebet zum Glauben: das Wachstum startet sofort
        const need = savedSoFar < 2 ? 1 : NEED[Math.min(n.gen, NEED.length - 1)]
        if (n.prayers >= need) {
          n.willSave = true
          n.saveAt = t + BEAM_S + 0.1
        }
      } else pushChip(n, `Gebet für ${n.name}`, 'pray')
      if (reduced) settleStatic()
    }

    function pickAuto() {
      const open = nodes.filter(n => n.state === 'open' && !n.willSave && n.gen > 0)
      if (!open.length) return null
      const weighted = open.flatMap(n => (n.prayers > 0 ? [n, n, n] : [n]))
      return weighted[Math.floor(Math.random() * weighted.length)]
    }

    apiRef.current.pray = () => {
      quietUntil = t + 9
      const n = pickAuto()
      if (n) prayFor(n)
      else if (!resetting) { resetting = true }
    }
    apiRef.current.reset = () => { quietUntil = t + 4; resetting = true }

    // ── Layout: Federn zum Elternknoten + Abstoßung, Ring ist fixiert ──
    function simulate(dt) {
      const free = nodes.filter(n => !n.fixed)
      for (const n of free) {
        const p = n.parent
        const L = 72 + 30 / Math.max(1, n.gen - 1) + (n.gen === 2 ? 24 : 0)
        const dx = n.x - p.x, dy = n.y - p.y
        const d = Math.hypot(dx, dy) || 1
        const f = (d - L) * 7
        n.vx -= (dx / d) * f * dt
        n.vy -= (dy / d) * f * dt
        // leichter Zug nach außen, damit das Netz auffächert
        const od = Math.hypot(n.x, n.y) || 1
        n.vx += (n.x / od) * 16 * dt
        n.vy += (n.y / od) * 16 * dt
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          if (a.fixed && b.fixed) continue
          const dx = b.x - a.x, dy = b.y - a.y
          const min = R(a) + R(b) + 26
          const d2 = dx * dx + dy * dy
          if (d2 > min * min * 2.2) continue
          const d = Math.sqrt(d2) || 0.01
          if (d < min * 1.45) {
            const push = (min * 1.45 - d) * 9 * dt
            const ux = dx / d, uy = dy / d
            if (!a.fixed) { a.vx -= ux * push; a.vy -= uy * push }
            if (!b.fixed) { b.vx += ux * push; b.vy += uy * push }
          }
        }
      }
      const damp = Math.pow(0.04, dt)
      for (const n of free) {
        n.vx *= damp; n.vy *= damp
        n.x += n.vx * dt; n.y += n.vy * dt
      }
    }
    function settleStatic() {
      // Standbild (reduzierte Bewegung): Struktur sofort ausrechnen
      pending.splice(0).forEach(p => spawnKids(p.n))
      nodes.forEach(n => { if (n.willSave && n.state === 'open') { n.state = 'saved'; n.willSave = false; spawnKids(n) } })
      for (let i = 0; i < 260; i++) simulate(1 / 60)
      beams = []
      snapCamera()
      draw(0)
    }

    function bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const n of nodes) {
        const r = R(n) + 26
        x0 = Math.min(x0, n.x - r); x1 = Math.max(x1, n.x + r)
        y0 = Math.min(y0, n.y - r); y1 = Math.max(y1, n.y + r)
      }
      return [x0, y0, x1, y1]
    }
    function camTarget() {
      const [x0, y0, x1, y1] = bounds()
      const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0)
      const s = Math.max(0.28, Math.min(1.3, Math.min((w * 0.96) / bw, (h * 0.8) / bh)))
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, s }
    }
    function snapCamera() { const c = camTarget(); cam.x = c.x; cam.y = c.y; cam.s = c.s }

    function resize() {
      const r = wrap.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      snapCamera()
      draw(0)
    }

    function updateStats() {
      const saved = nodes.filter(n => n.gen > 0 && n.state === 'saved').length
      const reached = nodes.length - 1
      const gen = Math.max(1, ...nodes.map(n => n.gen))
      if (shown.prayers !== prayers || shown.saved !== saved || shown.reached !== reached || shown.gen !== gen) {
        shown = { prayers, saved, reached, gen }
        setStats({ prayers, saved, reached, gen })
      }
    }

    function pick(x, y) {
      let best = null, bd = Infinity
      for (const n of nodes) {
        if (n.gen === 0) continue
        const d = Math.hypot(n.sx - x, n.sy - y)
        if (d < Math.max(n.sr * 1.3, 16) && d < bd) { bd = d; best = n }
      }
      return best
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const onMove = (e) => { const [x, y] = pos(e); const k = pick(x, y); if (k !== hover) { hover = k; canvas.style.cursor = k ? 'pointer' : 'default' } }
    const onLeave = () => { hover = null; canvas.style.cursor = 'default' }
    const onDown = (e) => { const [x, y] = pos(e); const k = pick(x, y); if (k) { quietUntil = t + 9; prayFor(k) } }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointerdown', onDown)

    function toScreen(n) {
      n.sx = w / 2 + (n.x - cam.x) * cam.s
      n.sy = h * 0.54 + (n.y - cam.y) * cam.s
      n.sr = R(n) * cam.s
    }

    function draw(dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      nodes.forEach(toScreen)
      const saved = nodes.filter(n => n.gen > 0 && n.state === 'saved').length
      const sky = Math.min(1, Math.max(light, Math.min(0.9, prayers * 0.018 + saved * 0.05)))
      const root = nodes[0]

      // Himmel
      const gx = w / 2
      let g = ctx.createRadialGradient(gx, -h * 0.1, 0, gx, -h * 0.1, h * 1.05)
      g.addColorStop(0, `rgba(255,222,150,${0.1 + 0.62 * sky})`)
      g.addColorStop(0.35, `rgba(246,160,80,${0.04 + 0.26 * sky})`)
      g.addColorStop(1, 'rgba(246,160,80,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      stars.forEach(s => {
        const a = (0.25 + 0.55 * Math.abs(Math.sin(t * 0.8 + s.p))) * (1 - 0.6 * sky)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, TWO_PI); ctx.fill()
      })
      const open = smooth(Math.min(1, sky * 1.15))
      ;[[0.12, 0.1, 0.34], [0.34, 0.16, 0.3], [0.5, 0.06, 0.28], [0.68, 0.15, 0.3], [0.9, 0.09, 0.34]].forEach(([fx, fy, fr], k) => {
        const dir = fx < 0.5 ? -1 : fx > 0.5 ? 1 : (k % 2 ? 1 : -1)
        const x = fx * w + dir * open * w * 0.22 + Math.sin(t * 0.15 + k) * 12
        const y = fy * h
        const rad = fr * w * (0.9 - 0.25 * open)
        const cg = ctx.createRadialGradient(x, y, 0, x, y, rad)
        cg.addColorStop(0, `rgba(6,10,26,${0.62 - 0.5 * open})`)
        cg.addColorStop(1, 'rgba(6,10,26,0)')
        ctx.fillStyle = cg
        ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.5, 0, 0, TWO_PI); ctx.fill()
      })

      ctx.globalAlpha = fade

      // Goldenes Leuchten unter errettete Menschen: das Licht breitet sich aus
      ctx.globalCompositeOperation = 'lighter'
      nodes.forEach(n => {
        if (n.gen === 0 || n.state !== 'saved') return
        const k = Math.min(1, (t - n.saveT) / 1.2)
        const rr = n.sr * (3.4 + 1.4 * (1 - k))
        const hg = ctx.createRadialGradient(n.sx, n.sy, n.sr * 0.5, n.sx, n.sy, rr)
        hg.addColorStop(0, `rgba(255,214,130,${0.34 * k})`)
        hg.addColorStop(1, 'rgba(255,214,130,0)')
        ctx.fillStyle = hg
        ctx.beginPath(); ctx.arc(n.sx, n.sy, rr, 0, TWO_PI); ctx.fill()
      })
      ctx.globalCompositeOperation = 'source-over'

      // Verbindungen
      nodes.forEach(n => {
        const p = n.parent
        if (!p) return
        const age = Math.min(1, (t - n.born) / 0.7)
        const goldLine = p.gen > 0 && p.state === 'saved'
        ctx.lineWidth = goldLine ? 1.6 : 1
        ctx.globalAlpha = fade * (goldLine ? 0.8 : 0.22 + 0.4 * n.glow) * age
        ctx.strokeStyle = goldLine ? GOLD : n.c
        ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(n.sx, n.sy); ctx.stroke()
      })
      ctx.globalAlpha = fade

      // Energie fließt von errettet → Umfeld
      if (!reduced) {
        ctx.globalCompositeOperation = 'lighter'
        nodes.forEach(n => {
          const p = n.parent
          if (!p || p.gen === 0 || p.state !== 'saved') return
          const ph = (t * 0.45 + n.id * 0.37) % 1
          const x = p.sx + (n.sx - p.sx) * ph, y = p.sy + (n.sy - p.sy) * ph
          const gg = ctx.createRadialGradient(x, y, 0, x, y, 7)
          gg.addColorStop(0, 'rgba(255,236,180,0.95)'); gg.addColorStop(1, 'rgba(255,214,130,0)')
          ctx.fillStyle = gg
          ctx.beginPath(); ctx.arc(x, y, 7, 0, TWO_PI); ctx.fill()
        })
        ctx.globalCompositeOperation = 'source-over'
      }

      // Strahlen
      ctx.globalCompositeOperation = 'lighter'
      for (let b = beams.length - 1; b >= 0; b--) {
        const bm = beams[b]
        const n = bm.n
        const k = (t - bm.t0) / BEAM_S
        if (k < 0) continue
        const kk = Math.min(1, k)
        const e = smooth(kk)
        const topY = -40
        const hx = n.sx + Math.sin(t * 2 + n.id) * 6 * kk
        const hy = n.sy + (topY - n.sy) * e
        const fd = kk < 0.85 ? 1 : 1 - (kk - 0.85) / 0.15
        const lg = ctx.createLinearGradient(n.sx, n.sy, hx, hy)
        lg.addColorStop(0, `rgba(255,225,160,${0.95 * fd})`)
        lg.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.strokeStyle = `rgba(255,214,140,${0.16 * fd})`; ctx.lineWidth = Math.max(6, n.sr * 0.9)
        ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(hx, hy); ctx.stroke()
        ctx.strokeStyle = lg; ctx.lineWidth = 2.4
        ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(hx, hy); ctx.stroke()
        if (!reduced && Math.random() < 0.55) particles.push({ x: n.sx + rand(-4, 4), y: n.sy - rand(0, Math.max(1, n.sy - hy)), vx: rand(-10, 10), vy: rand(-60, -20), life: 0, max: rand(0.6, 1.2), c: '#ffe3a8', r: rand(0.8, 1.7) })
        if (kk >= 1) {
          beams.splice(b, 1)
          if (!bm.born) { light = Math.min(1, light + 0.07); burst(hx, 6, 16, '#ffe9bd'); ripples.push({ x: hx, y: 0, t0: t, c: '#ffe3a8' }) }
        }
      }
      for (let p = particles.length - 1; p >= 0; p--) {
        const q = particles[p]
        q.life += dt
        if (q.life > q.max) { particles.splice(p, 1); continue }
        q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 40 * dt
        ctx.fillStyle = q.c
        ctx.globalAlpha = fade * (1 - q.life / q.max) * 0.9
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TWO_PI); ctx.fill()
      }
      ctx.globalAlpha = fade
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i]
        const k = (t - rp.t0) / (rp.big ? 2.2 : 1.6)
        if (k > 1) { ripples.splice(i, 1); continue }
        ctx.strokeStyle = rp.c; ctx.globalAlpha = fade * (1 - k) * (rp.big ? 0.8 : 0.5); ctx.lineWidth = rp.big ? 2.2 : 1.4
        ctx.beginPath(); ctx.arc(rp.x, rp.y, 12 + k * (rp.big ? 110 : 56), 0, TWO_PI); ctx.stroke()
      }
      ctx.globalAlpha = fade
      ctx.globalCompositeOperation = 'source-over'

      // Menschen (tiefe Generationen zuerst, damit Ring/Du oben liegen)
      const order = [...nodes].sort((a, b) => b.gen - a.gen)
      order.forEach(n => {
        if (n.gen === 0) return
        const age = Math.min(1, Math.max(0, (t - n.born) / 0.6))
        if (age <= 0) return
        n.glow = Math.max(n.state === 'saved' ? 0.5 : (n.prayers ? 0.3 : 0), n.glow - dt * 0.35)
        n.pulse = Math.max(0, n.pulse - dt * 1.3)
        const sc = smooth(age) * (1 + 0.16 * n.pulse + (hover === n ? 0.1 : 0))
        const r = n.sr * sc
        if (n.glow > 0.01) {
          const hg = ctx.createRadialGradient(n.sx, n.sy, r * 0.6, n.sx, n.sy, r * (2.1 + n.pulse))
          hg.addColorStop(0, `rgba(255,214,130,${0.5 * n.glow * age})`)
          hg.addColorStop(1, 'rgba(255,214,130,0)')
          ctx.fillStyle = hg
          ctx.beginPath(); ctx.arc(n.sx, n.sy, r * (2.1 + n.pulse), 0, TWO_PI); ctx.fill()
        }
        const isSaved = n.state === 'saved'
        ctx.save()
        ctx.globalAlpha = fade * age
        ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3
        if (isSaved) {
          const fg = ctx.createRadialGradient(n.sx - r * 0.3, n.sy - r * 0.35, r * 0.1, n.sx, n.sy, r)
          fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, GOLD_LIGHT)
          ctx.fillStyle = fg
        } else ctx.fillStyle = n.c
        ctx.beginPath(); ctx.arc(n.sx, n.sy, r, 0, TWO_PI); ctx.fill()
        ctx.restore()
        ctx.globalAlpha = fade * age
        ctx.strokeStyle = isSaved ? GOLD : n.prayers ? 'rgba(255,230,170,0.95)' : 'rgba(255,255,255,0.55)'
        ctx.lineWidth = isSaved ? 2.6 : 2
        ctx.beginPath(); ctx.arc(n.sx, n.sy, Math.max(1, r - 1), 0, TWO_PI); ctx.stroke()
        if (r > 9) {
          ctx.fillStyle = 'rgba(10,14,30,0.85)'
          ctx.font = `700 ${Math.max(8.5, Math.min(14, r * 0.46))}px Inter, -apple-system, sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(n.name, n.sx, n.sy + 0.5)
        }
        if (isSaved) {
          // Kreuz-Siegel
          const br = Math.max(6, r * 0.38)
          const bx = n.sx + r * 0.78, by = n.sy - r * 0.78
          ctx.fillStyle = GOLD
          ctx.beginPath(); ctx.arc(bx, by, br, 0, TWO_PI); ctx.fill()
          ctx.strokeStyle = '#3a2706'; ctx.lineWidth = Math.max(1.4, br * 0.2); ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(bx, by - br * 0.55); ctx.lineTo(bx, by + br * 0.58); ctx.moveTo(bx - br * 0.4, by - br * 0.14); ctx.lineTo(bx + br * 0.4, by - br * 0.14); ctx.stroke()
        }
      })

      // Du
      if (root) {
        const dr = root.sr * 1.2
        const dg = ctx.createRadialGradient(root.sx, root.sy, dr * 0.7, root.sx, root.sy, dr * 2.5)
        dg.addColorStop(0, `rgba(255,255,255,${0.25 + 0.2 * sky})`)
        dg.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = dg
        ctx.beginPath(); ctx.arc(root.sx, root.sy, dr * 2.5, 0, TWO_PI); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(root.sx, root.sy, dr, 0, TWO_PI); ctx.fill()
        ctx.fillStyle = '#05091a'
        ctx.font = `800 ${Math.max(12, dr * 0.55)}px Inter, -apple-system, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('Du', root.sx, root.sy + 1)
      }

      // Hinweise
      ctx.globalAlpha = 1
      chips = chips.filter(c => t - c.t0 < 2.8)
      chips.forEach(c => {
        const age = t - c.t0
        const a = Math.min(1, age / 0.25, (2.8 - age) / 0.5)
        const n = c.n
        const gold = c.kind === 'saved'
        const text = gold ? `✝ ${c.text}` : `🙏 ${c.text}`
        ctx.font = `600 ${gold ? 13 : 12}px Inter, -apple-system, sans-serif`
        const tw = ctx.measureText(text).width
        const bw = tw + 24, bh = 30
        const bx = Math.max(8, Math.min(w - bw - 8, n.sx - bw / 2))
        const by = Math.max(8, Math.min(h - bh - 8, n.sy + n.sr + 10))
        ctx.globalAlpha = Math.max(0, a) * fade
        roundRect(ctx, bx, by, bw, bh, 15)
        ctx.fillStyle = gold ? 'rgba(255,224,160,0.96)' : 'rgba(8,14,32,0.9)'; ctx.fill()
        ctx.strokeStyle = gold ? '#fff6dc' : 'rgba(255,214,140,0.5)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.fillStyle = gold ? '#2a1c05' : '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
        ctx.fillText(text, bx + 12, by + bh / 2 + 0.5)
      })
      ctx.globalAlpha = 1
      light = Math.max(0, light - dt * 0.03)
    }

    function step(dt) {
      t += dt
      // Wachstum nach der Errettung
      for (let i = pending.length - 1; i >= 0; i--) {
        if (t >= pending[i].t) {
          const p = pending.splice(i, 1)[0]
          spawnKids(p.n)
          const kids = kidsOf(p.n)
          if (kids.length) pushChip(kids[0], `${p.n.name} betet jetzt für ${kids.length} Menschen`, 'pray')
        }
      }
      nodes.forEach(n => { if (n.willSave && t >= n.saveAt) { n.willSave = false; savedBy(n) } })
      simulate(dt)
      const tg = camTarget()
      const k = 1 - Math.exp(-dt * 2.2)
      cam.x += (tg.x - cam.x) * k; cam.y += (tg.y - cam.y) * k; cam.s += (tg.s - cam.s) * k

      // Autoplay
      if (!resetting && t > nextAuto && t > quietUntil) {
        const n = pickAuto()
        if (n) {
          prayFor(n)
          const big = nodes.length > 22
          nextAuto = t + (big ? rand(0.7, 1.2) : rand(1.1, 1.9))
        } else nextAuto = t + 1
      }
      // Ende: alle erreicht → kurz stehen lassen, dann von vorn
      const openLeft = nodes.some(n => n.gen > 0 && n.state === 'open')
      if (!resetting && !pending.length && !beams.length && !nodes.some(n => n.willSave) && (nodes.length >= CAP - 2 || !openLeft)) {
        if (doneAt < 0) doneAt = t
        else if (t - doneAt > 7 && t > quietUntil) resetting = true
      }
      if (resetting) {
        fade -= dt * 1.5
        if (fade <= 0) { init(); snapCamera(); fade = 0.001; resetting = false }
      } else if (fade < 1) fade = Math.min(1, fade + dt * 1.4)
      updateStats()
    }

    function loop(now) {
      raf = 0
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000 || 0)
      last = now
      step(dt)
      draw(dt)
      raf = requestAnimationFrame(loop)
    }
    const start = () => { if (reduced || running || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop) }
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

    init()
    const ro = new ResizeObserver(resize); ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop() }, { rootMargin: '500px' })
    io.observe(wrap)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    resize()
    if (reduced) {
      // Standbild: drei Menschen errettet, ihr Umfeld wächst
      ;[3, 6, 9].forEach(i => { const n = nodes[1 + i]; n.prayers = NEED[1]; n.state = 'saved'; n.saveT = -5; prayers += 2 })
      nodes.slice().forEach(n => { if (n.gen === 1 && n.state === 'saved') spawnKids(n) })
      nodes.filter(n => n.gen === 2).slice(0, 3).forEach(n => { n.state = 'saved'; n.saveT = -5; spawnKids(n) })
      for (let i = 0; i < 300; i++) simulate(1 / 60)
      snapCamera(); updateStats(); draw(0)
      apiRef.current.reset = () => {}
    }

    return () => {
      stop(); ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      apiRef.current = { pray: () => {}, reset: () => {} }
    }
  }, [])

  return (
    <div className={className}>
      <div ref={wrapRef} className="lp-prayer-stage">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-manipulation"
          role="img"
          aria-label="Animation: Dein Umfeld als Kreis aus Menschen. Wenn für jemanden gebetet wird, steigt ein Lichtstrahl in den Himmel. Kommt ein Mensch zum Glauben, wird er golden und sein eigenes Umfeld wächst um ihn herum. So entstehen Generation für Generation immer mehr Menschen, für die gebetet wird. Symbolische Darstellung."
        />
      </div>
      <div className="lp-prayer-bar">
        <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={pray}>
          <HandHeart size={18} aria-hidden="true" /> Für jemanden beten
        </button>
      </div>
      <ul className="lp-prayer-stats" aria-live="polite">
        <li><b>{stats.prayers}</b> {stats.prayers === 1 ? 'Gebet' : 'Gebete'}</li>
        <li className="is-gold"><b>{stats.saved}</b> {stats.saved === 1 ? 'Mensch hat' : 'Menschen haben'} Jesus kennengelernt</li>
        <li><b>{stats.reached}</b> Menschen im Umfeld</li>
        <li><b>{stats.gen}</b>. Generation</li>
      </ul>
      <p className="lp-prayer-hint">Tippe auf eine Person, um für sie zu beten. Wer zum Glauben kommt, bekommt ein eigenes Umfeld.</p>
    </div>
  )
}
