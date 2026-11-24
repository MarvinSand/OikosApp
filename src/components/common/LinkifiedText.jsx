// Text mit klickbaren Links. Erkennt
//  - Markdown-Links [Text](adresse) → nur „Text“ erscheint, klickbar
//  - Adressen mit https:// oder www.
//  - Adressen ohne Vorsatz (beispiel.de, beispiel.com/seite)
// Nur http/https wird verlinkt (kein javascript: o. Ä.). Zeilenumbrüche bleiben erhalten.
const TLDS = 'de|com|net|org|info|eu|ch|at|app|io|church|online|me|co|tv|be|nl|fr|it|es|uk|us|site|xyz|link|page|blog|shop|club|life|live|news|world|faith|pl|cz|dk|se|no|fi|ru|ly|gl'
const RE = new RegExp(
  '\\[([^\\]\\n]+)\\]\\(([^)\\s]+)\\)' +                                   // 1,2: [Text](adresse)
  '|((?:https?:\\/\\/|www\\.)[^\\s<]+)' +                                  // 3: mit Vorsatz
  `|([a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${TLDS})(?![a-z0-9@-])(?::\\d+)?(?:\\/[^\\s<]*)?)`, // 4: ohne Vorsatz
  'gi',
)
const TRAILING = /[.,;:!?)\]}'"»«]+$/

// Gibt eine sichere http(s)-Adresse zurück oder null
export function toSafeUrl(raw) {
  const v = String(raw || '').trim()
  if (!v) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return /^https?:\/\//i.test(v) ? v : null
  return `https://${v.replace(/^\/\//, '')}`
}

function tokenize(text) {
  const out = []
  let last = 0
  RE.lastIndex = 0
  let m
  while ((m = RE.exec(text))) {
    const start = m.index
    // Adresse ohne Vorsatz nicht mitten in einem Wort / E-Mail / Pfad erkennen
    if (m[4] && start > 0 && /[\w@./-]/.test(text[start - 1])) { continue }
    let label = m[1]
    let target = m[2]
    let matched = m[0]
    if (!m[1]) {
      const trimmed = matched.replace(TRAILING, '')
      RE.lastIndex = start + trimmed.length
      matched = trimmed
      label = trimmed
      target = trimmed
    }
    const href = toSafeUrl(target)
    if (!href) continue
    if (start > last) out.push({ text: text.slice(last, start) })
    out.push({ text: label, href })
    last = start + matched.length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

export default function LinkifiedText({ text, linkColor = 'var(--color-accent)', style }) {
  if (!text) return null
  return (
    <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...style }}>
      {tokenize(String(text)).map((tok, i) => tok.href ? (
        <a
          key={i}
          href={tok.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: linkColor, textDecoration: 'underline', fontWeight: 600 }}
        >
          {tok.text}
        </a>
      ) : tok.text)}
    </span>
  )
}
