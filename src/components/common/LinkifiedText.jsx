// Text mit klickbaren Links (http/https und www.…). Zeilenumbrüche bleiben erhalten.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]}'"»«])/gi

export default function LinkifiedText({ text, linkColor = 'var(--color-accent)', style }) {
  if (!text) return null
  const parts = String(text).split(URL_RE)
  return (
    <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...style }}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part
        const href = /^https?:\/\//i.test(part) ? part : `https://${part}`
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: linkColor, textDecoration: 'underline', fontWeight: 600 }}
          >
            {part}
          </a>
        )
      })}
    </span>
  )
}
