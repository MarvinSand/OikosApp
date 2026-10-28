// Scrollt NUR den übergebenen Container ans Ende. `el.scrollIntoView()` scrollt
// dagegen alle Vorfahren mit – auch `overflow: hidden`-Container und das
// Dokument. Läuft einer davon minimal über, wurde die ganze Seite dauerhaft
// nach oben verschoben (Kopfleiste abgeschnitten, Lücke über der Bottom-Nav).
export function scrollContainerToBottom(container, behavior = 'auto') {
  if (!container) return
  container.scrollTo({ top: container.scrollHeight, behavior })
}

// Zentriert `el` im Container, ohne Vorfahren zu scrollen.
export function scrollContainerToElement(container, el, behavior = 'smooth') {
  if (!container || !el) return
  const c = container.getBoundingClientRect()
  const e = el.getBoundingClientRect()
  const top = container.scrollTop + (e.top - c.top) - (container.clientHeight - e.height) / 2
  container.scrollTo({ top: Math.max(0, top), behavior })
}
