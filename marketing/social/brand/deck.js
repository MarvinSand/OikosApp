// Gemeinsame Logik für alle Post-Decks:
//  ?f=ig  → Instagram 1080×1350 (Standard) · ?f=tt → TikTok/Story 1080×1920
//  data-src="…{r}…"  → {r} wird je Format zu 45 bzw. 916 (Foto-Varianten)
//  <i data-icon="name"> → Lucide-Icon aus icons.js
//  .counter wird automatisch „01 / 10“, .progress bekommt Punkte.
(function () {
  const params = new URLSearchParams(location.search)
  const f = params.get('f') === 'tt' ? 'tt' : 'ig'
  document.documentElement.dataset.f = f
  const ratio = f === 'tt' ? '916' : '45'

  function init() {
    document.querySelectorAll('[data-src]').forEach(img => {
      img.src = img.dataset.src.replaceAll('{r}', ratio)
    })
    document.querySelectorAll('[data-bgimg]').forEach(el => {
      el.style.backgroundImage = `url("${el.dataset.bgimg}")`
    })
    const icons = window.OIKOS_ICONS || {}
    document.querySelectorAll('i[data-icon]').forEach(i => {
      const p = icons[i.dataset.icon]
      if (!p) { console.warn('Icon fehlt:', i.dataset.icon); return }
      const sw = i.dataset.stroke || '2'
      i.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`
    })
    const slides = [...document.querySelectorAll('.slide')]
    slides.forEach((s, idx) => {
      const n = String(idx + 1).padStart(2, '0')
      const total = String(slides.length).padStart(2, '0')
      s.dataset.index = n
      s.querySelectorAll('.counter').forEach(c => { c.textContent = `${n} / ${total}` })
      s.querySelectorAll('.progress').forEach(p => {
        p.innerHTML = slides.map((_, j) => `<i class="${j === idx ? 'on' : ''}"></i>`).join('')
      })
    })
    // Für den Renderer: fertig, sobald Fonts + Bilder geladen sind
    const imgs = [...document.images].filter(i => i.src)
    Promise.all([
      document.fonts.ready,
      ...imgs.map(i => i.complete ? Promise.resolve() : new Promise(r => { i.onload = r; i.onerror = r })),
    ]).then(() => { document.body.dataset.ready = '1' })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
