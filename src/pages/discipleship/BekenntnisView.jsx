import { useState, useEffect, lazy, Suspense } from 'react'
import { Plus, Search, Copy, Flag, Lock, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { parseGermanReference } from '../../lib/bibleBooks'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'

const CreedEditorSheet = lazy(() => import('../../components/discipleship/CreedEditorSheet'))
const BiblePassageSheet = lazy(() => import('../../components/discipleship/BiblePassageSheet'))
const ReportSheet = lazy(() => import('../../components/discipleship/ReportSheet'))

export default function BekenntnisView() {
  const { user } = useAuth()

  const [officialLines, setOfficialLines] = useState([])
  const [ownCreeds, setOwnCreeds] = useState([])
  const [publicCreeds, setPublicCreeds] = useState([])
  const [publicSearch, setPublicSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [passageSheet, setPassageSheet] = useState(null)
  const [editorInitial, setEditorInitial] = useState(undefined)
  const [showEditor, setShowEditor] = useState(false)
  const [reportTarget, setReportTarget] = useState(null)

  async function loadAll() {
    setLoading(true)
    const { data: official } = await supabase.from('creeds').select('id').is('user_id', null).limit(1).maybeSingle()
    const [{ data: lines }, { data: mine }, { data: publicOthers }] = await Promise.all([
      official ? supabase.from('creed_lines').select('id, order_index, body, bible_reference').eq('creed_id', official.id).order('order_index') : Promise.resolve({ data: [] }),
      supabase.from('creeds').select('id, title, visibility, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('creeds').select('id, title, user_id, profiles:user_id (username, full_name)').eq('visibility', 'public').neq('user_id', user.id).order('updated_at', { ascending: false }),
    ])
    setOfficialLines(lines || [])
    setOwnCreeds(mine || [])
    setPublicCreeds(publicOthers || [])
    setLoading(false)
  }

  useEffect(() => { if (user) loadAll() }, [user?.id])

  function openLine(line) {
    if (!line.bible_reference) return
    setPassageSheet({ label: line.bible_reference, parsed: parseGermanReference(line.bible_reference) })
  }

  async function openOwnCreed(creed) {
    const { data: lines } = await supabase.from('creed_lines').select('body, bible_reference').eq('creed_id', creed.id).order('order_index')
    setEditorInitial({ id: creed.id, title: creed.title, visibility: creed.visibility, lines: lines || [] })
    setShowEditor(true)
  }

  async function adoptCreed(creed) {
    const { data: lines } = await supabase.from('creed_lines').select('body, bible_reference').eq('creed_id', creed.id).order('order_index')
    setEditorInitial({ title: `${creed.title} (Kopie)`, visibility: 'private', lines: lines || [], sourceCreedId: creed.id })
    setShowEditor(true)
  }

  const filteredPublic = publicCreeds.filter(c => !publicSearch.trim() || c.title.toLowerCase().includes(publicSearch.trim().toLowerCase()))

  // Konvention: eine Zeile mit bible_reference = null und "§ "-Präfix im
  // body ist ein Abschnittstitel (siehe phase65b_discipleship_seed.sql).
  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active="/juengerschaft/bekenntnis" />

      <div className="px-4 py-4" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}

        {!loading && (
          <>
            <h2 className="font-bold mb-3" style={{ fontFamily: 'Lora, serif', fontSize: 18, color: 'var(--color-text)' }}>Mein tägliches Bekenntnis</h2>
            <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              {officialLines.map(line => (
                line.bible_reference === null ? (
                  <p key={line.id} className="mt-4 mb-1.5 first:mt-0" style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                    {line.body.replace(/^§\s*/, '')}
                  </p>
                ) : (
                  <button key={line.id} onClick={() => openLine(line)} className="block w-full text-left py-1.5">
                    <span style={{ fontSize: 14.5, color: 'var(--color-text)', lineHeight: 1.6 }}>{line.body} </span>
                    <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>{line.bible_reference}</span>
                  </button>
                )
              ))}
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold" style={{ fontFamily: 'Lora, serif', fontSize: 18, color: 'var(--color-text)' }}>Meine Bekenntnisse</h2>
              <button onClick={() => { setEditorInitial(undefined); setShowEditor(true) }} className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                <Plus size={16} /> Neu
              </button>
            </div>
            {ownCreeds.length === 0 && (
              <p className="mb-6" style={{ fontSize: 13.5, color: 'var(--color-text-tertiary)' }}>Du hast noch kein eigenes Bekenntnis erstellt.</p>
            )}
            <div className="space-y-2 mb-6">
              {ownCreeds.map(c => (
                <button key={c.id} onClick={() => openOwnCreed(c)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{c.title}</span>
                  {c.visibility === 'public' ? <Globe size={14} style={{ color: 'var(--color-text-tertiary)' }} /> : <Lock size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                </button>
              ))}
            </div>

            <h2 className="font-bold mb-3" style={{ fontFamily: 'Lora, serif', fontSize: 18, color: 'var(--color-text)' }}>Öffentliche Bekenntnisse entdecken</h2>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <Search size={15} style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                value={publicSearch}
                onChange={e => setPublicSearch(e.target.value)}
                placeholder="Bekenntnisse durchsuchen…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--color-text)' }}
              />
            </div>
            <div className="space-y-2">
              {filteredPublic.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <div className="min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{c.title}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>von {c.profiles?.full_name || c.profiles?.username || 'Jemandem'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setReportTarget(c.id)} className="p-2"><Flag size={15} style={{ color: 'var(--color-text-tertiary)' }} /></button>
                    <button onClick={() => adoptCreed(c)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                      <Copy size={12} /> Übernehmen
                    </button>
                  </div>
                </div>
              ))}
              {filteredPublic.length === 0 && (
                <p style={{ fontSize: 13.5, color: 'var(--color-text-tertiary)' }}>Keine öffentlichen Bekenntnisse gefunden.</p>
              )}
            </div>
          </>
        )}
      </div>

      <Suspense fallback={null}>
        {passageSheet && <BiblePassageSheet label={passageSheet.label} parsed={passageSheet.parsed} onClose={() => setPassageSheet(null)} />}
        {showEditor && (
          <CreedEditorSheet
            initial={editorInitial}
            onClose={() => setShowEditor(false)}
            onSaved={loadAll}
          />
        )}
        {reportTarget && (
          <ReportSheet contentType="creed" contentId={reportTarget} onClose={() => setReportTarget(null)} />
        )}
      </Suspense>
    </div>
  )
}
