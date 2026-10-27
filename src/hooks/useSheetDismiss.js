import { useEffect, useRef } from 'react'

// Bottom-Sheet per Wischen nach unten schließen. Der Sheet-Container folgt dem
// Finger, sobald die Geste nach unten zeigt und der Inhalt ganz oben steht
// (sonst scrollt die Liste normal). `baseTransform` entspricht dem Ruhe-
// Transform des Sheets (z. B. 'translateX(-50%)').
export function useSheetDismiss(onClose, baseTransform = '') {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let s = null

    function scrollTopOf(target) {
      let node = target
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight + 1 && node.scrollTop > 0) return node.scrollTop
        node = node.parentElement
      }
      return el.scrollTop
    }

    function onStart(e) {
      if (e.touches.length !== 1) { s = null; return }
      s = { y: e.touches[0].clientY, x: e.touches[0].clientX, time: Date.now(), active: false, dy: 0, top: scrollTopOf(e.target) }
    }
    function onMove(e) {
      if (!s) return
      const t = e.touches[0]
      const dy = t.clientY - s.y
      const dx = t.clientX - s.x
      if (!s.active) {
        if (s.top > 0 || dy < 8 || dy < Math.abs(dx)) { if (Math.abs(dy) > 8 || Math.abs(dx) > 8) s = null; return }
        s.active = true
      }
      if (e.cancelable) e.preventDefault()
      s.dy = Math.max(0, dy)
      el.style.transition = 'none'
      el.style.transform = `${baseTransform} translateY(${s.dy}px)`
    }
    function onEnd() {
      if (!s) return
      const { active, dy, time } = s
      s = null
      if (!active) return
      const v = dy / Math.max(1, Date.now() - time)
      el.style.transition = 'transform 0.25s ease'
      if (dy > 110 || v > 0.6) {
        el.style.transform = `${baseTransform} translateY(100%)`
        setTimeout(() => closeRef.current?.(), 200)
      } else {
        el.style.transform = baseTransform
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [baseTransform])

  return ref
}
