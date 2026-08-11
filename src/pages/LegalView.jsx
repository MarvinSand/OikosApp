import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LEGAL_DOCS } from '../lib/legalTexts'

// Absichtlich kein Markdown-Paket: die Texte nutzen nur Überschriften,
// Absätze, Listen und **fett**. Ein eigener Mini-Renderer spart eine
// Abhängigkeit im Bundle und rendert kein fremdes HTML.
function renderBlocks(body) {
  const blocks = body.split(/\n{2,}/)
  return blocks.map((block, i) => {
    const trimmed = block.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '26px 0 8px', lineHeight: 1.4 }}>
          {trimmed.slice(3)}
        </h2>
      )
    }

    if (trimmed.startsWith('- ')) {
      const items = trimmed.split('\n').map(l => l.replace(/^-\s*/, ''))
      return (
        <ul key={i} style={{ margin: '0 0 12px', paddingLeft: 20, color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.65 }}>
          {items.map((item, j) => <li key={j} style={{ marginBottom: 4 }}>{withBold(item)}</li>)}
        </ul>
      )
    }

    return (
      <p key={i} style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-secondary)', whiteSpace: 'pre-line' }}>
        {withBold(trimmed)}
      </p>
    )
  })
}

// **fett** → <strong>. Splittet am Sternchen-Paar, ungerade Indizes sind fett.
function withBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: 'var(--color-text)', fontWeight: 700 }}>{part}</strong>
      : part
  )
}

export default function LegalView() {
  const { doc } = useParams()
  const navigate = useNavigate()
  const entry = LEGAL_DOCS[doc]

  if (!entry) return <Navigate to="/settings" replace />

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full">
      <header
        className="flex items-center gap-3 px-2"
        style={{
          height: 52, borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)', position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Zurück"
          style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{entry.title}</h2>
      </header>

      <div style={{ padding: '20px 20px 40px' }}>
        {renderBlocks(entry.body)}
      </div>
    </div>
  )
}
