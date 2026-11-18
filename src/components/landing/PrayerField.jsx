import { useCallback, useEffect, useRef, useState } from 'react'
import { HandHeart } from 'lucide-react'

// Oikos-Motion-Graphic: Dein Umfeld als Kreis (wie die Oikos Map der App).
// Wer für jemanden betet, schickt einen Lichtstrahl nach oben; die Wolken
// reißen auf, der Himmel wird hell. Tippen/Klicken auf eine Person (oder der
// Button) löst ein Gebet aus, ohne Eingabe betet es von selbst. Reine
// Illustration, keine echten Nutzerdaten.

const TWO_PI = Math.PI * 2
const PEOPLE = [
  { n: 'Mama', c: '#FFA726' }, { n: 'Papa', c: '#FFA726' }, { n: 'Oma', c: '#FFA726' }, { n: 'Lisa', c: '#FFA726' },
  { n: 'Ben', c: '#42A5F5' }, { n: 'Lukas', c: '#42A5F5' }, { n: 'Mia', c: '#42A5F5' },
  { n: 'Anna', c: '#66BB6A' }, { n: 'Sven', c: '#66BB6A' }, { n: 'Kai', c: '#66BB6A' },
  { n: 'Nora', c: '#EC407A' }, { n: 'Pastor', c: '#E8E2D6' },
]
const BEAM_MS = 1700
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
  const apiRef = useRef({ pray: () => {} })
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('')

  const pray = useCallback(() => apiRef.current.pray(), [])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1, raf = 0, running = false, visible = false, last = 0, t = 0
    let light = 0          // 0..1: wie weit der Himmel aufgerissen ist
    let prayers = 0
    let quietUntil = 0     // Autoplay pausiert nach eigener Eingabe
    let nextAuto = 1.2
    let hover = -1
    const nodes = PEOPLE.map((p, i) => ({ ...p, i, x: 0, y: 0, glow: 0, prayed: 0, pulse: 0 }))
    const beams = []
    const particles = []
    const ripples = []
    const label = { i: -1, t: -9 }
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.5, r: rand(0.4, 1.3), p: Math.random() * 6 }))

    function layout() {
      const cx = w / 2
      const cy = h * 0.64
      const rx = Math.min(w * 0.42, 420)
      const ry = Math.min(h * 0.24, 200)
      nodes.forEach((n, i) => {
        const a = -Math.PI / 2 + (i / nodes.length) * TWO_PI + 0.18
        n.x = cx + Math.cos(a) * rx
        n.y = cy + Math.sin(a) * ry
      })
      return { cx, cy }
    }

    function resize() {
      const r = wrap.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      layout()
      draw(0)
    }

    function sendPrayer(i) {
      const n = nodes[i]
      n.prayed += 1
      n.pulse = 1
      beams.push({ i, t0: t })
      ripples.push({ x: n.x, y: n.y, t0: t, c: n.c })
      label.i = i; label.t = t
      prayers += 1
      setCount(prayers)
      setLast(n.n)
      if (reduced) { n.glow = 1; light = Math.min(1, light + 0.12); draw(0) }
    }

    function nodeRadius() { return Math.max(17, Math.min(28, w * 0.04)) }

    apiRef.current.pray = () => {
      quietUntil = t + 10
      // erst Personen, für die noch nicht gebetet wurde
      const open = nodes.filter(n => n.prayed === 0)
      const pool = open.length ? open : nodes
      sendPrayer(pool[Math.floor(Math.random() * pool.length)].i)
    }

    function pick(x, y) {
      const R = nodeRadius() * 1.25
      let best = -1, bd = R
      nodes.forEach(n => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n.i } })
      return best
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const onMove = (e) => { const [x, y] = pos(e); const k = pick(x, y); if (k !== hover) { hover = k; canvas.style.cursor = k >= 0 ? 'pointer' : 'default' } }
    const onLeave = () => { hover = -1; canvas.style.cursor = 'default' }
    const onDown = (e) => { const [x, y] = pos(e); const k = pick(x, y); if (k >= 0) { quietUntil = t + 10; sendPrayer(k) } }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointerdown', onDown)

    function burst(x, y, n, c) {
      for (let k = 0; k < n; k++) {
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05)
        const s = rand(30, 150)
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.9, 1.9), c, r: rand(1, 2.6) })
      }
    }

    function draw(dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const { cx, cy } = layout()
      const R = nodeRadius()
      const base = Math.min(0.55, prayers * 0.045)
      const sky = Math.min(1, Math.max(light, base))

      // Himmel: Lichtdom, der mit den Gebeten wächst
      let g = ctx.createRadialGradient(cx, -h * 0.1, 0, cx, -h * 0.1, h * 1.05)
      g.addColorStop(0, `rgba(255,222,150,${0.1 + 0.62 * sky})`)
      g.addColorStop(0.35, `rgba(246,160,80,${0.04 + 0.26 * sky})`)
      g.addColorStop(1, 'rgba(246,160,80,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // Sterne
      stars.forEach(s => {
        const a = (0.25 + 0.55 * Math.abs(Math.sin(t * 0.8 + s.p))) * (1 - 0.6 * sky)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, TWO_PI); ctx.fill()
      })

      // Wolken reißen auf (je heller, desto weiter weichen sie nach außen)
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

      // Verbindungen Du ↔ Person
      nodes.forEach(n => {
        ctx.strokeStyle = n.c
        ctx.globalAlpha = 0.22 + 0.4 * n.glow
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke()
      })
      ctx.globalAlpha = 1

      // Strahlen
      ctx.globalCompositeOperation = 'lighter'
      for (let b = beams.length - 1; b >= 0; b--) {
        const bm = beams[b]
        const n = nodes[bm.i]
        const k = Math.min(1, (t - bm.t0) / (BEAM_MS / 1000))
        const e = smooth(k)
        const hx = n.x + Math.sin(t * 2 + bm.i) * 6 * k
        const hy = n.y + (-30 - n.y) * e
        const fade = k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15
        const lg = ctx.createLinearGradient(n.x, n.y, hx, hy)
        lg.addColorStop(0, `rgba(255,225,160,${0.95 * fade})`)
        lg.addColorStop(1, `rgba(255,255,255,${0.0})`)
        ctx.strokeStyle = `rgba(255,214,140,${0.16 * fade})`; ctx.lineWidth = R * 0.9
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(hx, hy); ctx.stroke()
        ctx.strokeStyle = lg; ctx.lineWidth = 2.4
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(hx, hy); ctx.stroke()
        if (!reduced && Math.random() < 0.6) particles.push({ x: n.x + rand(-4, 4), y: n.y - rand(0, (n.y - hy)), vx: rand(-10, 10), vy: rand(-60, -20), life: 0, max: rand(0.6, 1.2), c: '#ffe3a8', r: rand(0.8, 1.8) })
        if (k >= 1) {
          beams.splice(b, 1)
          light = Math.min(1, light + 0.11)
          burst(hx, 6, 22, '#ffe9bd')
          ripples.push({ x: hx, y: 0, t0: t, c: '#ffe3a8' })
        }
      }
      // Partikel
      for (let p = particles.length - 1; p >= 0; p--) {
        const q = particles[p]
        q.life += dt
        if (q.life > q.max) { particles.splice(p, 1); continue }
        q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 40 * dt
        ctx.fillStyle = q.c
        ctx.globalAlpha = (1 - q.life / q.max) * 0.9
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TWO_PI); ctx.fill()
      }
      ctx.globalAlpha = 1
      // Wellen
      ripples.forEach((rp, ri) => {
        const k = (t - rp.t0) / 1.6
        if (k > 1) { ripples.splice(ri, 1); return }
        ctx.strokeStyle = rp.c; ctx.globalAlpha = (1 - k) * 0.55; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(rp.x, rp.y, R * 0.6 + k * R * 3.2, 0, TWO_PI); ctx.stroke()
      })
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      // Personen
      nodes.forEach(n => {
        n.glow = Math.max(n.prayed ? 0.35 : 0, n.glow - dt * 0.35)
        n.pulse = Math.max(0, n.pulse - dt * 1.4)
        const r = R * (1 + 0.18 * n.pulse + (hover === n.i ? 0.1 : 0))
        if (n.glow > 0.01) {
          const hg = ctx.createRadialGradient(n.x, n.y, r * 0.6, n.x, n.y, r * (2.2 + n.pulse))
          hg.addColorStop(0, `rgba(255,214,130,${0.55 * n.glow})`)
          hg.addColorStop(1, 'rgba(255,214,130,0)')
          ctx.fillStyle = hg
          ctx.beginPath(); ctx.arc(n.x, n.y, r * (2.2 + n.pulse), 0, TWO_PI); ctx.fill()
        }
        ctx.save()
        ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3
        ctx.fillStyle = n.c
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TWO_PI); ctx.fill()
        ctx.restore()
        ctx.strokeStyle = n.prayed ? 'rgba(255,230,170,0.95)' : 'rgba(255,255,255,0.55)'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(n.x, n.y, r - 1, 0, TWO_PI); ctx.stroke()
        ctx.fillStyle = 'rgba(10,14,30,0.82)'
        ctx.font = `700 ${Math.max(9.5, r * 0.46)}px Inter, -apple-system, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(n.n, n.x, n.y + 0.5)
      })

      // Du
      const dr = R * 1.45
      const dg = ctx.createRadialGradient(cx, cy, dr * 0.7, cx, cy, dr * 2.4)
      dg.addColorStop(0, `rgba(255,255,255,${0.25 + 0.2 * sky})`)
      dg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = dg
      ctx.beginPath(); ctx.arc(cx, cy, dr * 2.4, 0, TWO_PI); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(cx, cy, dr, 0, TWO_PI); ctx.fill()
      ctx.fillStyle = '#05091a'
      ctx.font = `800 ${dr * 0.55}px Inter, -apple-system, sans-serif`
      ctx.fillText('Du', cx, cy + 1)

      // Hinweis über der zuletzt bedachten Person
      const age = t - label.t
      if (label.i >= 0 && age < 2.4) {
        const n = nodes[label.i]
        const a = Math.min(1, age / 0.25, (2.4 - age) / 0.5)
        const text = `🙏 Gebet für ${n.n}`
        ctx.font = `600 12px Inter, -apple-system, sans-serif`
        const tw = ctx.measureText(text).width
        const bw = tw + 22, bh = 28
        const bx = Math.max(8, Math.min(w - bw - 8, n.x - bw / 2))
        const by = n.y + R + 10
        ctx.globalAlpha = Math.max(0, a)
        roundRect(ctx, bx, by, bw, bh, 14)
        ctx.fillStyle = 'rgba(8,14,32,0.88)'; ctx.fill()
        ctx.strokeStyle = 'rgba(255,214,140,0.5)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'
        ctx.fillText(text, bx + 11, by + bh / 2 + 0.5)
        ctx.globalAlpha = 1
      }
      // Himmel beruhigt sich langsam
      light = Math.max(0, light - dt * 0.035)
    }

    function loop(now) {
      raf = 0
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000 || 0)
      last = now
      t += dt
      if (t > nextAuto && t > quietUntil) {
        const open = nodes.filter(n => n.prayed === 0)
        const pool = open.length ? open : nodes
        sendPrayer(pool[Math.floor(Math.random() * pool.length)].i)
        nextAuto = t + rand(1.6, 2.8)
      }
      draw(dt)
      raf = requestAnimationFrame(loop)
    }
    const start = () => { if (reduced || running || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop) }
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

    const ro = new ResizeObserver(resize); ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop() }, { rootMargin: '100px' })
    io.observe(wrap)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    resize()
    if (reduced) { [2, 5, 8].forEach(i => { nodes[i].prayed = 1; nodes[i].glow = 0.8 }); prayers = 3; light = 0.45; draw(0) }

    return () => {
      stop(); ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      apiRef.current.pray = () => {}
    }
  }, [])

  return (
    <div className={className}>
      <div ref={wrapRef} className="lp-prayer-stage">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-manipulation"
          role="img"
          aria-label="Animation: Dein Umfeld als Kreis aus Menschen. Wenn für jemanden gebetet wird, steigt ein Lichtstrahl in den Himmel, die Wolken reißen auf und es wird hell. Symbolische Darstellung."
        />
      </div>
      <div className="lp-prayer-bar">
        <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={pray}>
          <HandHeart size={18} aria-hidden="true" /> Für jemanden beten
        </button>
        <p aria-live="polite" className="lp-prayer-count">
          <b>{count}</b> {count === 1 ? 'Gebet' : 'Gebete'}{last ? <> · zuletzt für <b>{last}</b></> : ' · tippe auf eine Person'}
        </p>
      </div>
    </div>
  )
}
