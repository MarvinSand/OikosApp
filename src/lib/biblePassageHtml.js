// YouVersion liefert Kapitel-HTML im Format:
//   <div class="p">
//     <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Verstext…
//     <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>Verstext…
//   </div>
// Die Versgrenze ist nur durch den leeren "yv-v"-Marker gegeben, der Text
// selbst hängt lose daneben. Für Tap-Auswahl + Markierungs-Overlay wird jeder
// Vers hier in einen eigenen <span data-verse="N" class="bible-verse">
// gewrappt – danach lässt sich Vers N direkt per closest('[data-verse]')
// treffen und farblich hinterlegen.
export function wrapVersesInHtml(html) {
  if (!html) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('div.p, div.m, div.q, div.q1, div.q2, div.li, div.li1').forEach(container => {
    const children = Array.from(container.childNodes)
    let currentWrapper = null
    let currentVerse = null

    for (const node of children) {
      if (node.nodeType === 1 && node.classList?.contains('yv-v')) {
        currentVerse = node.getAttribute('v')
        currentWrapper = doc.createElement('span')
        currentWrapper.className = 'bible-verse'
        currentWrapper.setAttribute('data-verse', currentVerse)
        container.insertBefore(currentWrapper, node)
        currentWrapper.appendChild(node)
        continue
      }
      if (currentWrapper) {
        currentWrapper.appendChild(node)
      }
    }
  })

  return doc.body.innerHTML
}

// Extrahiert den reinen Verstext für die angegebenen Versnummern direkt aus
// dem bereits gerenderten DOM (kein zweiter API-Call nötig) - z.B. für ein
// Zitat beim Teilen als Feed-Post. Erwartet die von wrapVersesInHtml erzeugte
// Struktur ([data-verse="N"] enthält den .yv-v-Marker + die .yv-vlbl-
// Versnummer-Anzeige + den eigentlichen Text).
export function verseTextFromContainer(container, verseNums) {
  if (!container || !verseNums?.length) return ''
  return verseNums
    .map(n => {
      const el = container.querySelector(`[data-verse="${n}"]`)
      if (!el) return ''
      const clone = el.cloneNode(true)
      clone.querySelectorAll('.yv-v, .yv-vlbl').forEach(m => m.remove())
      return clone.textContent.trim()
    })
    .filter(Boolean)
    .join(' ')
}
