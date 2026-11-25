/* Cover Teil 2 (1080×1920, wichtiger Inhalt im 3:4-Bereich y 240–1680) */
function coverCommon(part) {
  const g = ctx.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, 'rgba(5,8,25,.92)'); g.addColorStop(.8, 'rgba(5,8,25,.5)'); g.addColorStop(1, 'rgba(5,8,25,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1000)
  ctx.save(); ctx.translate(860, 330); ctx.rotate(.08); rr(-120, -46, 240, 92, 20, INK, null); rr(-128, -54, 240, 92, 20, '#ffd23f', INK, 8); ctx.font = '900 46px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('TEIL ' + part, -8, -6); ctx.restore()
  appIcon(420, 1720, 74, 1); outlined('Oikos Connect', 640, 1722, '900 46px Inter', '#fff', 10)
}
window.setTime = function () {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); BOIL = 3
  court(0); judge(810, 1290, 1.05, { face: 'determined', aA: [.6, -.5], aB: [-1.4, -.6], f: -1 }, false); judgeDesk()
  convict(300, 1390, .95, { face: 'shock', aA: [2.6, .3], aB: [-.3, -.2] }); podium(); moneyBag(170, 1330, 1)
  pill('JA', 330, 985, 1.1, '#7be08a', INK, 56); pill('NEIN', 750, 985, 1.1, '#ff6b6b', INK, 56)
  coverCommon(2)
  ctx.save(); ctx.font = '800 32px Inter'; const s = 'WARUM LÄSST GOTT LEID ZU?', tw = ctx.measureText(s).width + 50; rr(400 - tw / 2, 301, tw, 62, 31, 'rgba(255,255,255,.14)', null); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 400, 332); ctx.restore()
  outlined('WÜRDEST DU IHN', 540, 520, '900 118px Inter', '#fff', 24)
  outlined('FREISPRECHEN?', 540, 680, '900 122px Inter', '#ffc93c', 26, 1, -.02)
  outlined('Ein Mörder sagt: „Ich habe 100.000 € gespendet!“', 540, 830, '700 56px Caveat', '#ffe2b0', 12)
}
