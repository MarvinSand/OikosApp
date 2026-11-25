/* Cover Teil 1 (1080×1920, wichtiger Inhalt im 3:4-Bereich y 240–1680) */
function coverCommon(part) {
  const g = ctx.createLinearGradient(0, 0, 0, 1250); g.addColorStop(0, 'rgba(5,8,25,.92)'); g.addColorStop(.75, 'rgba(5,8,25,.55)'); g.addColorStop(1, 'rgba(5,8,25,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1250)
  ctx.save(); ctx.translate(860, 330); ctx.rotate(.08); rr(-120, -46, 240, 92, 20, INK, null); rr(-128, -54, 240, 92, 20, '#ffd23f', INK, 8); ctx.font = '900 46px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('TEIL ' + part, -8, -6); ctx.restore()
  appIcon(420, 1720, 74, 1); outlined('Oikos Connect', 640, 1722, '900 46px Inter', '#fff', 10)
}
window.setTime = function () {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); BOIL = 3
  sc1(4.2)
  glowAt(470, 1060, 220, .6); heartFig(470, 1060, 2.2, RED)
  coverCommon(1)
  outlined('WARUM LÄSST', 540, 470, '900 128px Inter', '#fff', 26)
  outlined('GOTT', 540, 630, '900 170px Inter', '#ffc93c', 30)
  outlined('LEID ZU?', 540, 810, '900 190px Inter', '#ff5a5f', 32, 1, -.03)
  outlined('Die Antwort hat mit Liebe zu tun', 540, 960, '700 66px Caveat', '#ffe2b0', 12)
}
