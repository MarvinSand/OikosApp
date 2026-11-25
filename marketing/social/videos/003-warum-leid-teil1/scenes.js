/* ══════════════ Video 003 · „Warum lässt Gott Leid zu?“ Teil 1 · Szenen ══════════════
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

/* ══════════════ Szenen ══════════════ */
// 1 · Hook: Regen, allein auf der Bank
function sc1(t) {
  nightBg(t); rain(t, 1)
  cloud(540, 760, 1.5, '#4a5578'); cloud(250, 820, 1.0, '#3e486a'); cloud(860, 840, 1.1, '#3e486a')
  lightning(620, 860, t > .3 && t < .55 ? 1 : (t > 2.9 && t < 3.05 ? .8 : 0))
  groundStrip('#1f2a4a'); bench(540, 1475)
  const f = figure(470, NIGHT_HIP, .9, SIT())
  const hk = eob((t - wt(1, 'Liebe')) / .35); if (hk > 0) { glowAt(f.head[0], f.head[1] - 150, 160, .5 * hk); heartFig(f.head[0], f.head[1] - 150, 1.6 * hk + Math.sin(t * 6) * .05, RED) }
}
// 2 + 3 · Garten: erfüllt von Liebe, Himmel auf Erden
function garden(t, n3) {
  const g = ctx.createLinearGradient(0, 0, 0, 1560); g.addColorStop(0, '#7fd0ff'); g.addColorStop(1, '#e9f8ff'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(800, 760); ctx.lineTo(980, 760); ctx.lineTo(720, 1560); ctx.lineTo(300, 1560); ctx.closePath(); ctx.fill(); ctx.restore()
  sunFig(860, 740, 90, t, 1); outlined('Gott', 860, 880, '700 46px Caveat', '#fff', 8)
  groundStrip('#8fd16a'); tree(140, 1560, .95, 1); tree(970, 1560, .8, 1)
  const fill = n3 ? 100 : ease((t - S(2) - 1.2) / 2.6) * 100
  const k = n3 ? 1 : eob((t - S(2) - .9) / .4)
  const happy = n3 || t > S(2) + 2.4
  const A = figure(420, HIP, .85, n3 ? POSE.cheer(t * 6, { face: 'joy' }) : { face: happy ? 'joy' : 'smile', aA: [.3, .2], aB: [-.3, -.2] })
  const B = figure(680, HIP, .85, n3 ? { face: 'joy', aA: [-1.2, -.4], aB: [-.3, -.2], f: -1 } : { face: happy ? 'joy' : 'smile', aA: [.3, .2], aB: [-.3, -.2], f: -1 })
  battery(A.head[0], A.head[1] - 110, fill, k); battery(B.head[0], B.head[1] - 110, fill, k)
  if (fill > 99) { glowAt(A.head[0], A.head[1] - 110, 120, .35); glowAt(B.head[0], B.head[1] - 110, 120, .35) }
  if (n3) {
    const ap = clamp((t - wt(3, 'lieben') + .3) / .7); const ax = lerp(470, 640, eio(ap)), ay = lerp(1200, 1220, ap) - Math.sin(ap * Math.PI) * 120
    ctx.beginPath(); ctx.arc(ax, ay, 22, 0, 6.3); ctx.fillStyle = RED; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke()
    for (let i = 0; i < 7; i++) { const p = ((t - S(3)) * .45 + i / 7) % 1; heartFig(380 + (i % 3) * 160 + Math.sin(p * 6 + i) * 30, 1200 - p * 520, .7 + (i % 2) * .3, i % 2 ? RED : '#ff7ab6', Math.sin(p * Math.PI)) }
    const fk = t - wt(3, 'Himmel')
    if (fk > 0) { for (let i = 0; i < 12; i++) { const k2 = eob((fk - i * .07) / .3); if (k2 <= 0) continue; const x = 50 + i * 90, hgt = 60 + (i % 3) * 20; ctx.save(); ctx.translate(x, 1560); ctx.scale(k2, k2); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -hgt); ctx.stroke(); ctx.fillStyle = [RED, GOLD, '#ff7ab6', SKY][i % 4]; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(Math.cos(p * 1.257) * 15, -hgt + Math.sin(p * 1.257) * 15, 12, 0, 6.3); ctx.fill(); ctx.stroke() } ctx.restore() }
      const bk = eob((fk) / .4); if (bk > 0) outlined('HIMMEL AUF ERDEN', 540, 1000, '900 84px Inter', '#ffd23f', 18, 1, -.05, bk) }
  }
}
// 4 · Roboter → freier Wille
function sc4(t) {
  flatBg(CREAM); groundStrip('#d9c9a3')
  const fall = wt(4, 'braucht'), will = wt(4, 'Also')
  if (t < fall) { robot(380, 1560, 1, t); bubble('Ich liebe dich.', 560, 920, S(4) - .1, fall - .1, t, [440, 1100], 62); outlined('BEEP', 230, 980, '900 44px Inter', '#7ee0ff', 9, Math.sin(t * 12) > 0 ? 1 : .4, -.2) }
  else robotPieces(380, 1560, t - fall)
  if (t > fall + .1 && t < will) { const hk = eob((t - fall - .1) / .4); glowAt(540, 1050, 220, .5 * hk); heartFig(540, 1050, 3.2 * hk, RED) }
  if (t > will - .1) { signpost(420, (t - will + .1) / .35); figure(880, HIP, .85, POSE.shrug({ face: 'shock', f: -1 })); const q = eob((t - will - .2) / .3); if (q > 0) outlined('?', 1000, 1060, '900 120px Inter', '#fff', 20, 1, .2, q) }
}
// 5 · Die Lüge
function sc5(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#140a22'); g.addColorStop(1, '#3a1c48'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  glowAt(800, 1150, 300, .25, '255,120,120')
  groundStrip('#24142e'); tree(800, 1560, 1.05, 0)
  const grab = wt(5, 'Hol'), fruitK = 1
  serpent(720, 1220, t, ease((t - S(5) + .2) / .6))
  darkBubble('Gott hält dir etwas vor …', 560, 860, wt(5, 'Gott'), grab - .15, t, [760, 1160])
  darkBubble('Hol es dir selbst.', 600, 860, grab, E(5) + .3, t, [760, 1160])
  const reach = ease((t - grab) / .9), px = lerp(360, 640, reach)
  const fx = lerp(820, px + 60, clamp((t - grab - .8) / .5)), fy = lerp(1150, 1150 + 40 * clamp((t - grab - .8) / .5), 1)
  glowAt(fx, fy, 120, .6, '255,214,102'); ctx.beginPath(); ctx.arc(fx, fy, 34, 0, 6.3); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke()
  figure(px, HIP, .85, reach > .05 ? Object.assign(POSE.walk(t * 7), { face: 'determined', aA: [2.4, .2] }) : { face: 'shock', aA: [.3, .2], aB: [-.3, -.2] })
}
// 6 · Verbindung zerbrochen → Leid
function sc6(t) {
  flatBg(CREAM); const brk = wt(6, 'zerbrochen'), world = wt(6, 'Welt'), leid = wt(6, 'Daher')
  const gap = 150 * eio((t - brk) / .6)
  sunFig(540, 760, 90, t, 1, 'smile'); outlined('Gott', 690, 760, '700 46px Caveat', INK, 0)
  godLine(540, 880, 1170, gap, false)
  groundStrip('#d9c9a3')
  if (t > world) { const k = ease((t - world) / .5); ctx.save(); ctx.strokeStyle = INK; ctx.fillStyle = '#2a2420'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 1565); for (let i = 0; i <= 12; i++) ctx.lineTo(i * 90 * k, 1565 + (i % 2 ? 26 : 6)); ctx.lineTo(1080 * k, 1565); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore() }
  const f = figure(540, HIP, .85, { face: t > brk ? 'sad' : 'smile', aA: [.25, .2], aB: [-.25, -.2] })
  battery(f.head[0] + 120, f.head[1] - 30, t < brk ? 100 : lerp(100, 12, ease((t - brk) / 1.4)), 1)
  const P = [[40, 900, -.06], [380, 950, .04], [720, 900, -.03]]
  P.forEach(([x, y, r], i) => panel(x, y, 320, 360, r, (t - leid - i * .45) / .25, (w, hh) => {
    if (i === 0) { ctx.fillStyle = '#2a3566'; ctx.fillRect(-w / 2, -hh / 2, w, hh); cloud(0, -60, .9, '#55607f'); lightning(10, -10, 1); rain(t, 1) }
    else if (i === 1) { figure(-60, 110, .45, { face: 'determined', lean: .15, aA: [1.6, -.3], aB: [1.2, .2], f: 1 }); figure(70, 110, .45, { face: 'determined', lean: -.15, aA: [-1.6, .3], aB: [-1.2, -.2], f: -1 }); outlined('!!', 0, -110, '900 70px Inter', RED, 10) }
    else { figure(0, 120, .5, { face: 'sad', lean: .2, tilt: .3, aA: [.2, .2], aB: [-.2, -.2] }); for (let k = 0; k < 3; k++) { const p = ((t * 1.3) + k / 3) % 1; ctx.fillStyle = SKY; ctx.beginPath(); ctx.ellipse(28, -30 + p * 90, 6, 10, 0, 0, 6.3); ctx.fill() } }
  }))
}
// 7 · Spiegel: auch ich
function sc7(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2236'); g.addColorStop(1, '#2d3350'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  groundStrip('#262b40')
  const z = 1 + .08 * ease((t - S(7)) / 4); ctx.save(); ctx.translate(540, 1200); ctx.scale(z, z); ctx.translate(-540, -1200)
  const sad = t > wt(7, 'Auch')
  ctx.save(); ctx.beginPath(); ctx.ellipse(700, 1150, 210, 320, 0, 0, 6.3); const mg = ctx.createLinearGradient(500, 830, 900, 1470); mg.addColorStop(0, '#cfe6ff'); mg.addColorStop(1, '#8fb3d9'); ctx.fillStyle = mg; ctx.fill(); ctx.clip()
  figure(760, 1380, .7, { face: sad ? 'sad' : 'determined', f: -1, aA: [.25, .2], aB: [-.25, -.2] })
  ctx.globalAlpha = .35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(560, 900); ctx.lineTo(620, 900); ctx.lineTo(520, 1300); ctx.lineTo(480, 1300); ctx.fill(); ctx.restore()
  ctx.lineWidth = 26; ctx.strokeStyle = '#c9952e'; ctx.beginPath(); ctx.ellipse(700, 1150, 220, 330, 0, 0, 6.3); ctx.stroke(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.beginPath(); ctx.ellipse(700, 1150, 236, 346, 0, 0, 6.3); ctx.stroke()
  figure(300, HIP, .85, { face: sad ? 'sad' : 'determined', f: 1, lean: sad ? .15 : 0, tilt: sad ? .25 : 0, aA: [.25, .2], aB: [-.25, -.2] })
  ctx.restore()
}
// 8 · Waage: kurze Zeit vs. Ewigkeit
function sc8(t) {
  flatBg(CREAM); groundStrip('#d9c9a3')
  const ja = wt(8, 'Ja.'), brk = wt(8, 'zerbricht'), vt = wt(8, 'Vertrauen'), imm = wt(8, 'immer')
  if (t < ja + .1) { figure(540, HIP, .9, POSE.shrug({ face: 'shock' })); bubble('Aber Gott wusste das doch!', 540, 880, S(8) - .05, ja, t, [540, 1100], 58); outlined('?', 720, 1080, '900 140px Inter', '#fff', 22, 1, .2, eob((t - S(8)) / .3)); return }
  const k = eob((t - ja) / .4), tilt = t < vt ? 0 : .26 * eio((t - vt) / .8) + Math.sin((t - vt) * 9) * Math.exp(-(t - vt) * 3) * .06
  ctx.save(); ctx.globalAlpha = clamp(k * 2)
  ctx.fillStyle = '#9b6a3c'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(540, 880); ctx.lineTo(600, 1560); ctx.lineTo(480, 1560); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.save(); ctx.translate(540, 900); ctx.rotate(tilt); rr(-380, -14, 760, 28, 12, '#c9952e', INK, 8); ctx.restore()
  const end = sgn => [540 + Math.cos(tilt) * 360 * sgn, 900 + Math.sin(tilt) * 360 * sgn]
  ;[-1, 1].forEach(sgn => { const [x, y] = end(sgn); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 90, y + 190); ctx.moveTo(x, y); ctx.lineTo(x + 90, y + 190); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y + 200, 120, 28, 0, 0, Math.PI); ctx.fillStyle = '#e0b45a'; ctx.fill(); ctx.lineWidth = 8; ctx.stroke()
    if (sgn < 0) { earthIcon(x, y + 130, 62, clamp((t - brk) / .4)); outlined('KURZE ZEIT', x, y + 285, '900 40px Inter', '#fff', 10) }
    else { glowAt(x, y + 130, 150, t > imm ? .7 : .35); heartFig(x, y + 135, 2.2 + (t > imm ? Math.sin(t * 8) * .1 : 0), '#ffd23f'); outlined('EWIGKEIT', x, y + 285, '900 40px Inter', '#ffd23f', 10) } })
  ctx.restore()
  if (t > imm) confetti(t, imm)
}
// 9 · Jesus kommt + Kreuz + Auferstehung
function sc9(t) {
  const cr = wt(9, 'trug'), up = wt(9, 'auferstanden')
  if (t < cr - .15) {
    const arrive = S(9) + 1.2, kk = ease((t - S(9) - .2) / 1.5)
    nightBg(t, 1 - kk * .5); rain(t, 1 - kk)
    ctx.save(); ctx.globalAlpha = .45 * kk; ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.moveTo(500, 600); ctx.lineTo(700, 600); ctx.lineTo(820, 1560); ctx.lineTo(380, 1560); ctx.closePath(); ctx.fill(); ctx.restore()
    cloud(320 - kk * 200, 760, 1.3, '#4a5578'); cloud(800 + kk * 220, 780, 1.2, '#4a5578')
    groundStrip('#1f2a4a'); bench(540, 1475)
    const jx = lerp(1250, 700, eio((t - arrive) / 1.6)), walking = t > arrive && t < arrive + 1.6
    figure(470, NIGHT_HIP, .9, SIT({ face: t > arrive + 1.8 ? 'smile' : 'sad', lean: t > arrive + 1.8 ? .1 : .24 }))
    if (t > arrive - .1) { glowAt(jx, 1250, 260, .45); figure(jx, HIP, .88, walking ? Object.assign(POSE.walk(t * 6), { face: 'smile', f: -1 }) : { face: 'smile', f: -1, aA: [.3, .3], aB: [-2.0, -.3] }, { robe: true, halo: true }) }
    return
  }
  const sk = ease((t - up) / 1.4)
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${lerp(28, 255, sk) | 0},${lerp(22, 200, sk) | 0},${lerp(60, 110, sk) | 0})`); g.addColorStop(1, `rgb(${lerp(90, 255, sk) | 0},${lerp(42, 140, sk) | 0},${lerp(84, 80, sk) | 0})`); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  if (sk > 0) { ctx.save(); ctx.globalAlpha = .55 * sk; burst(540, lerp(1600, 1080, sk), t, 'rgba(255,245,200,.55)', 24, .15); ctx.restore(); sunFig(540, lerp(1650, 1080, sk), 170, t, 1) }
  ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.ellipse(540, 1760, 950, 300, 0, 0, 6.3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke()
  cross(540, 720, eio((t - cr + .1) / 1.0), .4 + sk * .6)
  if (t > up) outlined('ER LEBT!', 540, 1280, '900 130px Inter', '#ffd23f', 24, 1, -.05, eob((t - up - .15) / .35))
}
// 10 · Wieder verbunden
function sc10(t) {
  flatBg('#fff0c9'); groundStrip('#d9c9a3')
  sunFig(540, 760, 90, t, 1)
  const draw = ease((t - S(10) - .1) / 1.4), y1 = 880, y2 = 1170
  ctx.save(); ctx.strokeStyle = '#ffd23f'; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 36; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(540, y1); ctx.lineTo(540, lerp(y1, y2, draw)); ctx.stroke(); ctx.restore()
  if (draw > .99) for (let k = 0; k < 5; k++) { const p = (t * .6 + k / 5) % 1; glowAt(540, lerp(y1, y2, p), 40, .9 * Math.sin(p * Math.PI)) }
  const good = wt(10, 'gute'), cheer = t > good
  const f = figure(540, HIP, .85, cheer ? POSE.cheer(t * 8) : { face: 'smile', aA: [.3, .2], aB: [-.3, -.2] })
  battery(f.head[0] + 130, f.head[1] - 20, lerp(12, 100, ease((t - S(10) - 1.2) / 1.6)), 1)
  if (cheer) confetti(t, good)
}
// 11 · App-Moment
function sc11(t) {
  flatBg(YEL); ctx.globalAlpha = .09; burst(540, 900, t, INK); ctx.globalAlpha = 1
  const u = t - CUT(11)
  appIcon(540, 590, 130, eob(u / .45)); outlined('Oikos Connect', 540, 710, '900 72px Inter', '#fff', 16, ease((u - .25) / .3))
  const pw = 500, ph = 1085, py = lerp(1950, 900, ease((u - .3) / .7)), px = 540 - pw / 2
  ctx.save(); ctx.translate(540, py + ph / 2); ctx.rotate(-.025); ctx.translate(-pw / 2, -ph / 2)
  rr(14, 14, pw, ph, 64, INK, null); rr(0, 0, pw, ph, 64, '#0b0b0f', INK, 10)
  ctx.save(); ctx.beginPath(); ctx.roundRect(14, 14, pw - 28, ph - 28, 52); ctx.clip(); ctx.drawImage(SCR10, 14, 14, pw - 28, (pw - 28) * 2.17)
  const cy = 14 + (pw - 28) * 2.17 * (873 / 2170), ch = (pw - 28) * 2.17 * (477 / 2170), pulse = .6 + .4 * Math.sin(t * 6)
  ctx.restore()
  ctx.strokeStyle = `rgba(255,210,63,${pulse})`; ctx.lineWidth = 10; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.roundRect(22, cy - 6, pw - 44, ch + 12, 26); ctx.stroke(); ctx.shadowBlur = 0
  ctx.restore()
  for (let i = 0; i < 6; i++) { const p = ((u - 1.0) * .5 + i / 6) % 1; if (u < 1.0 + i * .2) continue; const left = i % 2 === 0, x = (left ? 150 : 930) + Math.sin(p * 5 + i) * 25, y = 1400 - p * 480; ctx.save(); ctx.globalAlpha = Math.sin(p * Math.PI); pill('+1 🙏', x, y, .75, '#fff', INK, 30); ctx.restore() }
  pill('Kostenlos im App Store', 540, 810, eob((u - 1.2) / .4), '#fff', INK, 32)
}
// 12 · Teaser Teil 2 + Endkarte
function sc12(t) {
  const g = ctx.createRadialGradient(540, 1100, 50, 540, 1100, 900); g.addColorStop(0, '#2a3566'); g.addColorStop(1, '#070b1c'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120)
  const u = t - CUT(12), hit = .7
  ctx.save(); ctx.translate(540, 1300); rr(-200, 0, 400, 70, 14, '#7a4a28', INK, 9); ctx.restore()
  const ang = u < hit ? lerp(-1.1, 0, eio(u / hit)) : Math.sin((u - hit) * 20) * Math.exp(-(u - hit) * 6) * .08
  ctx.save(); ctx.translate(800, 1210); ctx.rotate(ang); ctx.fillStyle = '#9b6a3c'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.fillRect(-260, -22, 260, 44); ctx.strokeRect(-260, -22, 260, 44); rr(-360, -90, 140, 180, 24, '#7a4a28', INK, 9); ctx.restore()
  if (u > hit) { glowAt(540, 1290, 300, .5 * Math.exp(-(u - hit) * 2)); outlined('TEIL 2', 540, 900, '900 170px Inter', '#ffd23f', 28, 1, -.06, eob((u - hit - .1) / .35)) }
  const ek = eob((t - E(12) - .1) / .4)
  if (ek > 0) { pill('FOLGEN für Teil 2', 540, 1480, ek * (1 + .04 * Math.sin(t * 7)), '#ffd23f', INK, 40); appIcon(540, 680, 120, ek) }
}

/* ══════════════ Untertitel (Karaoke, Wort für Wort) ══════════════ */
const RED_W = /^(leid|lüge|zerbrochen|roboter|schuld|zerbricht|weh)/i
const GOLD_W = /^(liebe|himmel|erden|freiheit|jesus|kreuz|auferstanden|vertrauen|nachricht|oikos|connect|ewig|immer|gott)/i
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
/* ── Serien-Badge + Fortschritt ── */
function topBar(t) {
  const x0 = 90, x1 = W - 90, y = 184
  ctx.fillStyle = 'rgba(20,17,15,.35)'; ctx.fillRect(x0, y, x1 - x0, 10); ctx.fillStyle = '#ffd83d'; ctx.fillRect(x0, y, (x1 - x0) * clamp(t / T.total), 10)
  const mx = x0 + (x1 - x0) * S(9) / T.total; ctx.fillStyle = t >= S(9) ? '#ffd83d' : '#fff'; ctx.beginPath(); ctx.arc(mx, y + 5, 13, 0, 6.3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke()
  ctx.font = '800 22px Inter'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText('DIE WENDE', mx, y - 20); ctx.fillStyle = '#fff'; ctx.fillText('DIE WENDE', mx, y - 20)
  ctx.save(); ctx.font = '800 26px Inter'; const txt = 'WARUM LÄSST GOTT LEID ZU? · TEIL 1/2', tw = ctx.measureText(txt).width + 44; rr(540 - tw / 2, 222, tw, 52, 26, 'rgba(20,17,15,.78)', null); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 540, 249); ctx.restore()
}
/* ── Übergänge, Wackeln, Blitze ── */
const WIPES = () => [CUT(2), CUT(5), CUT(9), CUT(11)]
function wipes(t) { WIPES().forEach(c => { const p = (t - (c - .22)) / .44; if (p <= 0 || p >= 1) return; const cx0 = lerp(-760, W + 760, p); ctx.save(); ctx.translate(cx0, H / 2); ctx.transform(1, 0, -.35, 1, 0, 0); ctx.fillStyle = INK; ctx.fillRect(-720, -H, 1440, H * 2); ctx.fillStyle = YEL; ctx.fillRect(-760, -H, 40, H * 2); ctx.fillRect(720, -H, 40, H * 2); ctx.restore() }) }
const SHAKES = () => [[.32, .45, 20], [2.9, .3, 10], [wt(4, 'braucht'), .35, 12], [wt(6, 'zerbrochen'), .45, 18], [wt(6, 'Daher'), .3, 8], [wt(9, 'auferstanden'), .35, 12], [CUT(12) + .7, .4, 22]]
function shake(t) { let x = 0, y = 0; SHAKES().forEach(([s, d, a]) => { const u = t - s; if (u > 0 && u < d) { const k = 1 - u / d; x += Math.sin(u * 95) * a * k; y += Math.cos(u * 83) * a * k * .7 } }); return [x, y] }
function flashes(t) { let f = Math.max(1 - clamp(t / .2), t > .3 && t < .5 ? 1 - (t - .3) / .2 : 0, t > 2.9 && t < 3.05 ? .6 : 0); const up = wt(9, 'auferstanden'); if (t > up && t < up + .4) f = Math.max(f, 1 - (t - up) / .4); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H) } }

window.setTime = function (t) {
  BOIL = Math.floor(t * 9)
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.save()
  const [sx, sy] = shake(t); ctx.translate(sx, sy)
  if (t < CUT(2)) sc1(t)
  else if (t < CUT(3)) garden(t, false)
  else if (t < CUT(4)) garden(t, true)
  else if (t < S(5) - .3) sc4(t)
  else if (t < S(6) - .2) sc5(t)
  else if (t < CUT(7)) sc6(t)
  else if (t < S(8) - .3) sc7(t)
  else if (t < S(9) - .3) sc8(t)
  else if (t < CUT(10)) sc9(t)
  else if (t < CUT(11)) sc10(t)
  else if (t < CUT(12)) sc11(t)
  else sc12(t)
  ctx.restore()
  wipes(t); subtitles(t); topBar(t); flashes(t)
}
Promise.all([document.fonts.load('900 40px Inter'), document.fonts.load('800 40px Inter'), document.fonts.load('700 40px Caveat'), document.fonts.load('italic 700 40px Caveat'), document.fonts.load('italic 500 40px Lora'), document.fonts.load('40px "Noto Color Emoji"'), ...[ICON, SCR10].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))])
  .then(() => { window.setTime(0); window.__ready = true })
