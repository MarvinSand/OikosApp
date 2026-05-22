import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'

// Thin React wrapper around google.maps.marker.AdvancedMarkerElement.
// Renders `children` as HTML inside the marker's `content` element.
//
// Props:
//   map        — google.maps.Map instance (the marker only mounts once `map` is set)
//   position   — { lat, lng }
//   onClick    — optional click handler
//   zIndex     — optional z-index (own pin should sit above others)
//   onReady    — optional callback(markerInstance), used by clusterer integration
//   collisionBehavior — optional, defaults to undefined
//
export default function AdvancedMarker({ map, position, onClick, zIndex, onReady, children }) {
  const markerRef = useRef(null)
  const contentRef = useRef(null)
  const rootRef = useRef(null)
  const onClickRef = useRef(onClick)

  // Keep latest onClick without re-creating the marker
  useEffect(() => { onClickRef.current = onClick }, [onClick])

  useEffect(() => {
    if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) return
    if (!position || position.lat == null || position.lng == null) return

    const container = document.createElement('div')
    contentRef.current = container
    rootRef.current = createRoot(container)
    rootRef.current.render(children)

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      content: container,
      gmpClickable: true,
      zIndex,
    })
    markerRef.current = marker

    const listener = marker.addListener('gmp-click', () => {
      if (onClickRef.current) onClickRef.current()
    })

    if (onReady) onReady(marker)

    return () => {
      listener.remove()
      marker.map = null
      // Defer unmount to avoid React warning about unmounting during render
      const root = rootRef.current
      if (root) setTimeout(() => root.unmount(), 0)
      rootRef.current = null
      contentRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Update position when it changes
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.position = position
    }
  }, [position?.lat, position?.lng])

  // Update z-index when it changes
  useEffect(() => {
    if (markerRef.current && zIndex != null) {
      markerRef.current.zIndex = zIndex
    }
  }, [zIndex])

  // Re-render children content (e.g. avatar URL changes)
  useEffect(() => {
    if (rootRef.current) rootRef.current.render(children)
  }, [children])

  return null
}
