/* ══════════════ Video 004 · „Warum lässt Gott Leid zu?“ Teil 2 · Szenen ══════════════
   Zeiten kommen aus timing.js (Arthurs Sätze). Hilfsfunktionen (figure, sunFig, cross, …) stammen aus Video 002. */
const T = window.TIMING, LS = T.lines
const S = n => LS[n - 1].start, E = n => LS[n - 1].end, CUT = n => S(n) - .25
const wt = (n, sub) => { const w = LS[n - 1].words.find(x => x.w.toLowerCase().includes(sub.toLowerCase())); return w ? w.t0 : S(n) }
const SCR10 = img('../../assets/screens/10-startseite.png')
const NIGHT_HIP = 1470, HIP = 1560 - 200 * .85

/* ── zusätzliche Requisiten ── */
function groundStrip(col) { ctx.fillStyle = col; ctx.fillRect(-60, 1560, W + 120, 460); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-60, 1560); ctx.lineTo(W + 60, 1560); ctx.stroke() }
function glowAt(x, y, r, a, col = '255,214,102') { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r) }
function heartFig(x, y, sc, col = RED, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc); ctx.beginPath(); ctx.moveTo(0, 20); ctx.bezierCurveTo(-46, -12, -26, -44, 0, -20); ctx.bezierCurveTo(26, -44, 46, -12, 0, 20); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore() }
function cloud(x, y, s, fill = '#fff') { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const c = [[-70, 10, 55], [0, -12, 70], [75, 12, 52], [10, 24, 60]]; ctx.strokeStyle = INK; ctx.lineWidth = 20; c.forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.stroke() }); ctx.fillStyle = fill; c.forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill() }); ctx.restore() }
function outlined(text, x, y, font, fill, lw, a = 1, rot = 0, sc = 1) { ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.strokeText(text, 0, 0); ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore() }
function pill(text, x, y, k, bg = '#fff', fg = INK, size = 38) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.font = `800 ${size}px Inter`; const tw = ctx.measureText(text).width + 90, hh = size * 2.3; rr(-tw / 2 + 8, -hh / 2 + 8, tw, hh, hh / 2, INK, null); rr(-tw / 2, -hh / 2, tw, hh, hh / 2, bg, INK, 8); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 3); ctx.restore() }
function appIcon(x, y, size, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate((1 - k) * -.3); ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, size * .23); ctx.save(); ctx.clip(); ctx.drawImage(ICON, -size / 2, -size / 2, size, size); ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke(); ctx.restore() }
function tree(x, y, s, fruit = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  ctx.fillStyle = '#a8703b'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-22, -260); ctx.lineTo(22, -260); ctx.lineTo(34, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
  const cr = [[-80, -300, 90], [80, -300, 90], [0, -360, 110], [-40, -250, 80], [50, -250, 80]]
  ctx.lineWidth = 18; cr.forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.stroke() })
  ctx.fillStyle = '#6cc35a'; cr.forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill() })
  if (fruit) [[-60, -300], [40, -370], [70, -260], [-20, -240]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 16, 0, 6.3); ctx.fillStyle = RED; ctx.fill(); ctx.lineWidth = 5; ctx.stroke() })
  ctx.restore()
}
function bench(x, y) {
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.fillStyle = '#9b6a3c'
  ;[[x - 180, y - 120, 360, 24], [x - 180, y - 80, 360, 24], [x - 190, y, 380, 26]].forEach(([a, b, w, hh]) => { ctx.fillRect(a, b, w, hh); ctx.strokeRect(a, b, w, hh) })
  ctx.fillStyle = '#3d3a45'; [[x - 160, y + 26, 18, 1560 - y - 26], [x + 142, y + 26, 18, 1560 - y - 26], [x - 160, y - 120, 14, 120], [x + 146, y - 120, 14, 120]].forEach(([a, b, w, hh]) => { ctx.fillRect(a, b, w, hh); ctx.strokeRect(a, b, w, hh) })
  ctx.restore()
}
const SIT = (extra = {}) => Object.assign({ face: 'sad', lean: .24, tilt: .3, aA: [.75, -.4], aB: [.55, -.3], lA: [1.45, -1.45], lB: [1.6, -1.55], f: 1 }, extra)
function battery(x, y, pct, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y)
  rr(-48, -22, 96, 44, 10, '#fff', INK, 6); ctx.fillStyle = INK; ctx.fillRect(48, -10, 8, 20)
  const col = pct > 60 ? '#ffc93c' : pct > 25 ? '#ff9f43' : RED
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-42, -16, 84 * clamp(pct / 100), 32, 6); ctx.fill()
  ctx.font = '800 26px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText(Math.round(pct) + '%', 0, 2); ctx.fillStyle = INK; ctx.fillText(Math.round(pct) + '%', 0, 2)
  ctx.restore()
}
function rain(t, k) {
  if (k <= 0) return; ctx.save(); ctx.strokeStyle = `rgba(190,210,255,${.5 * k})`; ctx.lineWidth = 4; ctx.lineCap = 'round'
  for (let i = 0; i < 110; i++) { const sp = 1300 * (.8 + h(i + 9) * .5), x = h(i) * (W + 200) - 100, y = (h(i + 50) * H + t * sp) % (H + 100) - 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 38); ctx.stroke() }
  ctx.restore()
}
function nightBg(t, starsK = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#2a3566'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,255,255,${(.25 + .35 * Math.sin(t * 2 + i)) * starsK})`; ctx.beginPath(); ctx.arc(h(i) * W, 600 + h(i + 50) * 400, 2 + h(i + 9) * 2.5, 0, 6.3); ctx.fill() }
}
function flatBg(col, hf = .12) { ctx.fillStyle = col; ctx.fillRect(-60, -60, W + 120, H + 120); if (hf) { ctx.globalAlpha = hf; ctx.drawImage(HF, 0, 0); ctx.globalAlpha = 1 } }
function lightning(x, y, k) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#fff6b0'; ctx.shadowColor = '#fff6b0'; ctx.shadowBlur = 30; ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 40, y + 140); ctx.lineTo(x + 10, y + 150); ctx.lineTo(x - 50, y + 320); ctx.stroke(); ctx.restore() }
function godLine(x, y1, y2, gap, healed, k = 1) {
  ctx.save(); ctx.globalAlpha = k; const m = (y1 + y2) / 2
  ctx.lineCap = 'round'; ctx.strokeStyle = healed ? '#ffd23f' : '#ffd23f'; ctx.lineWidth = 12; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = healed ? 34 : 14
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, m - gap / 2); ctx.stroke()
  ctx.shadowBlur = 0; ctx.strokeStyle = healed ? '#ffd23f' : '#9aa4b8'; ctx.beginPath(); ctx.moveTo(x, m + gap / 2); ctx.lineTo(x, y2); ctx.stroke()
  if (gap > 8) { ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 18, m - gap / 2 - 6); ctx.lineTo(x + 6, m - gap / 2 + 8); ctx.lineTo(x + 18, m - gap / 2 - 8); ctx.moveTo(x - 18, m + gap / 2 + 6); ctx.lineTo(x - 4, m + gap / 2 - 8); ctx.lineTo(x + 18, m + gap / 2 + 8); ctx.stroke() }
  ctx.restore()
}
function panel(x, y, w, hh, rot, k, drawFn) {
  if (k <= 0) return; ctx.save(); ctx.translate(x + w / 2, y + hh / 2); ctx.rotate(rot); const sc = 1.6 - .6 * eob(k); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 3)
  rr(-w / 2 + 10, -hh / 2 + 10, w, hh, 10, INK, null); rr(-w / 2, -hh / 2, w, hh, 10, '#fff8e8', INK, 8)
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2 + 6, -hh / 2 + 6, w - 12, hh - 12); ctx.clip(); drawFn(w, hh); ctx.restore(); ctx.restore()
}
function robot(x, y, k, t) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = k
  const bodyBob = Math.sin(t * 8) * 4
  rr(-80, -200 + bodyBob, 160, 190, 18, '#c9d3de', INK, 9); rr(-28, -150 + bodyBob, 56, 40, 6, '#7ee0ff', INK, 6)
  rr(-65, -330 + bodyBob, 130, 115, 20, '#dfe6ee', INK, 9)
  ctx.fillStyle = INK; ctx.fillRect(-40, -295 + bodyBob, 22, 22); ctx.fillRect(18, -295 + bodyBob, 22, 22)
  ctx.strokeStyle = INK; ctx.lineWidth = 6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-30 + i * 20, -250 + bodyBob); ctx.lineTo(-30 + i * 20, -235 + bodyBob); ctx.stroke() }
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -330 + bodyBob); ctx.lineTo(0, -370 + bodyBob); ctx.stroke(); ctx.fillStyle = Math.sin(t * 10) > 0 ? RED : '#ff9a9a'; ctx.beginPath(); ctx.arc(0, -378 + bodyBob, 12, 0, 6.3); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#c9d3de'; ctx.lineWidth = 8; [[-120, -190], [80, -190]].forEach(([a, b]) => { ctx.fillRect(a, b + bodyBob, 40, 120); ctx.strokeRect(a, b + bodyBob, 40, 120) })
  ctx.fillRect(-60, -10, 40, 10); ctx.fillRect(20, -10, 40, 10)
  ctx.restore()
}
const ROBO_PARTS = Array.from({ length: 9 }, (_, i) => ({ vx: (h(i) - .5) * 900, vy: -500 - h(i + 4) * 500, r: (h(i + 8) - .5) * 14, kind: i }))
function robotPieces(x, y, u) {
  ROBO_PARTS.forEach(p => {
    const px = x + p.vx * u, py = y - 200 + p.vy * u + 1600 * u * u; if (py > 1700) return
    ctx.save(); ctx.translate(px, py); ctx.rotate(p.r * u)
    if (p.kind === 0) rr(-65, -57, 130, 115, 20, '#dfe6ee', INK, 9)
    else if (p.kind === 1) rr(-80, -95, 160, 190, 18, '#c9d3de', INK, 9)
    else if (p.kind < 4) { ctx.fillStyle = '#c9d3de'; ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.fillRect(-20, -60, 40, 120); ctx.strokeRect(-20, -60, 40, 120) }
    else { ctx.fillStyle = '#9aa7b6'; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); for (let k = 0; k < 16; k++) { const r = k % 2 ? 22 : 30, an = k * Math.PI / 8; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r) } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.3); ctx.fill(); ctx.stroke() }
    ctx.restore()
  })
}
function signpost(x, k) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, 1560); ctx.scale(1, eob(k))
  ctx.fillStyle = '#9b6a3c'; ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.fillRect(-14, -430, 28, 430); ctx.strokeRect(-14, -430, 28, 430)
  const arrow = (y, dirn, col, text) => { ctx.save(); ctx.translate(0, y); ctx.scale(dirn, 1); ctx.beginPath(); ctx.moveTo(-10, -42); ctx.lineTo(300, -42); ctx.lineTo(350, 0); ctx.lineTo(300, 42); ctx.lineTo(-10, 42); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); ctx.restore(); ctx.font = '900 34px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(text, dirn * 170, y + 2) }
  arrow(-380, -1, '#ffd23f', 'GOTT VERTRAUEN'); arrow(-270, 1, '#ff8a80', 'SELBST NEHMEN')
  ctx.restore()
}
function serpent(x, y, t, k) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.translate(x, y)
  ctx.strokeStyle = '#1a0f22'; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.beginPath()
  for (let i = 0; i <= 40; i++) { const u = i / 40, px = -120 + u * 260, py = Math.sin(u * 9 + t * 3) * 24 + u * -40; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) } ctx.stroke()
  ctx.fillStyle = '#1a0f22'; ctx.beginPath(); ctx.ellipse(150, -50, 46, 32, -.3, 0, 6.3); ctx.fill()
  ctx.fillStyle = '#ff3b3b'; ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(160, -62, 8, 0, 6.3); ctx.arc(176, -56, 7, 0, 6.3); ctx.fill()
  ctx.restore()
}
function darkBubble(text, x, y, t0, t1, t, tail) {
  if (t < t0 || t > t1 + .2) return; const k = eob((t - t0) / .3), a = 1 - clamp((t - t1) / .2)
  ctx.save(); ctx.globalAlpha = a; ctx.font = 'italic 700 66px Caveat'; const tw = ctx.measureText(text).width + 80, bh = 120
  ctx.translate(x, y); ctx.scale(k, k)
  ctx.beginPath(); ctx.moveTo(-20, bh / 2 - 4); ctx.lineTo(tail[0] - x, tail[1] - y); ctx.lineTo(24, bh / 2 - 4); ctx.closePath(); ctx.fillStyle = '#2b1236'; ctx.fill(); ctx.strokeStyle = '#ff5b5b'; ctx.lineWidth = 6; ctx.stroke()
  rr(-tw / 2, -bh / 2, tw, bh, 40, '#2b1236', '#ff5b5b', 6); ctx.fillStyle = '#ff8080'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 4); ctx.restore()
}
function earthIcon(x, y, r, crack) { ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fillStyle = '#4cc3ff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.fillStyle = '#6cc35a'; ctx.beginPath(); ctx.ellipse(-r * .3, -r * .2, r * .38, r * .26, .4, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(r * .35, r * .35, r * .3, r * .2, -.3, 0, 6.3); ctx.fill(); ctx.stroke(); if (crack > 0) { ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-r * .1, -r); ctx.lineTo(r * .1, -r * .4); ctx.lineTo(-r * .15, 0); ctx.lineTo(r * .2 * crack, r * .5 * crack); ctx.stroke() } ctx.restore() }

/* ══════════════ Untertitel (Karaoke, Wort für Wort) ══════════════ */
const RED_W = /^(leid|mörder|schuld|tod|trennung|ungerecht|verrat|schmerz|hunger|strafe)/i
const GOLD_W = /^(jesus|gott|kreuz|geschenk|freispruch|angenommen|mittendrin|oikos|connect|tränen|richter|mensch)/i
const CHUNKS = []
LS.forEach(L => {
  let cur = []; const flush = () => { if (cur.length) CHUNKS.push({ n: L.n, words: cur, t0: cur[0].t0, t1: cur[cur.length - 1].t1, end: L.end }); cur = [] }
  L.words.forEach(w => { if (w.w === '–') { flush(); return } cur.push(w); if (/[,.:;?!“‘]$/.test(w.w) || cur.length >= 3) flush() }); flush()
})
function subtitles(t) {
  let c = null
  for (let i = 0; i < CHUNKS.length; i++) { const nx = CHUNKS[i + 1]; if (t >= CHUNKS[i].t0 - .06 && (!nx || t < nx.t0 - .06) && t < CHUNKS[i].end + .35) { c = CHUNKS[i]; break } }
  if (!c) return
  const pop = eob((t - c.t0 + .06) / .14)
  ctx.save(); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  let size = 96; ctx.font = `900 ${size}px Inter`
  const txt = c.words.map(w => w.w.replace(/[„“‚‘]/g, ''))
  const sp = ctx.measureText(' ').width + size * .3
  let tw = txt.reduce((a, s) => a + ctx.measureText(s).width, 0) + sp * (txt.length - 1)
  if (tw > 940) { size = Math.floor(size * 940 / tw); ctx.font = `900 ${size}px Inter`; tw = txt.reduce((a, s) => a + ctx.measureText(s).width, 0) + (ctx.measureText(' ').width + size * .3) * (txt.length - 1) }
  let x = 540 - tw / 2; const y = 430
  ctx.translate(540, y); ctx.scale(.86 + .14 * pop, .86 + .14 * pop); ctx.translate(-540, -y)
  c.words.forEach((w, i) => {
    const s = txt[i], mw = ctx.measureText(s).width, active = t >= w.t0 - .03 && t < w.t1 + .05
    const bare = s.replace(/[^\wäöüÄÖÜß]/g, '')
    ctx.save(); ctx.translate(x + mw / 2, y); if (active) { ctx.scale(1.1, 1.1); ctx.rotate(-.02) }
    ctx.lineWidth = size * .2; ctx.strokeStyle = INK; ctx.textAlign = 'center'; ctx.strokeText(s, 0, 0)
    ctx.fillStyle = active ? '#ffd83d' : RED_W.test(bare) ? '#ff5a5f' : GOLD_W.test(bare) ? '#ffc93c' : '#fff'; ctx.fillText(s, 0, 0); ctx.restore()
    x += mw + ctx.measureText(' ').width + size * .3
  })
  ctx.restore()
}
/* ══════════════ Video 004 · Teil 2 · eigene Szenen ══════════════ */
const SCR02 = img('../../assets/screens/02-weltkarte.png')
function court(t, dim = 0) {
  ctx.fillStyle = '#ecd3a8'; ctx.fillRect(-60, -60, W + 120, H + 120)
  ctx.strokeStyle = 'rgba(120,80,40,.35)'; ctx.lineWidth = 6; for (let x = 60; x < W; x += 160) { ctx.beginPath(); ctx.moveTo(x, 560); ctx.lineTo(x, 1560); ctx.stroke() }
  ctx.fillStyle = '#c99a62'; ctx.fillRect(-60, 560, W + 120, 30); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(-60, 560, W + 120, 30)
  groundStrip('#b98a5a')
  // Waage-Emblem an der Wand
  ctx.save(); ctx.translate(540, 760); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 40); ctx.moveTo(-40, -20); ctx.lineTo(40, -20); ctx.moveTo(-40, -20); ctx.lineTo(-52, 12); ctx.lineTo(-28, 12); ctx.closePath(); ctx.moveTo(40, -20); ctx.lineTo(28, 12); ctx.lineTo(52, 12); ctx.closePath(); ctx.stroke(); ctx.restore()
  if (dim > 0) { ctx.fillStyle = `rgba(10,8,20,${.72 * dim})`; ctx.fillRect(-60, -60, W + 120, H + 120) }
}
function judgeDesk() { rr(580, 1300, 460, 260, 10, '#8a5a32', INK, 9); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 6; ctx.strokeRect(620, 1340, 380, 180) }
function podium() { rr(150, 1400, 300, 160, 8, '#a8743f', INK, 9) }
function robeBody(x, y, s, full) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-36, -140); ctx.lineTo(36, -140); ctx.lineTo(80, full ? 210 : 40); ctx.lineTo(-80, full ? 210 : 40); ctx.closePath(); ctx.fillStyle = '#273150'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-16, -140); ctx.lineTo(16, -140); ctx.lineTo(0, -105); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore() }
function judge(x, y, s, pose, full) { robeBody(x, y, s, full); return figure(x, y, s, pose, {}) }
function convict(x, y, s, pose) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-34, -138); ctx.lineTo(34, -138); ctx.lineTo(46, 0); ctx.lineTo(-46, 0); ctx.closePath(); ctx.fillStyle = '#ff9a3c'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke(); ctx.restore(); return figure(x, y, s, pose) }
function moneyBag(x, y, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = '#c8a25a'; ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, 20, 80, 70, 0, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-30, -45); ctx.lineTo(30, -45); ctx.lineTo(18, -20); ctx.lineTo(-18, -20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.font = '900 54px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('€', 0, 26); ctx.restore() }
function choice(t) {
  const t0 = wt(1, 'Würdest'), press = S(2) + .05
  const k = eob((t - t0) / .35); if (k <= 0) return
  const pressed = t > press, pk = ease((t - press) / .25)
  pill('JA', 330, 1000, k * (pressed ? 1 - .25 * pk : 1), pressed ? '#cfd6cf' : '#7be08a', INK, 56)
  pill('NEIN', 750, 1000, k * (pressed ? 1 + .15 * pk - .1 * Math.max(0, pk - .6) : 1), '#ff6b6b', INK, 56)
  if (!pressed) { const left = Math.max(0, S(2) - t), n = Math.min(3, Math.ceil(left / ((S(2) - E(1)) / 3))); if (t > E(1) && n > 0) { const frac = (left % ((S(2) - E(1)) / 3)) / ((S(2) - E(1)) / 3); outlined(String(n), 540, 760, '900 240px Inter', '#ffd83d', 32, 1, 0, .8 + .4 * frac) } }
  else { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.globalAlpha = 1 - pk * .3; ctx.beginPath(); ctx.arc(750, 1000, 130 * (1 + pk), 0, 6.3); ctx.stroke(); ctx.restore() }
}
// 1 · Hook: Gericht
function t1(t) {
  court(t)
  judge(810, 1290, 1.05, { face: 'determined', aA: [.6, -.5], aB: [-1.4, -.6], f: -1 }, false); judgeDesk()
  const f = convict(300, 1390, .95, { face: t > wt(1, 'Würdest') ? 'shock' : 'determined', aA: [2.6, .3], aB: [-.3, -.2] })
  podium(); moneyBag(170, 1330, eob((t - wt(1, 'hunderttausend')) / .35))
  bubble('Aber ich habe 100.000 € gespendet!', 470, 880, wt(1, 'Aber') - .05, wt(1, 'Würdest') - .1, t, [320, 1060], 50)
  choice(t)
}
// 2 · Nein → gute Taten → Trennung
function t2(t) {
  const g1 = wt(2, 'Genauso') - .2, g2 = wt(2, 'Bibel') - .2
  if (t < g1) { court(t); judge(810, 1290, 1.05, { face: 'determined', aA: [.6, -.5], aB: [-2.6, -.4], f: -1 }, false); judgeDesk(); convict(300, 1390, .95, { face: 'sad', aA: [.3, .2], aB: [-.3, -.2], lean: .15, tilt: .2 }); podium(); choice(t); const xk = eob((t - wt(2, 'ungerecht')) / .3); if (xk > 0) outlined('UNGERECHT', 540, 820, '900 96px Inter', '#ff6b6b', 18, 1, -.06, xk); return }
  if (t < g2) {
    flatBg(CREAM); groundStrip('#d9c9a3')
    rr(620, 860, 340, 700, 18, '#2b2530', INK, 10); outlined('SCHULD', 790, 1210, '900 70px Inter', '#ff6b6b', 12, 1, -Math.PI / 2)
    const fall = wt(2, 'löschen')
    for (let i = 0; i < 5; i++) { const u = Math.max(0, t - fall - i * .05), bx = 330 + (u > 0 ? u * 260 * (i % 2 ? 1 : -1) : 0), by = 1490 - i * 92 + (u > 0 ? 900 * u * u : 0), rot = u * (i % 2 ? 2 : -2); if (by > 1700) continue; const k = eob((t - g1 - .15 - i * .12) / .3); if (k <= 0) continue; ctx.save(); ctx.translate(bx, by); ctx.rotate(rot); ctx.scale(k, k); rr(-90, -42, 180, 84, 8, '#ffe2a8', INK, 7); ctx.font = '800 24px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(['spenden', 'helfen', 'nett sein', 'beten', 'Kirche'][i], 0, 2); ctx.restore() }
    figure(130, HIP, .8, t > fall ? { face: 'shock', aA: [2.6, .3], aB: [-2.6, -.3] } : { face: 'determined', aA: [1.9, -.6], aB: [-.3, -.2] })
    return
  }
  flatBg(CREAM); groundStrip('#d9c9a3')
  sunFig(540, 760, 90, t, 1); godLine(540, 880, 1170, 170 * eio((t - g2) / .8), false)
  figure(540, HIP, .85, { face: 'sad', aA: [.25, .2], aB: [-.25, -.2] })
  pill('vgl. Römer 6,23', 540, 1020, eob((t - wt(2, 'Sünde')) / .35), '#fff', INK, 30)
}
// 3 · Stille: etwas, das kein Gericht kennt
function t3(t) {
  const u = t - CUT(3), z = 1 + .18 * ease(u / 3.5)
  ctx.save(); ctx.translate(800, 1050); ctx.scale(z, z); ctx.translate(-800, -1050)
  court(t, .9); glowAt(800, 1000, 380, .55, '255,236,180')
  judge(810, 1290, 1.05, { face: 'determined', aA: [.6, -.5], aB: [-.6, -.2], f: -1 }, false); judgeDesk()
  ctx.restore()
}
// 4 · Der Richter steht auf
function t4(t) {
  court(t); const walk = wt(4, 'stellt'), say = wt(4, 'Ich')
  judgeDesk()
  const k = eio((t - walk + .3) / 1.6), jx = lerp(820, 480, k), walking = k > .02 && k < .98
  const cf = convict(300, 1560 - 200 * .95, .95, { face: t > say + .3 ? 'joy' : 'shock', aA: [.3, .2], aB: [-.3, -.2], f: 1 })
  judge(jx, 1560 - 200 * .95, .95, walking ? Object.assign(POSE.walk(t * 6), { face: 'smile', f: -1 }) : { face: 'smile', f: -1, aA: [.3, .3], aB: [-2.2, -.3] }, true)
  bubble('Ich trage die Strafe für dich.', 560, 920, say - .05, E(4) + .3, t, [480, 1110], 54)
  if (t > say) glowAt(jx, 1250, 260, .35)
}
// 5 · Das hat Gott getan
function t5(t) {
  const u = t - CUT(5), beam = ease((t - wt(5, 'Jesus')) / .8), noguilt = wt(5, 'Ohne'), cr = wt(5, 'Deshalb')
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1a44'); g.addColorStop(1, '#5b3a6e'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  if (t > cr) cross(540, 640, eio((t - cr) / 1.1), .8)
  ctx.save(); ctx.globalAlpha = .4 * beam; ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.moveTo(470, 0); ctx.lineTo(610, 0); ctx.lineTo(760, 1560); ctx.lineTo(320, 1560); ctx.closePath(); ctx.fill(); ctx.restore()
  groundStrip('#2a2040')
  glowAt(540, 1250, 300, .5 * beam)
  if (beam > .05) figure(540, HIP, .9, { face: 'smile', aA: [.9, .2], aB: [-.9, -.2] }, { robe: true, halo: true })
  if (t > noguilt) outlined('OHNE SCHULD', 540, 960, '900 92px Inter', '#ffd23f', 18, 1, -.05, eob((t - noguilt) / .3))
}
// 6 · Hunger, Verrat, Schmerz, Grab
function t6(t) {
  const grave = wt(6, 'Grab') - .15
  if (t < grave) {
    flatBg(CREAM); groundStrip('#d9c9a3')
    figure(540, HIP, .85, { face: 'sad', aA: [.3, .2], aB: [-.3, -.2] }, { robe: true, halo: true })
    const P = [[40, 860, -.05, wt(6, 'Hunger')], [380, 900, .04, wt(6, 'Verrat')], [720, 860, -.03, wt(6, 'Schmerz')]]
    P.forEach(([x, y, r, t0], i) => panel(x, y, 320, 360, r, (t - t0) / .25, (w, hh) => {
      if (i === 0) { ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 40, 110, 50, 0, 0, Math.PI); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-110, 40); ctx.lineTo(110, 40); ctx.stroke(); outlined('Hunger', 0, -100, '700 54px Caveat', INK, 0) }
      else if (i === 1) { figure(40, 130, .45, Object.assign(POSE.walk(t * 6), { face: 'determined', f: 1 })); moneyBag(-70, 60, .55); outlined('Verrat', 0, -120, '700 54px Caveat', INK, 0) }
      else { figure(0, 130, .5, { face: 'sad', aA: [.2, .2], aB: [-.2, -.2] }); ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 6; ctx.beginPath(); for (let k = 0; k < 14; k++) { const an = k / 14 * 6.28; ctx.lineTo(Math.cos(an) * (34 + (k % 2) * 12), -78 + Math.sin(an) * 12 - 2) } ctx.closePath(); ctx.stroke(); outlined('Schmerz', 0, -130, '700 54px Caveat', INK, 0) }
    }))
    return
  }
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3b4a6b'); g.addColorStop(1, '#8a9bb5'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  groundStrip('#5a6b55')
  ctx.save(); ctx.fillStyle = '#9aa0a6'; ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(620, 1560); ctx.lineTo(620, 1180); ctx.arc(780, 1180, 160, Math.PI, 0); ctx.lineTo(940, 1560); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.moveTo(700, 1560); ctx.lineTo(700, 1260); ctx.arc(780, 1260, 80, Math.PI, 0); ctx.lineTo(860, 1560); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
  const f = figure(380, HIP, .9, { face: 'sad', lean: .18, tilt: .2, aA: [1.2, -1.4], aB: [-1.2, 1.4], f: 1 }, { robe: true, halo: true })
  for (let k = 0; k < 4; k++) { const p = ((t * 1.1) + k / 4) % 1; ctx.fillStyle = SKY; ctx.beginPath(); ctx.ellipse(f.head[0] + 22 + (k % 2) * 6, f.head[1] + 10 + p * 140, 7, 12, 0, 0, 6.3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke() }
  pill('Johannes 11,35', 540, 1020, eob((t - grave - .4) / .35), '#fff', INK, 30)
}
// 7 · Kreuz → Auferstehung → Tränen abwischen
function t7(t) {
  const up = wt(7, 'dritten'), wipeT = wt(7, 'Leid') - .15
  if (t < wipeT) {
    const sk = ease((t - up) / 1.4)
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${lerp(28, 255, sk) | 0},${lerp(22, 200, sk) | 0},${lerp(60, 110, sk) | 0})`); g.addColorStop(1, `rgb(${lerp(90, 255, sk) | 0},${lerp(42, 140, sk) | 0},${lerp(84, 80, sk) | 0})`); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
    if (sk > 0) { ctx.save(); ctx.globalAlpha = .55 * sk; burst(540, lerp(1600, 1080, sk), t, 'rgba(255,245,200,.55)', 24, .15); ctx.restore(); sunFig(540, lerp(1650, 1080, sk), 170, t, 1) }
    ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.ellipse(540, 1760, 950, 300, 0, 0, 6.3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke()
    cross(540, 720, eio((t - CUT(7)) / 1.0), .4 + sk * .6)
    if (t > up) outlined('ER LEBT!', 540, 1280, '900 130px Inter', '#ffd23f', 24, 1, -.05, eob((t - up - .15) / .35))
    return
  }
  flatBg('#fff0c9')
  const u = t - wipeT, wipe = ease((t - wt(7, 'wischt')) / .9)
  ctx.save(); ctx.translate(540, 1180); ctx.scale(2.6, 2.6)
  ctx.beginPath(); ctx.arc(0, 0, 120, 0, 6.3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke()
  ctx.lineWidth = 6; ctx.lineCap = 'round'
  if (wipe < .6) { ctx.beginPath(); ctx.arc(-38, -10, 8, 0, 6.3); ctx.arc(38, -10, 8, 0, 6.3); ctx.fillStyle = INK; ctx.fill(); ctx.beginPath(); ctx.arc(0, 60, 28, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke() }
  else { [-38, 38].forEach(d => { ctx.beginPath(); ctx.arc(d, -6, 12, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke() }); ctx.beginPath(); ctx.arc(0, 30, 30, .15 * Math.PI, .85 * Math.PI); ctx.stroke() }
  for (let k = 0; k < 3; k++) { if (k / 3 < wipe * 1.4 - .2) continue; const p = ((t * .9) + k / 3) % 1; ctx.fillStyle = SKY; ctx.beginPath(); ctx.ellipse(-42 + (k % 2) * 84, 8 + p * 70, 7, 11, 0, 0, 6.3); ctx.fill(); ctx.lineWidth = 2; ctx.stroke() }
  ctx.restore()
  const hx = lerp(1200, 700, ease((t - wt(7, 'wischt') + .5) / .6)) - 140 * Math.sin(wipe * Math.PI), hy = 1150
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 86; ctx.beginPath(); ctx.moveTo(1300, 1600); ctx.lineTo(hx + 60, hy + 50); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 70; ctx.stroke(); ctx.strokeStyle = GOLD; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(hx + 95, hy + 78); ctx.lineTo(hx + 75, hy + 108); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(hx, hy, 34, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore()
  pill('Offenbarung 21,4', 540, 1560 + 30, eob((t - wipeT - .3) / .35), '#fff', INK, 30)
}
// 8 · Mittendrin + Menschen an der Seite
function t8(t) {
  const friends = wt(8, 'Menschen'), kk = ease((t - CUT(8)) / 1.2)
  nightBg(t, 1); rain(t, 1 - ease((t - friends) / 1)); groundStrip('#1f2a4a')
  ctx.save(); ctx.globalAlpha = .35 + .2 * ease((t - friends) / 1); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.moveTo(440, 600); ctx.lineTo(640, 600); ctx.lineTo(860, 1560); ctx.lineTo(220, 1560); ctx.closePath(); ctx.fill(); ctx.restore()
  bench(540, 1475)
  figure(470, NIGHT_HIP, .9, SIT({ face: t > friends ? 'joy' : 'smile', lean: .1 }))
  glowAt(700, 1250, 260, .4); figure(700, HIP, .88, { face: 'smile', f: -1, aA: [.3, .3], aB: [-2.0, -.3] }, { robe: true, halo: true })
  const fk = ease((t - friends) / 1.2)
  if (fk > 0) { figure(lerp(-150, 120, fk), HIP, .8, Object.assign(fk < 1 ? POSE.walk(t * 8) : { aA: [-1.9, -.4], aB: [-.3, -.2] }, { face: 'smile', f: 1 })); figure(lerp(1250, 930, fk), HIP, .8, Object.assign(fk < 1 ? POSE.walk(t * 8) : { aA: [.3, .2], aB: [1.9, .4] }, { face: 'smile', f: -1 })); figure(lerp(-300, 260, fk), HIP + 10, .72, Object.assign(fk < 1 ? POSE.walk(t * 8 + 1) : { aA: [.3, .2], aB: [-.3, -.2] }, { face: 'joy', f: 1 })) }
  if (t > wt(8, 'Mittendrin')) outlined('MITTENDRIN.', 540, 960, '900 96px Inter', '#ffd23f', 18, 1, -.04, eob((t - wt(8, 'Mittendrin')) / .3) * (t > friends ? 1 - ease((t - friends) / .4) : 1))
}
// 9 · App: Christen in deiner Nähe
function t9(t) {
  flatBg(YEL); ctx.globalAlpha = .09; burst(540, 900, t, INK); ctx.globalAlpha = 1
  const u = t - CUT(9)
  appIcon(540, 590, 130, eob(u / .45)); outlined('Oikos Connect', 540, 710, '900 72px Inter', '#fff', 16, ease((u - .25) / .3))
  pill('Kostenlos im App Store', 540, 810, eob((u - 1.0) / .4), '#fff', INK, 32)
  const pw = 500, ph = 1085, py = lerp(1950, 900, ease((u - .3) / .7))
  ctx.save(); ctx.translate(540, py + ph / 2); ctx.rotate(.02); ctx.translate(-pw / 2, -ph / 2)
  rr(14, 14, pw, ph, 64, INK, null); rr(0, 0, pw, ph, 64, '#0b0b0f', INK, 10)
  ctx.save(); ctx.beginPath(); ctx.roundRect(14, 14, pw - 28, ph - 28, 52); ctx.clip(); ctx.drawImage(SCR02, 14, 14, pw - 28, (pw - 28) * 2.17)
  for (let i = 0; i < 7; i++) { const k = eob((u - 1.0 - i * .2) / .3); if (k <= 0) continue; const x = 60 + h(i + 3) * (pw - 120), y = 200 + h(i + 11) * 520; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); glowAt(0, 0, 50, .7, '76,195,255'); ctx.restore() }
  ctx.restore(); ctx.restore()
  const tags = [['Hauskreise', 150, 1180, wt(9, 'Hauskreise')], ['Gemeinden', 930, 1300, wt(9, 'Gemeinden')], ['betet mit dir', 160, 1420, wt(9, 'beten')]]
  tags.forEach(([txt, x, y, t0]) => pill(txt, x, y, eob((t - t0) / .35) * .8, '#4cc3ff', INK, 30))
}
// 10 · Freispruch + Angenommen
function t10(t) {
  const sayIt = wt(10, 'sag') - .1, write = wt(10, 'schreib') - .1
  if (t < sayIt) {
    flatBg(CREAM); groundStrip('#d9c9a3')
    ctx.save(); ctx.translate(540, 1150); ctx.rotate(-.04); rr(-260, -330, 520, 660, 14, '#fffdf6', INK, 9); ctx.fillStyle = INK; ctx.font = '900 58px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('URTEIL', 0, -250); ctx.strokeStyle = '#c9c2b2'; ctx.lineWidth = 6; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-200, -160 + i * 50); ctx.lineTo(i % 2 ? 120 : 200, -160 + i * 50); ctx.stroke() } ctx.restore()
    ctx.save(); ctx.translate(540, 1240); ctx.scale(.58, .58); stampFig(0, 0, clamp((t - S(10) - .2) / .4), -.2, 'FREIGESPROCHEN'); ctx.restore()
    const gk = eob((t - wt(10, 'Geschenk')) / .35); if (gk > 0) { ctx.save(); ctx.translate(880, 1450); ctx.scale(gk, gk); rr(-80, -70, 160, 140, 10, RED, INK, 8); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-14, -70, 28, 140); ctx.strokeRect(-14, -70, 28, 140); ctx.beginPath(); ctx.ellipse(-30, -84, 30, 18, -.4, 0, 6.3); ctx.ellipse(30, -84, 30, 18, .4, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore() }
    return
  }
  if (t < write) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2f55'); g.addColorStop(1, '#6a4a7a'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
    ctx.save(); ctx.globalAlpha = .4; ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.moveTo(470, 0); ctx.lineTo(610, 0); ctx.lineTo(760, 1560); ctx.lineTo(320, 1560); ctx.closePath(); ctx.fill(); ctx.restore()
    groundStrip('#2a2040'); glowAt(540, 1350, 300, .5)
    figure(540, HIP, .9, { face: 'smile', lean: .06, tilt: .35, aA: [.45, 2.45], aB: [-.45, -2.45], f: 1 })
    return
  }
  flatBg(YEL); ctx.globalAlpha = .09; burst(540, 900, t, INK); ctx.globalAlpha = 1
  for (let i = 0; i < 8; i++) { const p = ((t - write) * .5 + i / 8) % 1; if (t < write + i * .15) continue; heartFig(200 + (i % 4) * 230 + Math.sin(p * 6) * 30, 1300 - p * 500, .8, i % 2 ? RED : '#ff7ab6', Math.sin(p * Math.PI)) }
  const ck = eob((t - write) / .4)
  if (ck > 0) { ctx.save(); ctx.translate(540, 1100); ctx.scale(ck, ck); rr(-420, -110, 840, 220, 34, '#fff', INK, 9); ctx.beginPath(); ctx.arc(-320, 0, 52, 0, 6.3); ctx.fillStyle = '#ff7ab6'; ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.font = '800 30px Inter'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('du', -240, -40); ctx.font = '900 64px Inter'; ctx.fillText('Angenommen 🙏', -240, 22); heartFig(340, 30, 1.1 + .1 * Math.sin(t * 8), RED); ctx.restore() }
  const ek = eob((t - E(10) - .1) / .4); if (ek > 0) { appIcon(540, 700, 120, ek); pill('Oikos Connect · Link in Bio', 540, 1450, ek, '#fff', INK, 34) }
}

/* ── Serien-Badge, Übergänge, Wackeln, Blitze ── */
function topBar(t) {
  const x0 = 90, x1 = W - 90, y = 184
  ctx.fillStyle = 'rgba(20,17,15,.35)'; ctx.fillRect(x0, y, x1 - x0, 10); ctx.fillStyle = '#ffd83d'; ctx.fillRect(x0, y, (x1 - x0) * clamp(t / T.total), 10)
  const mx = x0 + (x1 - x0) * S(4) / T.total; ctx.fillStyle = t >= S(4) ? '#ffd83d' : '#fff'; ctx.beginPath(); ctx.arc(mx, y + 5, 13, 0, 6.3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke()
  ctx.font = '800 22px Inter'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText('DIE WENDE', mx, y - 20); ctx.fillStyle = '#fff'; ctx.fillText('DIE WENDE', mx, y - 20)
  ctx.save(); ctx.font = '800 26px Inter'; const txt = 'WARUM LÄSST GOTT LEID ZU? · TEIL 2/2', tw = ctx.measureText(txt).width + 44; rr(540 - tw / 2, 222, tw, 52, 26, 'rgba(20,17,15,.78)', null); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 540, 249); ctx.restore()
}
const WIPES = () => [wt(2, 'Genauso') - .2, CUT(5), CUT(7), CUT(9)]
function wipes(t) { WIPES().forEach(c => { const p = (t - (c - .22)) / .44; if (p <= 0 || p >= 1) return; const cx0 = lerp(-760, W + 760, p); ctx.save(); ctx.translate(cx0, H / 2); ctx.transform(1, 0, -.35, 1, 0, 0); ctx.fillStyle = INK; ctx.fillRect(-720, -H, 1440, H * 2); ctx.fillStyle = YEL; ctx.fillRect(-760, -H, 40, H * 2); ctx.fillRect(720, -H, 40, H * 2); ctx.restore() }) }
const SHAKES = () => [[wt(1, 'Würdest'), .3, 10], [S(2) + .05, .35, 16], [wt(2, 'löschen'), .35, 12], [S(10) + .25, .4, 18], [wt(7, 'dritten'), .35, 12], [wt(5, 'Ohne'), .3, 10]]
function shake(t) { let x = 0, y = 0; SHAKES().forEach(([s, d, a]) => { const u = t - s; if (u > 0 && u < d) { const k = 1 - u / d; x += Math.sin(u * 95) * a * k; y += Math.cos(u * 83) * a * k * .7 } }); return [x, y] }
function flashes(t) { let f = 1 - clamp(t / .2); [wt(7, 'dritten'), wt(5, 'Jesus')].forEach(s => { if (t > s && t < s + .4) f = Math.max(f, (1 - (t - s) / .4) * .9) }); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H) } }

window.setTime = function (t) {
  BOIL = Math.floor(t * 9)
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.save()
  const [sx, sy] = shake(t); ctx.translate(sx, sy)
  if (t < S(2) - .05) t1(t)
  else if (t < CUT(3)) t2(t)
  else if (t < CUT(4)) t3(t)
  else if (t < CUT(5)) t4(t)
  else if (t < CUT(6)) t5(t)
  else if (t < CUT(7)) t6(t)
  else if (t < CUT(8)) t7(t)
  else if (t < CUT(9)) t8(t)
  else if (t < CUT(10)) t9(t)
  else t10(t)
  ctx.restore()
  wipes(t); subtitles(t); topBar(t); flashes(t)
}
Promise.all([document.fonts.load('900 40px Inter'), document.fonts.load('800 40px Inter'), document.fonts.load('700 40px Caveat'), document.fonts.load('italic 700 40px Caveat'), document.fonts.load('40px "Noto Color Emoji"'), ...[ICON, SCR02].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))])
  .then(() => { window.setTime(0); window.__ready = true })
