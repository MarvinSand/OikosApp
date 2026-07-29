import { useEffect, useState } from 'react'
import { Check, Loader2, Droplet, Users, Flame } from 'lucide-react'
import {
  fetchBiblePlan, fetchBibleProgress, toggleBibleDay,
  fetchJournalEntries, addJournalEntry,
  fetchBaptismStatus, requestBaptism,
  fetchMentorSuggestion, fetchMentorMatch, confirmMentorMatch,
} from '../../lib/pilgerweg'

const cardStyle = {
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 16, padding: 18,
}
const btnStyle = {
  padding: '11px 18px', borderRadius: 999, border: 'none',
  backgroundColor: 'var(--color-accent)', color: '#fff',
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

export default function StationDetail({ station, isDone, onMarkDone, user }) {
  if (station.type === 'challenge') return <ChallengeCard station={station} isDone={isDone} onMarkDone={onMarkDone} />
  if (station.type === 'bible_plan') return <BiblePlanCard station={station} user={user} />
  if (station.type === 'journal') return <JournalCard station={station} user={user} />
  if (station.type === 'milestone') return <MilestoneCard station={station} user={user} />
  if (station.type === 'mentor_match') return <MentorMatchCard station={station} user={user} />
  return null
}

// ─── challenge ────────────────────────────────────────────
function ChallengeCard({ station, isDone, onMarkDone }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
        {station.description || 'Platzhalter-Beschreibung für diese Challenge.'}
      </p>
      <button
        onClick={onMarkDone}
        disabled={isDone}
        style={{ ...btnStyle, marginTop: 18, width: '100%', backgroundColor: isDone ? 'var(--color-gold)' : 'var(--color-accent)', color: isDone ? '#3A2B05' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isDone ? 0.9 : 1 }}
      >
        {isDone ? <><Check size={16} /> Erledigt</> : 'Erledigt'}
      </button>
    </div>
  )
}

// ─── bible_plan ───────────────────────────────────────────
function BiblePlanCard({ station, user }) {
  const [plan, setPlan] = useState(null)
  const [doneDays, setDoneDays] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const p = await fetchBiblePlan(station.id)
      if (cancelled) return
      setPlan(p)
      if (p) setDoneDays(await fetchBibleProgress(user.id, p.id))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [station.id, user.id])

  if (loading) return <CardLoader />
  if (!plan) return <EmptyCard text="Noch kein Leseplan hinterlegt." />

  const days = Array.isArray(plan.days) ? plan.days : []
  const streak = days.filter(d => doneDays.has(d.day)).length

  async function toggle(day) {
    const wasDone = doneDays.has(day)
    await toggleBibleDay(user.id, plan.id, day, !wasDone)
    setDoneDays(prev => {
      const next = new Set(prev)
      wasDone ? next.delete(day) : next.add(day)
      return next
    })
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, color: 'var(--color-accent-dark)' }}>
        <Flame size={16} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{streak} von {days.length} Tagen</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {days.map(d => {
          const checked = doneDays.has(d.day)
          return (
            <button
              key={d.day}
              onClick={() => toggle(d.day)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 12, border: '1px solid var(--color-border)',
                backgroundColor: checked ? 'var(--color-accent-light)' : 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${checked ? 'var(--color-accent-dark)' : 'var(--color-border)'}`,
                backgroundColor: checked ? 'var(--color-accent-dark)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checked && <Check size={13} color="#fff" strokeWidth={3} />}
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--color-text)' }}>
                Tag {d.day} · {d.reference || 'Platzhalter-Referenz'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── journal ──────────────────────────────────────────────
function JournalCard({ station, user }) {
  const [entries, setEntries] = useState([])
  const [content, setContent] = useState('')
  const [shared, setShared] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchJournalEntries(user.id, station.id).then(rows => { if (!cancelled) { setEntries(rows); setLoading(false) } })
    return () => { cancelled = true }
  }, [station.id, user.id])

  async function save() {
    if (!content.trim() || saving) return
    setSaving(true)
    await addJournalEntry(user.id, station.id, content.trim(), shared)
    setEntries(await fetchJournalEntries(user.id, station.id))
    setContent('')
    setSaving(false)
  }

  return (
    <div style={cardStyle}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Was möchtest du festhalten?"
        rows={4}
        style={{
          width: '100%', resize: 'vertical', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'inherit',
          color: 'var(--color-text)', backgroundColor: 'var(--color-bg)',
        }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
        Mit meinem Mentor teilen
      </label>
      <button onClick={save} disabled={!content.trim() || saving} style={{ ...btnStyle, marginTop: 14, width: '100%', opacity: !content.trim() || saving ? 0.6 : 1 }}>
        {saving ? 'Speichert…' : 'Eintrag speichern'}
      </button>

      {!loading && entries.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => (
            <div key={e.id} style={{ padding: 12, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)' }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{e.content}</p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {new Date(e.created_at).toLocaleDateString('de-DE')}{e.shared_with_mentor ? ' · mit Mentor geteilt' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── milestone (Taufe) ──────────────────────────────────────
const BAPTISM_LABELS = {
  nicht_getauft: 'Noch nicht getauft',
  angefragt: 'Taufe angefragt',
  geplant: 'Taufe geplant',
  getauft: 'Getauft',
}

function MilestoneCard({ station, user }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchBaptismStatus(user.id).then(row => {
      if (cancelled) return
      setStatus(row?.status || 'nicht_getauft')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user.id])

  if (loading) return <CardLoader />

  async function request() {
    await requestBaptism(user.id)
    setStatus('angefragt')
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-dark)' }}>
          <Droplet size={19} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{BAPTISM_LABELS[status]}</span>
      </div>
      <button onClick={request} disabled={status !== 'nicht_getauft'} style={{ ...btnStyle, width: '100%', opacity: status !== 'nicht_getauft' ? 0.5 : 1 }}>
        Taufe anfragen
      </button>
    </div>
  )
}

// ─── mentor_match ─────────────────────────────────────────
function MentorMatchCard({ station, user }) {
  const [match, setMatch] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const existing = await fetchMentorMatch(user.id)
      if (cancelled) return
      if (existing) {
        setMatch(existing)
      } else {
        setSuggestion(await fetchMentorSuggestion(user.id))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user.id])

  if (loading) return <CardLoader />

  async function confirm() {
    if (!suggestion || confirming) return
    setConfirming(true)
    await confirmMentorMatch(user.id, suggestion.user_id)
    setMatch(await fetchMentorMatch(user.id))
    setConfirming(false)
  }

  const person = match?.profiles || suggestion?.profiles
  const name = person?.full_name || person?.username || 'Ein Mentor aus dem Pool'

  if (!person) return <EmptyCard text="Aktuell ist noch niemand im Mentoren-Pool verfügbar." />

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-dark)' }}>
          <Users size={20} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>{name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {match ? `Status: ${match.status}` : 'Vorschlag aus dem Mentoren-Pool'}
          </p>
        </div>
      </div>
      {!match && (
        <button onClick={confirm} disabled={confirming} style={{ ...btnStyle, width: '100%', opacity: confirming ? 0.6 : 1 }}>
          {confirming ? 'Bestätigt…' : 'Bestätigen'}
        </button>
      )}
    </div>
  )
}

function CardLoader() {
  return (
    <div style={{ ...cardStyle, display: 'flex', justifyContent: 'center', padding: 30 }}>
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
    </div>
  )
}

function EmptyCard({ text }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-secondary)' }}>{text}</p>
    </div>
  )
}
