import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Presentation } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'

export default function WerkzeugeView() {
  const navigate = useNavigate()
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase.from('tools').select('id, slug, title, description, image_path').order('order_index')
      .then(({ data }) => { if (!cancelled) { setTools(data || []); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active="/juengerschaft/werkzeuge" />
      <div className="px-4 py-4" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        <p className="mb-4" style={{ fontSize: 13.5, color: 'var(--color-text-secondary)' }}>
          Öffne ein Werkzeug im Präsentationsmodus, um es direkt am Handy jemand anderem zu zeigen.
        </p>

        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}

        <div className="grid grid-cols-2 gap-3">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/juengerschaft/werkzeuge/${t.slug}`)}
              className="rounded-2xl p-4 text-left"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <Presentation size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>{t.title}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>{t.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
