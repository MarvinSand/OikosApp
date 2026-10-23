import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { parseGermanReference } from '../../lib/bibleBooks'
import { CreedRow } from './CreedRow'
import { addConfession, removeConfessionLog } from '../../lib/creedConfessions'

const BiblePassageSheet = lazy(() => import('../discipleship/BiblePassageSheet'))
const ReportSheet = lazy(() => import('../discipleship/ReportSheet'))
const CreedEditorSheet = lazy(() => import('../discipleship/CreedEditorSheet'))

// Volle Bibelstellen-Spalten (siehe phase74) fürs Übernehmen ins eigene
// Bekenntnis - für die reine Anzeige (toggleExpand) reicht bible_reference.
const CREED_LINE_SELECT = 'body, bible_reference, bible_verse, bible_id, bible_book, bible_chapter, bible_verse_start, bible_verse_end'

// Öffentliche Bekenntnisse eines ANDEREN Nutzers - read-only bis auf
// Bekennen/Übernehmen/Melden (kein Bearbeiten, kein "Neu"). Die RLS-Policy
// "Read public creeds" erlaubt jedem Nutzer visibility='public'-Zeilen zu
// lesen, egal von wem - hier einfach zusätzlich auf user_id gefiltert.
export default function UserCreedsTab({ userId, displayName }) {
  const { user } = useAuth()

  const [creeds, setCreeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [confessionByCreed, setConfessionByCreed] = useState({})
  const [commentCounts, setCommentCounts] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [linesByCreed, setLinesByCreed] = useState({})
  const [historyOpenId, setHistoryOpenId] = useState(null)
  const [historyByCreed, setHistoryByCreed] = useState({})
  const [passageSheet, setPassageSheet] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [editorInitial, setEditorInitial] = useState(undefined)
  const [showEditor, setShowEditor] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('creeds')
      .select('id, title, user_id, created_at, updated_at, creed_comments(count)')
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .order('updated_at', { ascending: false })
    setCreeds(data || [])
    const counts = {}
    for (const c of data || []) counts[c.id] = c.creed_comments?.[0]?.count || 0
    setCommentCounts(counts)

    if (user && data?.length > 0) {
      const { data: confessions } = await supabase
        .from('creed_confessions')
        .select('creed_id, count, last_confessed_at')
        .eq('user_id', user.id)
        .in('creed_id', data.map(c => c.id))
      const map = {}
      for (const c of confessions || []) map[c.creed_id] = { count: c.count, lastConfessedAt: c.last_confessed_at }
      setConfessionByCreed(map)
    }
    setLoading(false)
  }

  useEffect(() => { if (userId) load() }, [userId])

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
    const logId = crypto.randomUUID()
    const next = (confessionByCreed[creedId]?.count || 0) + 1
    setConfessionByCreed(prev => ({ ...prev, [creedId]: { count: next, lastConfessedAt: nowIso } }))
    setHistoryByCreed(prev => prev[creedId]
      ? { ...prev, [creedId]: [{ id: logId, confessed_at: nowIso }, ...prev[creedId]] }
      : prev)
    await addConfession(user.id, creedId, next, nowIso, logId)
  }

  // Versehentlich abgehakten Eintrag aus dem Verlauf löschen.
  async function deleteConfession(creedId, logId) {
    const next = Math.max((confessionByCreed[creedId]?.count || 0) - 1, 0)
    setHistoryByCreed(prev => ({ ...prev, [creedId]: (prev[creedId] || []).filter(h => h.id !== logId) }))
    setConfessionByCreed(prev => ({ ...prev, [creedId]: { ...prev[creedId], count: next } }))
    const last = await removeConfessionLog(user.id, creedId, logId, next)
    setConfessionByCreed(prev => ({ ...prev, [creedId]: { count: next, lastConfessedAt: last } }))
  }

  async function adoptCreed(creed) {
    const { data: lines } = await supabase.from('creed_lines').select(CREED_LINE_SELECT).eq('creed_id', creed.id).order('order_index')
    setEditorInitial({ title: `${creed.title} (Kopie)`, visibility: 'private', lines: lines || [], sourceCreedId: creed.id })
    setShowEditor(true)
  }

  return (
    <>
      {historyOpenId && (
        <div onClick={() => setHistoryOpenId(null)} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
      )}

      <div className="px-4 py-4">
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {!loading && creeds.length === 0 && (
          <p style={{ fontSize: 13.5, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '24px 0' }}>
            {displayName || 'Diese Person'} hat noch kein öffentliches Bekenntnis geteilt.
          </p>
        )}
        {!loading && creeds.length > 0 && (
          <div className="space-y-2">
            {creeds.map(c => (
              <CreedRow
                key={c.id} creed={c} isOwn={false} isOfficial={false}
                expanded={expandedId === c.id} lines={linesByCreed[c.id]}
                confessionCount={confessionByCreed[c.id]?.count || 0}
                commentCount={commentCounts[c.id] || 0}
                onCommentCountChange={n => setCommentCounts(prev => prev[c.id] === n ? prev : { ...prev, [c.id]: n })}
                historyOpen={historyOpenId === c.id} history={historyByCreed[c.id]}
                onToggleExpand={() => toggleExpand(c)}
                onAdopt={() => adoptCreed(c)}
                onReport={() => setReportTarget(c.id)}
                onConfess={() => confess(c.id)}
                onDeleteConfession={logId => deleteConfession(c.id, logId)}
                onToggleHistory={() => toggleHistory(c)}
                onOpenLine={openLine}
              />
            ))}
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {passageSheet && <BiblePassageSheet label={passageSheet.label} parsed={passageSheet.parsed} onClose={() => setPassageSheet(null)} />}
        {reportTarget && (
          <ReportSheet contentType="creed" contentId={reportTarget} onClose={() => setReportTarget(null)} />
        )}
        {showEditor && (
          <CreedEditorSheet
            initial={editorInitial}
            onClose={() => setShowEditor(false)}
          />
        )}
      </Suspense>
    </>
  )
}
