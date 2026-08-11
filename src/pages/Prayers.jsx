import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Globe, UserCheck, Home as HomeIcon, Users, X, ChevronDown, SlidersHorizontal, Play } from 'lucide-react'
import PrayerFeedSwitcher from '../components/layout/PrayerFeedSwitcher'
import { usePrayerFeed, PRAYER_SOURCES } from '../hooks/usePrayerFeed'
import { usePersonalPrayer } from '../hooks/usePersonalPrayer'
import { usePrayerGoals } from '../hooks/usePrayerGoals'
import { useAuth } from '../hooks/useAuth'
import { useCommunities } from '../hooks/useCommunities'
import { useToast } from '../context/ToastContext'
import DateFilterControl from '../components/ui/DateFilterControl'
import ExpandableSearch from '../components/common/ExpandableSearch'
import { EMPTY_DATE_FILTER, matchesDateFilter, isDateFilterActive } from '../lib/dateFilter'
import PrayerListsSection from '../components/prayer/PrayerListsSection'
import PrayerModeSetupSheet from '../components/prayer/PrayerModeSetupSheet'
import PrayerCardList from '../components/prayer/PrayerCardList'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'
import SiblingPicker from '../components/prayer/SiblingPicker'
import OikosFilterSheet from '../components/prayer/OikosFilterSheet'
import { useOikosFilterSource } from '../hooks/useOikosFilterSource'
import { KIND_OIKOS, KIND_PERSONAL } from '../lib/prayerModel'

// ─── Konstanten ───────────────────────────────────────────────

const STATUS_OPTIONS = [
  { key: 'all',      label: 'Alle Anliegen' },
  { key: 'open',     label: '☑️ Offene Anliegen' },
  { key: 'answered', label: '✅ Erhörte Anliegen' },
]

const CATEGORIES = [
  { key: 'heilung',    label: 'Heilung',    emoji: '🌿' },
  { key: 'weisheit',   label: 'Weisheit',   emoji: '🕊️' },
  { key: 'erweckung',  label: 'Erweckung',  emoji: '🔥' },
  { key: 'wahrheit',   label: 'Wahrheit',   emoji: '📖' },
  { key: 'liebe',      label: 'Liebe',      emoji: '❤️' },
  { key: 'sonstiges',  label: 'Sonstiges',  emoji: '🙏' },
]

const VISIBILITY_OPTIONS = [
  { key: 'public',   label: 'Öffentlich',            icon: Globe },
  { key: 'community',label: 'Community',              icon: HomeIcon },
  { key: 'siblings', label: 'Meine Geschwister',      icon: UserCheck },
  { key: 'specific', label: 'Ausgewählte Geschwister', icon: Users },
]

const sourceChipStyle = active => ({
  flexShrink: 0, padding: '6px 13px', borderRadius: 999,
  border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
  backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
  color: active ? '#fff' : 'var(--color-text-secondary)',
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
})

// Pillen-Auswahlfeld für die Feinfilter unter den Quellen-Chips.
function FilterSelect({ value, onChange, allLabel, options }) {
  const active = value !== 'all'
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={allLabel}
      style={{
        flexShrink: 0, padding: '6px 10px', borderRadius: 999,
        border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        backgroundColor: active ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
        color: active ? 'var(--color-accent-dark)' : 'var(--color-text-secondary)',
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer', maxWidth: 190,
      }}
    >
      <option value="all">{allLabel}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// Aus einer Gebets-Liste eindeutige Auswahl-Optionen bauen.
// pick(prayer) liefert [value, label] oder etwas Falsches zum Überspringen.
function uniqueOptions(prayers, pick) {
  const byValue = new Map()
  for (const p of prayers) {
    const entry = pick(p)
    if (!entry) continue
    const [value, label] = entry
    if (value && !byValue.has(value)) byValue.set(value, { value, label })
  }
  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

// ─── Neues Gebet erstellen ────────────────────────────────────

const GOAL_TYPES = [
  { val: 'people', label: 'Personen',   hint: 'beten mit',  placeholder: '100' },
  { val: 'hours',  label: 'Stunden',    hint: 'Gebetszeit', placeholder: '1000' },
  { val: 'days',   label: 'Tage',       hint: 'am Stück',   placeholder: '30' },
  { val: 'custom', label: 'Individuell', hint: 'frei',      placeholder: '' },
]

// Erstellen-Sheet: alles in EINER Ansicht (Anliegen -> Kategorie -> Gebetsziel
// -> Sichtbarkeit), danach eine Übersicht und "Gebet erstellen".
function CreatePrayerSheet({ onClose, onCreate, onCreateGoal, onDone }) {
  const { myCommunities } = useCommunities()
  const { showToast } = useToast()
  const [phase, setPhase] = useState('form') // 'form' | 'review'
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [category, setCategory] = useState(null)
  const [visibility, setVisibility] = useState('public')
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [selectedSiblings, setSelectedSiblings] = useState([])
  const [goalEnabled, setGoalEnabled] = useState(false)
  const [goalType, setGoalType] = useState('people')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalCustom, setGoalCustom] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isCustomGoalType = goalType === 'custom'
  const goalTargetNum = parseInt(goalTarget, 10)
  const goalOk = !goalEnabled || (isCustomGoalType ? goalCustom.trim().length > 0 : goalTargetNum > 0)
  const visOk =
    (visibility !== 'community' || selectedCommunity) &&
    (visibility !== 'specific' || selectedSiblings.length > 0)
  const formValid = text.trim().length > 0 && visOk && goalOk

  const effectiveTitle = title.trim() || (CATEGORIES.find(c => c.key === category)?.label || 'Gebet')
  const catObj = CATEGORIES.find(c => c.key === category)
  const visObj = VISIBILITY_OPTIONS.find(v => v.key === visibility)
  const goalTypeObj = GOAL_TYPES.find(g => g.val === goalType)

  async function handleFinalCreate() {
    if (submitting) return
    setSubmitting(true)
    try {
      const created = await onCreate({
        title: effectiveTitle,
        description: text.trim(),
        visibility: visibility === 'specific' ? 'siblings' : visibility,
        category,
        visibility_community_id: visibility === 'community' ? selectedCommunity : null,
        visibility_user_ids: visibility === 'specific' ? selectedSiblings : [],
      })
      if (goalEnabled && goalOk) {
        await onCreateGoal({
          // Individuelles Ziel: der frei geschriebene Text ist der Ziel-Titel.
          title: isCustomGoalType ? goalCustom.trim() : effectiveTitle,
          description: text.trim() || null,
          goalType,
          targetValue: isCustomGoalType ? 1 : goalTargetNum,
          visibility,
          communityId: visibility === 'community' ? selectedCommunity : null,
          visibilityUserIds: visibility === 'specific' ? selectedSiblings : [],
        }, created)
      }
      onDone()
    } catch (e) {
      console.error('[CreatePrayer] Fehler beim Erstellen:', e)
      showToast('Fehler beim Erstellen: ' + (e?.message || 'unbekannt'), 'error')
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 448, margin: '0 auto',
        backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', position: 'sticky', top: 0, backgroundColor: 'var(--color-bg)', zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>
            {phase === 'review' ? 'Übersicht' : 'Neues Gebet'}
          </p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--color-bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {phase === 'form' ? (
          <div style={{ padding: '0 16px 28px' }}>
            {/* 1) Anliegen */}
            <p style={secTitle}>1 · Dein Anliegen</p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Überschrift (optional)"
              style={{ ...field, fontWeight: 600, marginBottom: 8 }}
            />
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Schreibe dein Anliegen…"
              rows={4}
              style={{ ...field, lineHeight: 1.6, resize: 'vertical' }}
            />

            {/* 2) Kategorie */}
            <p style={secTitle}>2 · Kategorie</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCategory(category === c.key ? null : c.key)} style={chip(category === c.key)}>
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span>
                </button>
              ))}
            </div>

            {/* 3) Gebetsziel */}
            <p style={secTitle}>3 · Gebetsziel (optional)</p>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--color-border)', cursor: 'pointer' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>🎯 Ziel hinzufügen</span>
              <input type="checkbox" checked={goalEnabled} onChange={e => setGoalEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--color-accent)' }} />
            </label>
            {goalEnabled && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  {GOAL_TYPES.map(t => (
                    <button key={t.val} onClick={() => setGoalType(t.val)} style={{ ...chip(goalType === t.val) }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{t.hint}</span>
                    </button>
                  ))}
                </div>
                {isCustomGoalType ? (
                  <input
                    type="text"
                    value={goalCustom}
                    onChange={e => setGoalCustom(e.target.value)}
                    placeholder={'Dein eigenes Ziel, z. B. Jeden Morgen beten'}
                    style={field}
                  />
                ) : (
                  <input
                    type="number" inputMode="numeric" min="1"
                    value={goalTarget}
                    onChange={e => setGoalTarget(e.target.value)}
                    placeholder={`Zielwert (z. B. ${goalTypeObj?.placeholder})`}
                    style={field}
                  />
                )}
              </div>
            )}

            {/* 4) Sichtbarkeit */}
            <p style={secTitle}>4 · Wer soll es sehen?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {VISIBILITY_OPTIONS.map(o => {
                const Icon = o.icon
                const active = visibility === o.key
                return (
                  <button key={o.key} onClick={() => setVisibility(o.key)} style={row(active)}>
                    <Icon size={18} color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>{o.label}</span>
                  </button>
                )
              })}
            </div>
            {visibility === 'community' && (
              myCommunities.length === 0 ? (
                <p style={hint}>Du bist noch in keiner Community.</p>
              ) : (
                <select value={selectedCommunity || ''} onChange={e => setSelectedCommunity(e.target.value || null)} style={{ ...field, marginTop: 8, appearance: 'none' }}>
                  <option value="">— Community auswählen —</option>
                  {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )
            )}
            {visibility === 'specific' && (
              <div style={{ marginTop: 8 }}>
                <SiblingPicker selected={selectedSiblings} onChange={setSelectedSiblings} />
              </div>
            )}

            <button
              onClick={() => setPhase('review')}
              disabled={!formValid}
              style={{ ...primaryBtn(formValid), marginTop: 22 }}
            >
              Weiter zur Übersicht
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 16px 28px' }}>
            {/* Übersicht */}
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{effectiveTitle}</p>
              {text.trim() && <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text.trim()}</p>}
            </div>
            <SummaryRow label="Kategorie" value={catObj ? `${catObj.emoji} ${catObj.label}` : '—'} />
            <SummaryRow label="Gebetsziel" value={!goalEnabled || !goalOk ? 'Keins' : isCustomGoalType ? goalCustom.trim() : `${goalTarget} ${goalTypeObj?.label}`} />
            <SummaryRow label="Sichtbarkeit" value={
              visibility === 'community'
                ? `${visObj?.label} · ${myCommunities.find(c => c.id === selectedCommunity)?.name || ''}`
                : visibility === 'specific'
                ? `${visObj?.label} · ${selectedSiblings.length} ausgewählt`
                : (visObj?.label || '')
            } />

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setPhase('form')} disabled={submitting} style={{ padding: '13px 18px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer' }}>
                ← Zurück
              </button>
              <button onClick={handleFinalCreate} disabled={submitting} style={{ ...primaryBtn(!submitting), flex: 1 }}>
                {submitting ? 'Erstellt…' : '🙏 Gebet erstellen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 2px', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const secTitle = { margin: '20px 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.4px' }
const field = { width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box', display: 'block' }
const hint = { fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic', margin: '8px 0 0' }
function chip(active) {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '12px 6px', borderRadius: 12, cursor: 'pointer',
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
    color: active ? 'var(--color-accent)' : 'var(--color-text)',
  }
}
function row(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14,
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  }
}
function primaryBtn(enabled) {
  return {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: enabled ? 'var(--color-accent)' : 'var(--color-border)',
    color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: enabled ? 'pointer' : 'default',
  }
}

// ─── Haupt-Seite ──────────────────────────────────────────────

export default function Prayers() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('open') // 'all' | 'open' | 'answered'
  // Quelle des Feeds: 'all' (Standard) zeigt jedes Gebet, das für den Nutzer
  // sichtbar ist – eigene, Oikos-, Community- und geteilte Gebete.
  const [sourceFilter, setSourceFilter] = useState('all')
  // Feinfilter innerhalb einer Quelle. Community bleibt eine einfache
  // Einfachauswahl; Oikos hat einen eigenen mehrstufigen Filter (von wem →
  // welche Maps → welche Personen, siehe useOikosFilterSource) mit eigenem
  // Auswahlzustand, der beim Quellenwechsel bewusst NICHT zurückgesetzt wird.
  const [communityFilter, setCommunityFilter] = useState('all')
  const [showOikosFilterSheet, setShowOikosFilterSheet] = useState(false)
  const oikosFilter = useOikosFilterSource({ enabled: sourceFilter === 'oikos' })

  function selectSource(key) {
    setSourceFilter(key)
    setCommunityFilter('all')
  }
  const { prayers, loading, reload } = usePrayerFeed(sourceFilter, statusFilter)
  const { createRequest } = usePersonalPrayer()
  const { createGoal, publicGoals, myGoals, communityGoals, sharedGoals } = usePrayerGoals()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeCategories, setActiveCategories] = useState([])
  const [dateFilter, setDateFilter] = useState(EMPTY_DATE_FILTER)
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [highlightId, setHighlightId] = useState(null)

  // Kollabierender Header (wie im Feed-Tab)
  const rootRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const collapsedRef = useRef(false)
  const lockUntilRef = useRef(0)
  const tickingRef = useRef(false)

  function setCollapsedSafe(v) {
    if (collapsedRef.current === v) return
    collapsedRef.current = v
    setCollapsed(v)
    lockUntilRef.current = Date.now() + 360
  }

  useEffect(() => {
    const scroller = rootRef.current?.closest('.overflow-y-auto')
    if (!scroller) return
    let lastY = scroller.scrollTop
    function update() {
      tickingRef.current = false
      const st = scroller.scrollTop
      const dy = st - lastY
      lastY = st
      if (Date.now() < lockUntilRef.current) return
      if (st <= 8) { setCollapsedSafe(false); return }
      if (dy > 8 && st > 90) setCollapsedSafe(true)
      else if (dy < -8) setCollapsedSafe(false)
    }
    function onScroll() {
      if (!tickingRef.current) { tickingRef.current = true; requestAnimationFrame(update) }
    }
    let touchStartX = 0
    let touchStartY = 0
    let swipeBlocked = false
    function onTouchStart(e) {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      // Geste über einem horizontal scrollbaren Bereich (Quellen-Chips, Karussells)
      // soll dort scrollen dürfen statt zum Feed zu navigieren.
      let node = e.target
      swipeBlocked = false
      while (node && node !== scroller && node !== document.body) {
        if (node.scrollWidth > node.clientWidth + 2) {
          const overflowX = window.getComputedStyle(node).overflowX
          if (overflowX === 'auto' || overflowX === 'scroll') { swipeBlocked = true; break }
        }
        node = node.parentElement
      }
    }
    function onTouchEnd(e) {
      if (swipeBlocked) return
      const t = e.changedTouches[0]
      const dx = t.clientX - touchStartX
      const dy = t.clientY - touchStartY
      if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.3) navigate('/friends?tab=feed')
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('touchstart', onTouchStart, { passive: true })
    scroller.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchend', onTouchEnd)
    }
  }, [navigate])

  // Gebetsmodus / Bookmark / Weiterleiten / Gebetsziel
  const [showPrayerModeSetup, setShowPrayerModeSetup] = useState(false)
  const [prayerModeItems, setPrayerModeItems] = useState(null)

  // Direkt das Erstellen-Sheet öffnen, wenn man vom Profil "+ Gebetsanliegen" kommt
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreate(true)
      searchParams.delete('create')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  function toggleCategory(key) {
    setActiveCategories(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])
  }

  const dateActive = isDateFilterActive(dateFilter)
  const q = searchQuery.trim().toLowerCase()

  // Auswahlmöglichkeiten aus den geladenen Gebeten ableiten – so stehen nur
  // Communities zur Wahl, zu denen es auch Anliegen gibt. Der Oikos-Filter
  // hat eigene, unabhängig geladene Referenzdaten (useOikosFilterSource).
  const showOikosFilters = sourceFilter === 'oikos'
  const showCommunityFilter = sourceFilter === 'communities'

  const communityOptions = uniqueOptions(prayers, p => p.communityId && [p.communityId, p.communityName || 'Community'])

  const oikosFilterActive = showOikosFilters && oikosFilter.isActive
  const communityFilterActive = showCommunityFilter && communityFilter !== 'all'

  const filteredPrayers = prayers.filter(p => {
    if (showOikosFilters && !oikosFilter.matchesPrayer(p)) return false
    if (showCommunityFilter && communityFilter !== 'all' && p.communityId !== communityFilter) return false
    if (activeCategories.length > 0 && !activeCategories.includes(p.category)) return false
    if (!matchesDateFilter(p.createdAt, dateFilter)) return false
    if (!q) return true
    const haystack = [
      p.title || '',
      p.description || '',
      p.author?.full_name || '',
      p.author?.username || '',
      p.personName || '',
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })

  // Sichtbare Gebetsziele (dedupliziert). Ein Gebet MIT Ziel wird als normale
  // Gebets-Karte gezeigt, nur mit zusätzlichem Fortschritt.
  const allGoals = (() => {
    const byId = new Map()
    for (const g of [...publicGoals, ...sharedGoals, ...communityGoals, ...myGoals]) {
      if (g && !byId.has(g.id)) byId.set(g.id, g)
    }
    return [...byId.values()]
  })()
  const goalByKey = new Map(
    allGoals.filter(g => g.personal_prayer_request_id)
      .map(g => [`${KIND_PERSONAL}:${g.personal_prayer_request_id}`, g]),
  )

  // Count of non-default filter facets (status counts when not the default "open")
  const filterFacetCount = activeCategories.length + (dateActive ? 1 : 0) + (statusFilter !== 'open' ? 1 : 0)
  const hasActiveFilter = filterFacetCount > 0 || q.length > 0 || oikosFilterActive || communityFilterActive

  // Vom Profil verlinktes Gebet anspringen + kurz hervorheben
  useEffect(() => {
    if (!focusId || loading) return
    const el = document.getElementById('prayer-' + focusId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(focusId)
    const t = setTimeout(() => setHighlightId(null), 2200)
    searchParams.delete('focus')
    setSearchParams(searchParams, { replace: true })
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading, filteredPrayers.length])

  // Die aktuell sichtbaren Gebete im Format des Gebetsmodus – damit man aus
  // jeder Quellen-/Filterauswahl heraus direkt losbeten kann.
  const visiblePrayerModeItems = filteredPrayers.map(p => ({
    type: p.kind === KIND_OIKOS ? 'oikos' : 'personal',
    request: { ...p.raw, profiles: p.author || p.raw?.profiles || (p.personName ? { full_name: p.personName } : null) },
    ampel: null,
  }))

  async function handleCreate({ title, description, visibility, category, visibility_community_id, visibility_user_ids }) {
    // Fehler werden absichtlich NICHT geschluckt – das Sheet zeigt die echte
    // Ursache an, damit ein nicht gepostetes Gebet sichtbar/diagnostizierbar wird.
    const created = await createRequest({ title, description, visibility, category, visibility_community_id, visibility_user_ids })
    reload()
    return created
  }

  async function handleCreateGoal(payload, createdRequest) {
    const linked = createdRequest
    await createGoal({
      ...payload,
      personalPrayerRequestId: linked && !linked.person_id ? linked.id : null,
      prayerRequestId: linked && linked.person_id ? linked.id : null,
    })
  }


  return (
    <div ref={rootRef} className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full" style={{ position: 'relative' }}>
      {/* Sticky-Header: Suche/Filter (immer sichtbar) + Switcher */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'var(--color-bg)' }}>
      {/* Search + filter – direkt über den Gebetsanliegen, immer sichtbar */}
      <div style={{
        backgroundColor: 'var(--color-bg)',
        padding: '12px 16px 8px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
          <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Gebet suchen…" />
          <button
            onClick={() => setShowFilters(v => !v)}
            aria-label="Filter"
            style={{
              position: 'relative',
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              border: `1.5px solid ${showFilters || filterFacetCount ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: showFilters || filterFacetCount ? 'rgba(90,200,250,0.12)' : 'var(--color-bg-secondary)',
              color: showFilters || filterFacetCount ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={17} />
            {filterFacetCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
                backgroundColor: 'var(--color-accent)', color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--color-bg)',
              }}>
                {filterFacetCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div style={{ paddingTop: 10 }}>
            {/* Status */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>
              Status
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {STATUS_OPTIONS.map(s => {
                const active = statusFilter === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => setStatusFilter(s.key)}
                    style={{
                      padding: '6px 11px', borderRadius: 999,
                      border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: active ? 'rgba(74,103,65,0.12)' : 'var(--color-bg-secondary)',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>

            {/* Zeitraum */}
            <div style={{ marginBottom: 14 }}>
              <DateFilterControl value={dateFilter} onChange={setDateFilter} />
            </div>

            {/* Kategorien */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>
              Kategorien
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map(c => {
                const active = activeCategories.includes(c.key)
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleCategory(c.key)}
                    style={{
                      padding: '6px 11px', borderRadius: 999,
                      border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: active ? 'rgba(74,103,65,0.12)' : 'var(--color-bg-secondary)',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                )
              })}
              {activeCategories.length > 0 && (
                <button
                  onClick={() => setActiveCategories([])}
                  style={{
                    padding: '6px 11px', borderRadius: 999,
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            {filterFacetCount > 0 && (
              <button
                onClick={() => { setStatusFilter('open'); setDateFilter(EMPTY_DATE_FILTER); setActiveCategories([]) }}
                style={{
                  marginTop: 14, padding: '7px 14px', borderRadius: 999,
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Alle Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>

        {/* Feed/Gebete-Switcher – darunter; kollabiert beim Runterscrollen */}
        {collapsed && (
          <div
            onClick={() => setCollapsedSafe(false)}
            style={{
              height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backgroundColor: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)' }} />
          </div>
        )}
        <div style={{
          maxHeight: collapsed ? 0 : 64,
          opacity: collapsed ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.25s ease',
        }}>
          <PrayerFeedSwitcher active="prayers" />
        </div>
      </div>{/* /Sticky-Header */}

      {/* Quellen-Auswahl: welche Gebete sollen im Feed erscheinen */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 16px 10px', borderBottom: '1px solid var(--color-border)' }}>
        {PRAYER_SOURCES.map(src => {
          const active = sourceFilter === src.key
          return (
            <button
              key={src.key}
              onClick={() => selectSource(src.key)}
              style={sourceChipStyle(active)}
            >
              {src.label}
            </button>
          )
        })}
      </div>

      {/* Feinfilter der gewählten Quelle */}
      {(showOikosFilters || showCommunityFilter) && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
          {showOikosFilters && (
            <button onClick={() => setShowOikosFilterSheet(true)} style={sourceChipStyle(oikosFilter.isActive)}>
              Von wem & welche Maps
              {oikosFilter.isActive && <span style={{ marginLeft: 4 }}>●</span>}
            </button>
          )}
          {showCommunityFilter && (
            <FilterSelect
              value={communityFilter} onChange={setCommunityFilter}
              allLabel="Alle Communities" options={communityOptions}
            />
          )}
        </div>
      )}

      {/* Gebetslisten (kompakt) + Gebetsmodus */}
      <div style={{ padding: '14px 0 4px', borderBottom: '1px solid var(--color-border)' }}>
        <PrayerListsSection variant="compact" />
        <div style={{ padding: '4px 16px 12px' }}>
          <button
            onClick={() => setShowPrayerModeSetup(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
              color: '#fff', fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 14px rgba(90,200,250,0.30)',
            }}
          >
            <Play size={17} fill="#fff" /> Gebetsmodus starten
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && prayers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>🙏</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
              Noch keine Gebete
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {sourceFilter === 'all'
                ? 'Sei der Erste, der ein Anliegen teilt.'
                : 'Aus dieser Quelle ist gerade nichts sichtbar.'}
            </p>
          </div>
        )}

        {!loading && prayers.length > 0 && filteredPrayers.length === 0 && hasActiveFilter && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontSize: 28, margin: '0 0 10px' }}>🔍</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
              Keine Gebete gefunden. Versuche andere Filter.
            </p>
          </div>
        )}

        {!loading && filteredPrayers.length > 0 && (
          <PrayerCardList
            prayers={filteredPrayers}
            goalByKey={goalByKey}
            showSourceBadge={sourceFilter === 'all'}
            onChanged={reload}
            onOpenGoal={(g) => navigate(`/goals/${g.id}`)}
          />
        )}

      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        aria-label="Gebet teilen"
        style={{
          position: 'fixed', bottom: 80, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          backgroundColor: 'var(--color-accent)', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, lineHeight: 1,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 40,
        }}
      >
        +
      </button>

      {showOikosFilterSheet && (
        <OikosFilterSheet source={oikosFilter} onClose={() => setShowOikosFilterSheet(false)} />
      )}

      {showCreate && (
        <CreatePrayerSheet
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          onCreateGoal={handleCreateGoal}
          onDone={() => { setShowCreate(false); showToast('Gebet erstellt 🙏') }}
        />
      )}

      {/* Gebetsmodus-Setup */}
      {showPrayerModeSetup && (
        <PrayerModeSetupSheet
          visibleItems={visiblePrayerModeItems}
          visibleLabel={PRAYER_SOURCES.find(x => x.key === sourceFilter)?.label}
          onClose={() => setShowPrayerModeSetup(false)}
          onStart={(items) => { setShowPrayerModeSetup(false); setPrayerModeItems(items) }}
        />
      )}

      {/* Geführter Gebetsmodus */}
      {prayerModeItems && (
        <GuidedPrayerMode
          items={prayerModeItems}
          onClose={() => { setPrayerModeItems(null); reload() }}
        />
      )}

    </div>
  )
}
