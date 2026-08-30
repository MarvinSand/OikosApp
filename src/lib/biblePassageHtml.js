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

// Die YouVersion-API akzeptiert Vers-Bereiche als eigene Passage-ID
// (z.B. "LUK.15.11-LUK.15.32") nicht - liefert dafür 404. Einzelverse
// ("LUK.15.11") funktionieren. Deshalb wird immer das ganze Kapitel
// geladen (wrapVersesInHtml oben) und hier client-seitig auf den
// gewünschten Versbereich zugeschnitten: alle [data-verse]-Spans außerhalb
// [verseStart, verseEnd] werden entfernt.
export function extractVerseRange(html, verseStart, verseEnd) {
  if (!html || verseStart == null) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const end = verseEnd ?? verseStart

  doc.querySelectorAll('[data-verse]').forEach(el => {
    const num = parseInt(el.getAttribute('data-verse'), 10)
    if (isNaN(num) || num < verseStart || num > end) el.remove()
  })

  return doc.body.innerHTML
}
