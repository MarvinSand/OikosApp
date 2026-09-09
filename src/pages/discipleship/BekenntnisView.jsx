import { useState, useEffect, lazy, Suspense } from 'react'
import { Plus, Search, Copy, Flag, Lock, Globe, ChevronDown, Pencil, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { parseGermanReference } from '../../lib/bibleBooks'
import DiscipleshipTabs from '../../components/discipleship/DiscipleshipTabs'

const CreedEditorSheet = lazy(() => import('../../components/discipleship/CreedEditorSheet'))
const BiblePassageSheet = lazy(() => import('../../components/discipleship/BiblePassageSheet'))
const ReportSheet = lazy(() => import('../../components/discipleship/ReportSheet'))

// Konvention: eine Zeile mit bible_reference = null und "§ "-Präfix im
// body ist ein Abschnittstitel (siehe phase65b_discipleship_seed.sql).
function CreedRow({ creed, isOwn, isOfficial, expanded, lines, confessionCount, onToggleExpand, onEdit, onAdopt, onReport, onConfess, onOpenLine }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center gap-1.5 pl-1 pr-3 py-2">
        <button onClick={onToggleExpand} className="flex-1 flex items-center gap-2 min-w-0 text-left px-2.5 py-1.5">
          <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0, transition: 'transform 0.15s' }} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{creed.title}</p>
              {isOwn && (creed.visibility === 'public' ? <Globe size={12} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} /> : <Lock size={12} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />)}
            </div>
            {!isOwn && (
              <p style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>
                {isOfficial ? 'Offiziell' : `von ${creed.profiles?.full_name || creed.profiles?.username || 'Jemandem'}`}
              </p>
            )}
          </div>
        </button>

        {isOwn && (
          <button onClick={onEdit} className="p-1.5 flex-shrink-0"><Pencil size={15} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        )}
        {!isOwn && !isOfficial && (
          <button onClick={onReport} className="p-1.5 flex-shrink-0"><Flag size={15} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        )}
        {!isOwn && (
          <button onClick={onAdopt} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
            <Copy size={12} /> Übernehmen
          </button>
        )}

        <button
          onClick={onConfess}
          title="Bekannt - Zähler erhöhen"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <Check size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-accent)' }}>{confessionCount}</span>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {!lines && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
          {lines?.map(line => (
            line.bible_reference === null && line.body.startsWith('§ ') ? (
              <p key={line.id} className="mt-3 mb-1 first:mt-0" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                {line.body.replace(/^§\s*/, '')}
              </p>
            ) : line.bible_reference ? (
              <button key={line.id} onClick={() => onOpenLine(line)} className="block w-full text-left py-1">
                <span style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>{line.body} </span>
                <span style={{ fontSize: 11.5, color: 'var(--color-accent)', fontWeight: 600 }}>{line.bible_reference}</span>
              </button>
            ) : (
              <p key={line.id} className="py-1" style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>{line.body}</p>
            )
          ))}
        </div>
      )}
    </div>
  )
}

export default function BekenntnisView() {
  const { user } = useAuth()

  const [ownCreeds, setOwnCreeds] = useState([])
  const [publicCreeds, setPublicCreeds] = useState([])
  const [publicSearch, setPublicSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confessionByCreed, setConfessionByCreed] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [linesByCreed, setLinesByCreed] = useState({})

  const [passageSheet, setPassageSheet] = useState(null)
  const [editorInitial, setEditorInitial] = useState(undefined)
  const [showEditor, setShowEditor] = useState(false)
  const [reportTarget, setReportTarget] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [{ data: mine }, { data: allPublic }] = await Promise.all([
      supabase.from('creeds').select('id, title, visibility, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('creeds').select('id, title, user_id, updated_at, profiles:user_id (username, full_name)').eq('visibility', 'public').order('updated_at', { ascending: false }),
    ])

    // .neq('user_id', ...) würde die offizielle Zeile (user_id IS NULL)
    // wegen SQL-NULL-Semantik mit rausfiltern - deshalb client-seitig filtern.
    const others = (allPublic || []).filter(c => c.user_id !== user.id)
    others.sort((a, b) => (a.user_id === null ? -1 : b.user_id === null ? 1 : 0))

    setOwnCreeds(mine || [])
    setPublicCreeds(others)

    const allIds = [...(mine || []).map(c => c.id), ...others.map(c => c.id)]
    if (allIds.length > 0) {
      const { data: confessions } = await supabase.from('creed_confessions').select('creed_id, count').eq('user_id', user.id).in('creed_id', allIds)
      const map = {}
      for (const c of confessions || []) map[c.creed_id] = c.count
      setConfessionByCreed(map)
    }
    setLoading(false)
  }

  useEffect(() => { if (user) loadAll() }, [user?.id])

  async function toggleExpand(creed) {
    if (expandedId === creed.id) { setExpandedId(null); return }
    setExpandedId(creed.id)
    if (!linesByCreed[creed.id]) {
      const { data } = await supabase.from('creed_lines').select('id, order_index, body, bible_reference').eq('creed_id', creed.id).order('order_index')
      setLinesByCreed(prev => ({ ...prev, [creed.id]: data || [] }))
    }
  }

  function openLine(line) {
    if (!line.bible_reference) return
    setPassageSheet({ label: line.bible_reference, parsed: parseGermanReference(line.bible_reference) })
  }

  async function confess(creedId) {
    const next = (confessionByCreed[creedId] || 0) + 1
    setConfessionByCreed(prev => ({ ...prev, [creedId]: next }))
    await supabase.from('creed_confessions').upsert({
      user_id: user.id, creed_id: creedId, count: next, last_confessed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,creed_id' })
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

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <DiscipleshipTabs active="/juengerschaft/bekenntnis" />

      <div className="px-4 py-4" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}

        {!loading && (
          <>
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
                <CreedRow
                  key={c.id} creed={c} isOwn isOfficial={false}
                  expanded={expandedId === c.id} lines={linesByCreed[c.id]}
                  confessionCount={confessionByCreed[c.id] || 0}
                  onToggleExpand={() => toggleExpand(c)}
                  onEdit={() => openOwnCreed(c)}
                  onConfess={() => confess(c.id)}
                  onOpenLine={openLine}
                />
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
                <CreedRow
                  key={c.id} creed={c} isOwn={false} isOfficial={c.user_id === null}
                  expanded={expandedId === c.id} lines={linesByCreed[c.id]}
                  confessionCount={confessionByCreed[c.id] || 0}
                  onToggleExpand={() => toggleExpand(c)}
                  onAdopt={() => adoptCreed(c)}
                  onReport={() => setReportTarget(c.id)}
                  onConfess={() => confess(c.id)}
                  onOpenLine={openLine}
                />
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
