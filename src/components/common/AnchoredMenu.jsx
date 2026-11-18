import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PAD = 12

/**
 * Viewport-clamped dropdown portaled to document.body so it never gets
 * clipped by overflow:hidden / transform ancestors (e.g. SwipePager).
 *
 * Pass either `anchorRef` (preferred) or a DOMRect-like `anchorRect`.
 * Children are the menu rows; the backdrop dismisses on outside tap.
 */
export default function AnchoredMenu({
  anchorRef,
  anchorRect: anchorRectProp,
  onClose,
  children,
  minWidth = 160,
  zIndex = 120,
  preferred = 'auto', // 'above' | 'below' | 'auto'
}) {
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, opacity: 0 })

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const rect = anchorRectProp
      || anchorRef?.current?.getBoundingClientRect?.()
    if (!rect) return

    const menuH = menu.offsetHeight
    const menuW = Math.max(menu.offsetWidth, minWidth)
    const vh = window.innerHeight
    const vw = window.innerWidth

    const spaceBelow = vh - rect.bottom - PAD
    const spaceAbove = rect.top - PAD
    let place = preferred
    if (place === 'auto') {
      place = (spaceBelow >= menuH || spaceBelow >= spaceAbove) ? 'below' : 'above'
    }

    let top = place === 'above' ? rect.top - menuH - 6 : rect.bottom + 6
    if (top + menuH > vh - PAD) top = Math.max(PAD, vh - menuH - PAD)
    if (top < PAD) top = PAD

    // Prefer right-align to the trigger (menus sit on the right edge of cards).
    let left = rect.right - menuW
    if (left < PAD) left = PAD
    if (left + menuW > vw - PAD) left = Math.max(PAD, vw - menuW - PAD)

    setPos({ top, left, opacity: 1 })
  }, [anchorRef, anchorRectProp, minWidth, preferred, children])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    function onScroll() { onClose?.() }
    window.addEventListener('keydown', onKey)
    // Capture scroll on any scrollable ancestor so the menu doesn't drift.
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        onContextMenu={e => { e.preventDefault(); onClose?.() }}
        style={{ position: 'fixed', inset: 0, zIndex }}
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          zIndex: zIndex + 1,
          minWidth,
          backgroundColor: 'var(--color-white)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          border: '1px solid var(--color-warm-3)',
          overflow: 'hidden',
          opacity: pos.opacity,
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  )
}

/** Shared row style for AnchoredMenu items. */
export const anchoredMenuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  background: 'none',
  fontFamily: 'Lora, serif',
  fontSize: 13,
  color: 'var(--color-text)',
  cursor: 'pointer',
  textAlign: 'left',
}
