import { useState, useEffect, lazy, Suspense } from 'react'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { parseGermanReference } from '../../lib/bibleBooks'
import { CreedRow } from './CreedRow'

const CreedEditorSheet = lazy(() => import('../discipleship/CreedEditorSheet'))
const BiblePassageSheet = lazy(() => import('../discipleship/BiblePassageSheet'))
const ReportSheet = lazy(() => import('../discipleship/ReportSheet'))

// Volle Bibelstellen-Spalten (siehe phase74) fürs Bearbeiten/Übernehmen -
// für die reine Anzeige (toggleExpand) reicht bible_reference als Label.
const CREED_LINE_SELECT = 'body, bible_reference, bible_verse, bible_id, bible_book, bible_chapter, bible_verse_start, bible_verse_end'

export default function CreedsTab() {
  const { user } = useAuth()

  const [ownCreeds, setOwnCreeds] = useState([])
  const [publicCreeds, setPublicCreeds] = useState([])
  const [publicSearch, setPublicSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confessionByCreed, setConfessionByCreed] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [linesByCreed, setLinesByCreed] = useState({})
  const [historyOpenId, setHistoryOpenId] = useState(null)
  const [historyByCreed, setHistoryByCreed] = useState({})

  const [passageSheet, setPassageSheet] = useState(null)
  const [editorInitial, setEditorInitial] = useState(undefined)
  const [showEditor, setShowEditor] = useState(false)
  const [reportTarget, setReportTarget] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [{ data: mine }, { data: allPublic }] = await Promise.all([
      supabase.from('creeds').select('id, title, visibility, visibility_community_id, visibility_user_ids, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
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

  async function toggleHistory(creed) {
    if (historyOpenId === creed.id) { setHistoryOpenId(null); return }
    setHistoryOpenId(creed.id)
    if (!historyByCreed[creed.id]) {
      const { data } = await supabase
        .from('creed_confession_logs')
        .select('id, confessed_at')
        .eq('user_id', user.id)
        .eq('creed_id', creed.id)
        .order('confessed_at', { ascending: false })
        .limit(50)
      setHistoryByCreed(prev => ({ ...prev, [creed.id]: data || [] }))
    }
  }

  function openLine(line) {
    if (!line.bible_reference) return
    setPassageSheet({ label: line.bible_reference, parsed: parseGermanReference(line.bible_reference) })
  }

  async function confess(creedId) {
    const nowIso = new Date().toISOString()
    const next = (confessionByCreed[creedId] || 0) + 1
    setConfessionByCreed(prev => ({ ...prev, [creedId]: next }))
    setHistoryByCreed(prev => prev[creedId]
      ? { ...prev, [creedId]: [{ id: `optimistic-${nowIso}`, confessed_at: nowIso }, ...prev[creedId]] }
      : prev)

    await Promise.all([
      supabase.from('creed_confessions').upsert({
        user_id: user.id, creed_id: creedId, count: next, last_confessed_at: nowIso,
      }, { onConflict: 'user_id,creed_id' }),
      supabase.from('creed_confession_logs').insert({ user_id: user.id, creed_id: creedId, confessed_at: nowIso }),
    ])
  }

  async function openOwnCreed(creed) {
    const { data: lines } = await supabase.from('creed_lines').select(CREED_LINE_SELECT).eq('creed_id', creed.id).order('order_index')
    setEditorInitial({
      id: creed.id, title: creed.title, visibility: creed.visibility,
      visibility_community_id: creed.visibility_community_id, visibility_user_ids: creed.visibility_user_ids,
      lines: lines || [],
    })
    setShowEditor(true)
  }

  async function adoptCreed(creed) {
    const { data: lines } = await supabase.from('creed_lines').select(CREED_LINE_SELECT).eq('creed_id', creed.id).order('order_index')
    setEditorInitial({ title: `${creed.title} (Kopie)`, visibility: 'private', lines: lines || [], sourceCreedId: creed.id })
    setShowEditor(true)
  }

  const filteredPublic = publicCreeds.filter(c => !publicSearch.trim() || c.title.toLowerCase().includes(publicSearch.trim().toLowerCase()))

  return (
    <>
      {historyOpenId && (
        <div onClick={() => setHistoryOpenId(null)} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
      )}

      <div className="px-4 py-4" style={{ paddingBottom: 16 }}>
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
                  historyOpen={historyOpenId === c.id} history={historyByCreed[c.id]}
                  onToggleExpand={() => toggleExpand(c)}
                  onEdit={() => openOwnCreed(c)}
                  onConfess={() => confess(c.id)}
                  onToggleHistory={() => toggleHistory(c)}
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
                  historyOpen={historyOpenId === c.id} history={historyByCreed[c.id]}
                  onToggleExpand={() => toggleExpand(c)}
                  onAdopt={() => adoptCreed(c)}
                  onReport={() => setReportTarget(c.id)}
                  onConfess={() => confess(c.id)}
                  onToggleHistory={() => toggleHistory(c)}
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
    </>
  )
}
