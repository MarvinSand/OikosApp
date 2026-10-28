import { useEffect } from 'react'
import { isNativeApp } from '../lib/platform'

/**
 * Tracks the on-screen keyboard via visualViewport + focusin/focusout and
 * exposes it as CSS variables on <html>:
 *   --keyboard-inset  px the keyboard covers from the bottom of the layout
 *   --keyboard-open   '1' | '0'
 *
 * Also toggles the `keyboard-open` class so BottomNav can hide itself.
 * Does not change Capacitor config (no native rebuild required).
 */
export function useKeyboardInset() {
  useEffect(() => {
    const root = document.documentElement
    let focusedEditable = false
    let raf = 0
    let lastEditable = null

    // Beim Fokus scrollt iOS überall hoch, was „overflow: hidden" ist (auch
    // ohne Scrollleiste). Nach dem Schließen der Tastatur blieb dieser Versatz
    // stehen: Kopfleiste abgeschnitten, Eingabeleiste schwebt über der Nav –
    // bis zum App-Neustart. Deshalb nach dem Schließen alles zurücksetzen.
    function resetScroll() {
      window.scrollTo(0, 0)
      const se = document.scrollingElement
      if (se) { se.scrollTop = 0; se.scrollLeft = 0 }
      let node = lastEditable?.parentElement
      while (node && node !== document.body) {
        if ((node.scrollTop || node.scrollLeft) && window.getComputedStyle(node).overflowY === 'hidden') {
          node.scrollTop = 0
          node.scrollLeft = 0
        }
        node = node.parentElement
      }
      document.querySelectorAll('#root, #root > div, #root > div > div').forEach(n => {
        if (n.scrollTop || n.scrollLeft) { n.scrollTop = 0; n.scrollLeft = 0 }
      })
    }

    function isEditable(el) {
      if (!el || el === document.body) return false
      const tag = el.tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (tag === 'INPUT') {
        const type = (el.getAttribute('type') || 'text').toLowerCase()
        return !['button', 'checkbox', 'radio', 'file', 'submit', 'reset', 'range', 'color', 'hidden', 'image'].includes(type)
      }
      return el.isContentEditable
    }

    function measure() {
      raf = 0
      const vv = window.visualViewport
      // Layout viewport height vs visual viewport — difference is the keyboard
      // (plus browser chrome). On desktop / when no keyboard, keep 0.
      let inset = 0
      if (vv) {
        const covered = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
        // Ignore tiny diffs from URL-bar show/hide (~50px); keyboards are larger.
        if (covered > 80 || (focusedEditable && covered > 24)) inset = Math.round(covered)
      }
      // Fallback: if an editable is focused but visualViewport didn't report a
      // shrink (iOS overlays-content quirks), still mark keyboard-open so the
      // bottom nav hides and sheets can sit at the visual bottom.
      const open = inset > 0 || focusedEditable
      root.style.setProperty('--keyboard-inset', `${inset}px`)
      root.style.setProperty('--keyboard-open', open ? '1' : '0')
      root.classList.toggle('keyboard-open', open)
      if (!open) resetScroll()
    }

    function schedule() {
      if (raf) return
      raf = requestAnimationFrame(measure)
    }

    function onFocusIn(e) {
      if (isEditable(e.target)) {
        lastEditable = e.target
        focusedEditable = true
        schedule()
      }
    }
    function onFocusOut() {
      // Defer: focus may move to another input in the same tick.
      setTimeout(() => {
        focusedEditable = isEditable(document.activeElement)
        schedule()
        // iOS animiert das Einfahren der Tastatur noch ~300 ms – danach erneut.
        if (!focusedEditable) setTimeout(() => { if (!focusedEditable) resetScroll() }, 350)
      }, 50)
    }

    // Native iOS-App: Das Keyboard-Plugin verkleinert die WebView beim Öffnen
    // der Tastatur (statt den Inhalt per UIScrollView hochzuschieben) und
    // sperrt das native Scrollen. Ohne das blieb die Ansicht nach dem
    // Schließen um die Safe-Area-Höhe nach oben verschoben (Kopfleiste
    // abgeschnitten, Eingabeleiste über der Nav) – bis zum App-Neustart.
    let removeNative = () => {}
    if (isNativeApp) {
      import('@capacitor/keyboard').then(async ({ Keyboard }) => {
        try {
          await Keyboard.setResizeMode({ mode: 'native' })
          await Keyboard.setScroll({ isDisabled: true })
          const h = await Keyboard.addListener('keyboardDidHide', () => { resetScroll(); schedule() })
          removeNative = () => h.remove()
        } catch { /* Plugin nicht verfügbar (z. B. Android ohne Sync) */ }
      }).catch(() => {})
    }

    measure()
    const vv = window.visualViewport
    vv?.addEventListener('resize', schedule)
    vv?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      vv?.removeEventListener('resize', schedule)
      vv?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      if (raf) cancelAnimationFrame(raf)
      removeNative()
      root.style.setProperty('--keyboard-inset', '0px')
      root.style.setProperty('--keyboard-open', '0')
      root.classList.remove('keyboard-open')
    }
  }, [])
}
