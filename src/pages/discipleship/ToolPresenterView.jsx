import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Präsentationsmodus: große Schrift, Vor-/Zurück – dafür gedacht, es einer
// anderen Person direkt am Handy zu zeigen. Bewusst kein Header/Bottom-Nav-
// Padding wie die restlichen Seiten, damit möglichst viel Platz für den
// Text bleibt.
export default function ToolPresenterView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tool, setTool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase.from('tools').select('id, slug, title, image_path, steps').eq('slug', slug).maybeSingle()
      .then(({ data }) => { if (!cancelled) { setTool(data); setLoading(false) } })
    return () => { cancelled = true }
  }, [slug])

  if (loading) return <p className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>
  if (!tool) {
    return (
      <div className="px-6 py-16 text-center">
        <p style={{ color: 'var(--color-text-secondary)' }}>Werkzeug nicht gefunden.</p>
        <button onClick={() => navigate('/juengerschaft/werkzeuge')} className="mt-4 font-medium" style={{ color: 'var(--color-accent)' }}>Zurück</button>
      </div>
    )
  }

  const steps = tool.steps || []
  const current = steps[step]

  return (
    <div className="flex flex-col" style={{ height: '100dvh', paddingBottom: 'var(--bottom-nav-h, 64px)', backgroundColor: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{step + 1} / {steps.length}</span>
        <button onClick={() => navigate('/juengerschaft/werkzeuge')} className="p-1">
          <X size={20} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {tool.image_path && step === 0 && (
          <img src={tool.image_path} alt="" style={{ maxWidth: '80%', maxHeight: 180, marginBottom: 24 }} />
        )}
        {current?.title && (
          <h1 className="font-bold mb-4" style={{ fontFamily: 'Lora, serif', fontSize: 26, color: 'var(--color-text)' }}>{current.title}</h1>
        )}
        <p style={{ fontSize: 19, lineHeight: 1.6, color: 'var(--color-text)' }}>{current?.text}</p>
      </div>

      <div className="flex items-center gap-3 px-6 pb-6">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex-1 py-3 rounded-xl flex items-center justify-center gap-1 font-medium"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: step === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text)' }}
        >
          <ChevronLeft size={18} /> Zurück
        </button>
        <button
          onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : navigate('/juengerschaft/werkzeuge')}
          className="flex-1 py-3 rounded-xl flex items-center justify-center gap-1 font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          {step < steps.length - 1 ? <>Weiter <ChevronRight size={18} /></> : 'Fertig'}
        </button>
      </div>
    </div>
  )
}
