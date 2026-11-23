// Text mit antippbaren Bibelstellen. Schreibweise in den Studieninhalten:
//   [[Römer 2,4]]          → Label und Stelle gleich
//   [[Röm 2,4|Römer 2,4]]  → Label | Stelle
// Eine Leerzeile trennt Absätze, einfache Zeilenumbrüche bleiben erhalten.

const TOKEN = /\[\[([^\]]+)\]\]/g

export function VerseRef({ label, reference, onOpen, style }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen?.(reference) }}
      style={{
        display: 'inline', padding: 0, margin: 0, background: 'none', border: 'none',
        font: 'inherit', cursor: 'pointer', textAlign: 'inherit',
        color: 'var(--color-accent-dark)', fontWeight: 600,
        borderBottom: '1px dotted var(--color-accent-dark)',
        ...style,
      }}
    >
      {label}
    </button>
  )
}

function inline(text, onOpen) {
  const out = []
  let last = 0
  let m
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const [label, reference] = m[1].includes('|') ? m[1].split('|') : [m[1], m[1]]
    out.push(<VerseRef key={m.index} label={label} reference={reference} onOpen={onOpen} />)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function RichText({ text, onOpen, style }) {
  const paragraphs = String(text ?? '').split('\n\n')
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0', whiteSpace: 'pre-line', ...style }}>
          {inline(p, onOpen)}
        </p>
      ))}
    </>
  )
}
