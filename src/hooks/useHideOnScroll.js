import { useEffect, useState } from 'react'

// true, solange nach unten gescrollt wird (und nicht ganz oben) – für
// schwebende Buttons, die beim Lesen nicht über dem Inhalt liegen sollen
// (der „+"-Button überdeckte sonst den „Beten"-Button der Karten).
// Beim Hochscrollen oder oben angekommen wieder false.
// `anchorRef`: irgendein Element innerhalb des scrollenden Containers.
export function useHideOnScroll(anchorRef) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let el = anchorRef.current?.parentElement
    while (el && el !== document.body) {
      const overflowY = window.getComputedStyle(el).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') break
      el = el.parentElement
    }
    if (!el || el === document.body) return

    let last = el.scrollTop
    function onScroll() {
      const y = el.scrollTop
      const delta = y - last
      if (Math.abs(delta) < 6) return // Zittern ignorieren
      last = y
      setHidden(delta > 0 && y > 60)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [anchorRef])

  return hidden
}
