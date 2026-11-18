// Angelehnt an die Farbpalette der YouVersion Bible App (5 Presets). Eigene
// Hooks (useSavedBibleColors/useRecentBibleColors in useBible.js) filtern
// diese Namen aus ihren Ergebnissen heraus, damit Presets nie doppelt als
// "eigene Farbe" auftauchen - deshalb liegt die Liste hier zentral statt
// direkt in BibleView.jsx.
export const HIGHLIGHT_COLORS = {
  yellow: '#ffff9f',
  blue: '#62d3fc',
  orange: '#f5c97b',
  green: '#8ef98b',
  red: '#e8312a',
  pink: '#f09ae9',
  black: '#000000',
  white: '#ffffff',
  lemon: '#fff94f',
  purple: '#ddd6fe', // Altbestand, nicht mehr in der Auswahl
}

// Reihenfolge wie in der Apple-Books-ähnlichen Leiste: Hauptzeile + "Mehr".
export const PRIMARY_COLORS = ['yellow', 'blue', 'orange']
export const MORE_COLORS = ['green', 'red', 'pink', 'black', 'white', 'lemon']

/** Normalize a stored color to a comparable lowercase hex, or keep preset name. */
export function normalizeColorKey(color) {
  if (!color) return ''
  const c = String(color).trim()
  if (HIGHLIGHT_COLORS[c]) return c
  if (c.startsWith('#')) {
    let hex = c.toLowerCase()
    // Expand #rgb → #rrggbb so "#abc" and "#aabbcc" compare equal after expand.
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    }
    return hex
  }
  // YouVersion sometimes stores "aabbcc" without '#'.
  if (/^[0-9a-f]{6}$/i.test(c)) return `#${c.toLowerCase()}`
  return c.toLowerCase()
}

export function colorsEqual(a, b) {
  return normalizeColorKey(a) === normalizeColorKey(b)
}

export function isPresetColor(color) {
  const key = normalizeColorKey(color)
  return Object.prototype.hasOwnProperty.call(HIGHLIGHT_COLORS, key)
}

export function isCustomHex(color) {
  const key = normalizeColorKey(color)
  return key.startsWith('#') && !Object.values(HIGHLIGHT_COLORS).some(h => h.toLowerCase() === key)
}

// Aus YouVersion synchronisierte Highlights können einen Farbnamen liefern,
// der nicht exakt einem unserer Presets entspricht (z.B. "pink", "red",
// Hex-Codes) - dann Rohwert/Fallback statt eines falschen Presets anzeigen.
export function resolveHighlightColor(color) {
  if (!color) return HIGHLIGHT_COLORS.yellow
  if (HIGHLIGHT_COLORS[color]) return HIGHLIGHT_COLORS[color]
  const key = normalizeColorKey(color)
  if (key.startsWith('#')) return key
  // Hex matching a preset value → return that preset hex
  for (const hex of Object.values(HIGHLIGHT_COLORS)) {
    if (hex.toLowerCase() === key) return hex
  }
  return HIGHLIGHT_COLORS.yellow
}

/** WCAG-ish relative luminance → dark text on light marks, light text on dark. */
export function highlightTextColor(color) {
  const hex = resolveHighlightColor(color).replace('#', '')
  if (hex.length !== 6) return '#1a1a1a'
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const lin = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.45 ? '#1a1a1a' : '#f5f5f5'
}
