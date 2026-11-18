import { createPortal } from 'react-dom'

// Hängt Sheets/Overlays an document.body. Nötig innerhalb von SwipePager &
// Co.: Ein Vorfahre mit `transform`/`will-change` macht `position: fixed`
// relativ zu sich selbst (statt zum Viewport) und `overflow: hidden` schneidet ab.
export default function BodyPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
