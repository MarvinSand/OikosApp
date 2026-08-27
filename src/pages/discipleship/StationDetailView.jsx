import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, RotateCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useStationPassage } from '../../hooks/useStationPassage'

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
        <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  )
}

export default function StationDetailView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [station, setStation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reflections, setReflections] = useState({})
  const [saving, setSaving] = useState({})
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: stationData } = await supabase
        .from('discipleship_stations')
        .select('id, order_index, slug, title, bible_reference, bible_book, bible_chapter, bible_verse_start, bible_verse_end, content_head, content_heart, content_hand, extra_content')
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled || !stationData) { setLoading(false); return }

      const [{ data: progress }, { data: reflectionRows }] = await Promise.all([
        supabase.from('discipleship_station_progress').select('status').eq('user_id', user.id).eq('station_id', stationData.id).maybeSingle(),
        supabase.from('station_reflections').select('prompt_key, body').eq('user_id', user.id).eq('station_id', stationData.id),
      ])
      if (cancelled) return

      if (!progress) {
        supabase.from('discipleship_station_progress').upsert(
          { user_id: user.id, station_id: stationData.id, status: 'active' },
          { onConflict: 'user_id,station_id' }
        ).then(() => {})
      } else if (progress.status === 'completed') {
        setCompleted(true)
      }

      const map = {}
      for (const r of reflectionRows || []) map[r.prompt_key] = r.body
      setReflections(map)
      setStation(stationData)
      setLoading(false)
    }
    if (user) load()
    return () => { cancelled = true }
  }, [slug, user?.id])

  const { html, loading: passageLoading, error: passageError, retry } = useStationPassage(
    station?.bible_book, station?.bible_chapter, station?.bible_verse_start, station?.bible_verse_end
  )

  const saveReflection = useCallback(async (promptKey, body) => {
    setSaving(s => ({ ...s, [promptKey]: true }))
    await supabase.from('station_reflections').upsert({
      user_id: user.id, station_id: station.id, prompt_key: promptKey, body, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,station_id,prompt_key' })
    setSaving(s => ({ ...s, [promptKey]: false }))
  }, [user?.id, station?.id])

  async function completeStation() {
    setCompleting(true)
    await supabase.from('discipleship_station_progress').upsert({
      user_id: user.id, station_id: station.id, status: 'completed', completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,station_id' })
    setCompleting(false)
    setCompleted(true)
    setConfirmEmpty(false)
    showToast('Station abgeschlossen ✓')
    navigate('/juengerschaft')
  }

  function handleComplete() {
    const heartPrompts = station?.content_heart?.prompts || []
    const allEmpty = heartPrompts.every(p => !(reflections[p.key] || '').trim())
    if (allEmpty && heartPrompts.length > 0) {
      setConfirmEmpty(true)
      return
    }
    completeStation()
  }

  if (loading) {
    return <p className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>
  }

  if (!station) {
    return (
      <div className="px-6 py-16 text-center">
        <p style={{ color: 'var(--color-text-secondary)' }}>Station nicht gefunden.</p>
        <button onClick={() => navigate('/juengerschaft')} className="mt-4 font-medium" style={{ color: 'var(--color-accent)' }}>Zurück zum Weg</button>
      </div>
    )
  }

  const heartPrompts = station.content_heart?.prompts || []
  const handSteps = station.content_hand?.steps || []
  const observations = station.content_head?.observations || []

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-2" style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate('/juengerschaft')} className="p-1 -ml-1">
          <ChevronLeft size={22} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate" style={{ color: 'var(--color-text)' }}>{station.title}</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{station.bible_reference}</p>
        </div>
      </div>

      <div className="px-4 py-4" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
        <Section title="Kopf">
          {passageLoading && <p style={{ color: 'var(--color-text-tertiary)' }}>Bibeltext lädt…</p>}
          {passageError && (
            <div className="flex items-center justify-between gap-3 rounded-xl p-3 mb-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{station.bible_reference} konnte nicht geladen werden.</span>
              <button onClick={retry} className="flex items-center gap-1 text-sm font-medium flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
                <RotateCw size={14} /> Erneut
              </button>
            </div>
          )}
          {!passageLoading && !passageError && html && (
            <div
              className="mb-4"
              style={{ fontFamily: 'Lora, serif', fontSize: 16, lineHeight: 1.8, color: 'var(--color-text)' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          {station.content_head?.intro && (
            <p className="mb-3" style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{station.content_head.intro}</p>
          )}
          {observations.length > 0 && (
            <ul className="list-disc pl-5 space-y-1.5">
              {observations.map((q, i) => (
                <li key={i} style={{ fontSize: 14, color: 'var(--color-text)' }}>{q}</li>
              ))}
            </ul>
          )}
          {station.extra_content && (
            <div className="mt-4">
              <ExtraContent extra={station.extra_content} />
            </div>
          )}
        </Section>

        {heartPrompts.length > 0 && (
          <Section title="Herz">
            <div className="space-y-4">
              {heartPrompts.map(p => (
                <div key={p.key}>
                  <p className="mb-1.5" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{p.question}</p>
                  <textarea
                    value={reflections[p.key] || ''}
                    onChange={e => setReflections(r => ({ ...r, [p.key]: e.target.value }))}
                    onBlur={e => saveReflection(p.key, e.target.value)}
                    placeholder="Deine Antwort (optional)…"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                  />
                  {saving[p.key] && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Speichert…</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {handSteps.length > 0 && (
          <Section title="Hand">
            <ul className="space-y-2">
              {handSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2" style={{ fontSize: 14, color: 'var(--color-text)' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!completed && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full py-3.5 rounded-xl font-semibold mt-2"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {completing ? 'Speichert…' : 'Station abschließen'}
          </button>
        )}
        {completed && (
          <p className="text-center py-2" style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Diese Station ist bereits abgeschlossen.</p>
        )}
      </div>

      {confirmEmpty && (
        <>
          <div onClick={() => setConfirmEmpty(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
          <div
            style={{
              position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
              backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', zIndex: 50,
              padding: '20px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <p className="font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>Noch keine Antworten gespeichert</p>
            <p className="mb-4" style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Du hast noch keine Antworten im Herz-Abschnitt gespeichert. Trotzdem abschließen?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmEmpty(false)}
                className="flex-1 py-2.5 rounded-xl font-medium"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
              >
                Zurück
              </button>
              <button
                onClick={completeStation}
                disabled={completing}
                className="flex-1 py-2.5 rounded-xl font-medium"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Trotzdem abschließen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ExtraContent({ extra }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3.5 py-3">
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>{extra.title}</span>
        <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <p className="px-3.5 pb-3.5" style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{extra.body}</p>
      )}
    </div>
  )
}
