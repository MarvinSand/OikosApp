// Leistungsstufe der Landingpage. „Lite“ = langsames/teures Netz oder schwaches
// Gerät → keine Videos, kein Filmkorn/Glas-Unschärfe/Aurora, Canvas in
// 1× Auflösung und mit ~30 fps, kein 3D-Tilt per Gerätelage.
// Reine Heuristik aus Browser-Hinweisen (Chromium); Safari/Firefox liefern
// meist nichts und bekommen die volle Fassung – dort greifen die
// Sichtbarkeits-Pausen und das späte Nachladen trotzdem.
function detectLite() {
  if (typeof navigator === 'undefined') return false
  const c = navigator.connection
  if (c?.saveData) return true
  if (c?.effectiveType && /(^|-)(2g|3g)$/.test(c.effectiveType)) return true
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true
  return false
}

export const isLite = detectLite()

// Canvas-Auflösung (Geräte-Pixel-Verhältnis): lite = 1, sonst max. 2
export const canvasDpr = () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, isLite ? 1 : 2)
// Mindestabstand zwischen zwei Zeichenvorgängen in ms (lite ≈ 30 fps)
export const FRAME_GAP = isLite ? 30 : 0
