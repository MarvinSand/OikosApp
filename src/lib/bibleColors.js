// Angelehnt an die Farbpalette der YouVersion Bible App (5 Presets). Eigene
// Hooks (useSavedBibleColors/useRecentBibleColors in useBible.js) filtern
// diese Namen aus ihren Ergebnissen heraus, damit Presets nie doppelt als
// "eigene Farbe" auftauchen - deshalb liegt die Liste hier zentral statt
// direkt in BibleView.jsx.
export const HIGHLIGHT_COLORS = {
  yellow: '#fde68a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  purple: '#ddd6fe',
  orange: '#fed7aa',
}

// Aus YouVersion synchronisierte Highlights können einen Farbnamen liefern,
// der nicht exakt einem unserer Presets entspricht (z.B. "pink", "red",
// Hex-Codes) - dann Rohwert/Fallback statt eines falschen Presets anzeigen.
export function resolveHighlightColor(color) {
  if (!color) return HIGHLIGHT_COLORS.yellow
  if (HIGHLIGHT_COLORS[color]) return HIGHLIGHT_COLORS[color]
  if (color.startsWith('#')) return color
  return HIGHLIGHT_COLORS.yellow
}
