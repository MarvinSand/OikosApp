import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Globe, UserCheck, Home as HomeIcon, Users, X, ChevronDown, Send, MessageCircle, ChevronUp, Search, SlidersHorizontal, BookmarkPlus, Forward, Play, MoreVertical, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PrayerFeedSwitcher from '../components/layout/PrayerFeedSwitcher'
import { usePrayerFeed } from '../hooks/usePrayerFeed'
import { usePersonalPrayer } from '../hooks/usePersonalPrayer'
import { usePrayerGoals } from '../hooks/usePrayerGoals'
import { usePrayerLists, LATER_LIST_NAME } from '../hooks/usePrayerLists'
import { useAuth } from '../hooks/useAuth'
import { useCommunities } from '../hooks/useCommunities'
import { useToast } from '../context/ToastContext'
import DateFilterControl from '../components/ui/DateFilterControl'
import ExpandableSearch from '../components/common/ExpandableSearch'
import { EMPTY_DATE_FILTER, matchesDateFilter, isDateFilterActive } from '../lib/dateFilter'
import PrayerListsSection from '../components/prayer/PrayerListsSection'
import PrayerModeSetupSheet from '../components/prayer/PrayerModeSetupSheet'
import AddToListSheet from '../components/prayer/AddToListSheet'
import ForwardSheet from '../components/prayer/ForwardSheet'
import GuidedPrayerMode from '../components/prayer/GuidedPrayerMode'
import ProgressBar from '../components/prayer/ProgressBar'
import SiblingPicker from '../components/prayer/SiblingPicker'

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

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '11px 14px', border: 'none', background: 'none',
  fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
  cursor: 'pointer', textAlign: 'left',
}

function timeAgo(iso) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Gerade eben'
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`
  return `vor ${Math.floor(diff / 86400)} T`
}

function Avatar({ profile, size = 36 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, border: '1px solid var(--color-border)',
    }}>
      {initials}
    </div>
  )
}

// ─── Kommentar-Eingabe ────────────────────────────────────────

function CommentInput({ onSubmit }) {
  const [text, setText] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSend() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(text.trim(), isPublic)
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 14px', backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Sichtbarkeits-Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[
          { val: true,  label: 'Für alle' },
          { val: false, label: 'Nur Ersteller' },
        ].map(o => (
          <button
            key={String(o.val)}
            onClick={() => setIsPublic(o.val)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--color-border)',
              background: isPublic === o.val ? 'var(--color-accent)' : 'var(--color-bg)',
              color: isPublic === o.val ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Kommentar schreiben…"
          rows={2}
          style={{
            flex: 1, resize: 'none', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '8px 10px', fontSize: 13,
            backgroundColor: 'var(--color-bg)', color: 'var(--color-text)',
            outline: 'none', lineHeight: 1.4,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || submitting}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: text.trim() ? 'var(--color-accent)' : 'var(--color-border)',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Gebets-Karte ─────────────────────────────────────────────

function PrayerCard({ request, logs, notes, onPray, onComment, onBookmark, onForward, onDelete, onLaterPray, goal, onOpenGoal }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showPrayMenu, setShowPrayMenu] = useState(false)

  const prayCount = (logs || []).length
  const hasPrayed = (logs || []).some(l => l.user_id === user?.id)
  const cat = CATEGORIES.find(c => c.key === request.category)
  const profile = request.profiles
  const isOwner = request.owner_id === user?.id && request._sourceType !== 'community_message'

  const isCustomGoal = goal?.goal_type === 'custom'
  const goalUnit = goal ? (goal.goal_type === 'hours' ? 'Std' : goal.goal_type === 'days' ? 'Tage' : 'Pers.') : ''
  const goalTypeLabel = goal ? (goal.goal_type === 'hours' ? 'Stunden-Ziel' : goal.goal_type === 'days' ? 'Tage-Ziel' : isCustomGoal ? 'Individuelles Ziel' : 'Personen-Ziel') : ''
  const [goalCurrent, setGoalCurrent] = useState(Number(goal?.current_value) || 0)
  const [goalCount, setGoalCount] = useState(goal?.participant_count || 0)

  async function handlePrayed() {
    setShowPrayMenu(false)
    if (!hasPrayed) onPray(request.id)
    // Bei (nicht-individuellen) Zielen zusätzlich zum Ziel beitragen, damit der
    // Fortschritt direkt in der Ansicht steigt.
    if (goal && !isCustomGoal) {
      setGoalCurrent(v => v + 1)
      setGoalCount(v => v + 1)
      try {
        await supabase.rpc('contribute_to_prayer_goal', { p_goal_id: goal.id, p_minutes: 0 })
      } catch {
        setGoalCurrent(v => Math.max(0, v - 1))
        setGoalCount(v => Math.max(0, v - 1))
      }
    }
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 16, overflow: (showMenu || showPrayMenu) ? 'visible' : 'hidden',
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 14px 10px', alignItems: 'flex-start' }}>
        <Avatar profile={profile} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {profile?.full_name || profile?.username || 'Anonym'}
            </span>
            {cat && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
              }}>
                {cat.emoji} {cat.label}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
              {timeAgo(request.created_at)}
            </span>
          </div>
          {request.title && (
            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              {request.title}
            </p>
          )}
        </div>
      </div>

      {/* Gebetsanliegen */}
      {request.description && (
        <p style={{ margin: '0 14px 12px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {request.description}
        </p>
      )}

      {/* Gebetsziel (nur wenn ein Ziel verknüpft ist) */}
      {goal && (
        <div
          onClick={() => onOpenGoal?.(goal)}
          style={{ margin: '0 14px 12px', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', cursor: onOpenGoal ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCustomGoal ? 0 : 8 }}>
            <span style={{ fontSize: 15 }}>{goal.icon || '🎯'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{goalTypeLabel}</span>
            {!isCustomGoal && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                🙏 {goalCount} dabei
              </span>
            )}
          </div>
          {isCustomGoal ? (
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{goal.title}</p>
          ) : (
            <ProgressBar value={goalCurrent} target={Number(goal.target_value)} color={goal.color || 'var(--color-accent)'} unitLabel={goalUnit} />
          )}
        </div>
      )}

      {/* Aktionen */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}>
        {/* Gebetet-Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPrayMenu(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999,
              border: `1.5px solid ${hasPrayed ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: hasPrayed ? 'var(--color-accent)' : 'var(--color-bg)',
              color: hasPrayed ? '#fff' : 'var(--color-text-secondary)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            🙏 Gebetet{prayCount > 0 ? ` · ${prayCount}` : ''}
            <ChevronDown size={13} />
          </button>
          {showPrayMenu && (
            <>
              <div onClick={() => setShowPrayMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div style={{
                position: 'absolute', left: 0, bottom: '100%', marginBottom: 6,
                backgroundColor: 'var(--color-bg-secondary)', borderRadius: 12,
                boxShadow: '0 8px 28px rgba(0,0,0,0.35)', border: '1px solid var(--color-border)',
                zIndex: 20, minWidth: 210, overflow: 'hidden',
              }}>
                <button onClick={handlePrayed} style={menuItemStyle}>
                  🙏 Gebetet
                </button>
                <button onClick={() => { setShowPrayMenu(false); onBookmark?.(request) }} style={{ ...menuItemStyle, borderTop: '1px solid var(--color-border)' }}>
                  <BookmarkPlus size={15} /> Zur Gebetsliste hinzufügen
                </button>
                <button onClick={() => { setShowPrayMenu(false); onLaterPray?.(request) }} style={{ ...menuItemStyle, borderTop: '1px solid var(--color-border)' }}>
                  ⏰ Später beten
                </button>
              </div>
            </>
          )}
        </div>

        {/* Kommentare */}
        <button
          onClick={() => { setShowComments(v => !v); setShowCommentInput(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 999,
            border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
            color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <MessageCircle size={14} />
          Kommentar{notes?.length > 0 ? ` · ${notes.length}` : ''}
          {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* 3-Punkte-Menü: Merken / Weiterleiten / Löschen */}
        <div style={{ marginLeft: 'auto', position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowMenu(v => !v)}
            aria-label="Weitere Optionen"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
              color: 'var(--color-text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div style={{
                position: 'absolute', right: 0, bottom: '100%', marginBottom: 6,
                backgroundColor: 'var(--color-bg-secondary)', borderRadius: 12,
                boxShadow: '0 8px 28px rgba(0,0,0,0.35)', border: '1px solid var(--color-border)',
                zIndex: 20, minWidth: 190, overflow: 'hidden',
              }}>
                <button
                  onClick={() => { setShowMenu(false); onBookmark?.(request) }}
                  style={menuItemStyle}
                >
                  <BookmarkPlus size={15} /> Zu Liste hinzufügen
                </button>
                <button
                  onClick={() => { setShowMenu(false); onForward?.(request) }}
                  style={{ ...menuItemStyle, borderTop: '1px solid var(--color-border)' }}
                >
                  <Forward size={15} /> Weiterleiten
                </button>
                {isOwner && (
                  <button
                    onClick={() => { setShowMenu(false); onDelete?.(request) }}
                    style={{ ...menuItemStyle, borderTop: '1px solid var(--color-border)', color: 'var(--color-danger, #d23f3f)' }}
                  >
                    <Trash2 size={15} /> Löschen
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Kommentar-Bereich */}
      {showComments && (
        <div>
          {(notes || []).length > 0 && (
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: 8 }}>
                  <Avatar profile={n.profiles} size={28} />
                  <div style={{
                    flex: 1, backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 10, padding: '8px 10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                        {n.profiles?.full_name || n.profiles?.username || 'Du'}
                      </span>
                      {!n.is_public && (
                        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '1px 5px' }}>
                          nur Ersteller
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {n.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showCommentInput && (
            <CommentInput onSubmit={(text, isPublic) => onComment(request.id, text, isPublic)} />
          )}
        </div>
      )}
    </div>
  )
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
  const { requests, logsMap, notesMap, loading, hasMore, loadMore, reload, logPrayer, addNote, deleteRequest } = usePrayerFeed('all', statusFilter)
  const { createRequest } = usePersonalPrayer()
  const { createGoal, deleteGoal, publicGoals, myGoals, communityGoals, sharedGoals } = usePrayerGoals()
  const { lists, createList } = usePrayerLists()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeCategories, setActiveCategories] = useState([])
  const [dateFilter, setDateFilter] = useState(EMPTY_DATE_FILTER)
  const loaderRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [highlightId, setHighlightId] = useState(null)

  // Gebetsmodus / Bookmark / Weiterleiten / Gebetsziel
  const [showPrayerModeSetup, setShowPrayerModeSetup] = useState(false)
  const [prayerModeItems, setPrayerModeItems] = useState(null)
  const [bookmarkRequest, setBookmarkRequest] = useState(null)
  const [forwardRequest, setForwardRequest] = useState(null)

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
  const filteredRequests = requests.filter(r => {
    if (activeCategories.length > 0 && !activeCategories.includes(r.category)) return false
    if (!matchesDateFilter(r.created_at, dateFilter)) return false
    if (!q) return true
    const haystack = [
      r.title || '',
      r.description || '',
      r.profiles?.full_name || '',
      r.profiles?.username || '',
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
  // Sichtbare Gebetsziele (dedupliziert) – sollen ebenfalls im Gebete-Feed
  // erscheinen, auch Gebete mit Gebetsziel.
  const allGoals = (() => {
    const byId = new Map()
    for (const g of [...publicGoals, ...sharedGoals, ...communityGoals, ...myGoals]) {
      if (g && !byId.has(g.id)) byId.set(g.id, g)
    }
    return [...byId.values()]
  })()
  // Ziel je verknüpftem persönlichen Anliegen – so wird ein Gebet MIT Ziel als
  // ganz normale Gebets-Karte gezeigt, nur mit zusätzlichem Fortschritt.
  const goalByReqId = new Map(allGoals.filter(g => g.personal_prayer_request_id).map(g => [g.personal_prayer_request_id, g]))
  const shownReqIds = new Set(filteredRequests.map(r => r.id))

  const filteredGoals = allGoals.filter(g => {
    if (statusFilter === 'answered') return false        // Ziele haben keinen "erhört"-Status
    if (activeCategories.length > 0) return false         // Ziele haben keine Kategorie
    if (!matchesDateFilter(g.created_at, dateFilter)) return false
    if (!q) return true
    return [g.title || '', g.description || ''].join(' ').toLowerCase().includes(q)
  })

  // Ziele, deren Anliegen NICHT (oder noch nicht) im Feed steckt, als eigene
  // Karte synthetisieren – damit jedes Ziel als Gebets-Karte erscheint.
  const syntheticGoalEntries = filteredGoals
    .filter(g => !g.personal_prayer_request_id || !shownReqIds.has(g.personal_prayer_request_id))
    .map(g => ({
      id: 'g-' + g.id,
      created_at: g.created_at,
      goal: g,
      request: {
        id: g.personal_prayer_request_id || g.id,
        title: g.title,
        description: g.description,
        category: null,
        created_at: g.created_at,
        owner_id: g.created_by,
        is_public: true,
        profiles: g.profiles || null,
      },
    }))

  const feedEntries = [
    ...filteredRequests.map(r => ({ id: 'r-' + r.id, created_at: r.created_at, request: r, goal: goalByReqId.get(r.id) || null })),
    ...syntheticGoalEntries,
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

  // Count of non-default filter facets (status counts when not the default "open")
  const filterFacetCount = activeCategories.length + (dateActive ? 1 : 0) + (statusFilter !== 'open' ? 1 : 0)
  const hasActiveFilter = filterFacetCount > 0 || q.length > 0

  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [loadMore])

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
  }, [focusId, loading, feedEntries.length])

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

  async function handleComment(requestId, text, isPublic) {
    try {
      await addNote(requestId, text, isPublic)
    } catch {
      showToast('Fehler beim Kommentieren', 'error')
    }
  }

  // Löschen kennt sowohl reine Anliegen als auch Gebete mit Ziel.
  async function handleDeleteEntry(entry) {
    if (!window.confirm('Dieses Gebet wirklich löschen?')) return
    try {
      if (entry.goal) {
        await deleteGoal(entry.goal.id)   // löscht Ziel + verknüpftes Anliegen
        reload()
      } else {
        await deleteRequest(entry.request.id)
      }
      showToast('Gebet gelöscht')
    } catch {
      showToast('Fehler beim Löschen', 'error')
    }
  }

  // "Später beten": Anliegen in die Standard-Liste legen (legt sie bei Bedarf an).
  async function handleLaterPray(request) {
    try {
      let list = lists.find(l => (l.name || '').toLowerCase() === LATER_LIST_NAME.toLowerCase())
      if (!list) {
        // DB prüfen, um Doppel-Anlage der Standard-Liste zu vermeiden.
        const { data: existingList } = await supabase
          .from('prayer_lists').select('*').eq('user_id', user.id).ilike('name', LATER_LIST_NAME).maybeSingle()
        list = existingList || await createList({ name: LATER_LIST_NAME, icon: '⏰' })
      }
      const idColumn = request.person_id ? 'prayer_request_id' : 'personal_prayer_request_id'
      const { data: existing } = await supabase
        .from('prayer_list_items').select('id').eq('list_id', list.id).eq(idColumn, request.id).maybeSingle()
      if (existing) { showToast(`Schon in „${LATER_LIST_NAME}"`); return }
      const { error } = await supabase.from('prayer_list_items').insert({ list_id: list.id, [idColumn]: request.id })
      if (error) throw error
      showToast(`Zu „${LATER_LIST_NAME}" hinzugefügt ✓`)
    } catch {
      showToast('Fehler beim Hinzufügen', 'error')
    }
  }

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full" style={{ position: 'relative' }}>
      <PrayerFeedSwitcher active="prayers" />

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

      {/* Search + filter */}
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

      <div style={{ padding: '14px 16px 0' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 140, borderRadius: 16, backgroundColor: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>🙏</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
              Noch keine Gebete
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Sei der Erste, der ein Anliegen teilt.
            </p>
          </div>
        )}

        {!loading && feedEntries.length === 0 && hasActiveFilter && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontSize: 28, margin: '0 0 10px' }}>🔍</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
              Keine Gebete gefunden. Versuche andere Filter.
            </p>
          </div>
        )}

        {!loading && feedEntries.map(entry => (
          <div
            key={entry.id}
            id={'prayer-' + entry.request.id}
            style={{
              borderRadius: 16,
              scrollMarginTop: 80,
              transition: 'box-shadow 0.3s ease',
              boxShadow: String(entry.request.id) === String(highlightId) ? '0 0 0 3px var(--color-accent)' : 'none',
            }}
          >
            <PrayerCard
              request={entry.request}
              logs={logsMap[entry.request.id]}
              notes={notesMap[entry.request.id]}
              onPray={logPrayer}
              onComment={handleComment}
              onBookmark={setBookmarkRequest}
              onForward={setForwardRequest}
              onDelete={() => handleDeleteEntry(entry)}
              onLaterPray={handleLaterPray}
              goal={entry.goal}
              onOpenGoal={(g) => navigate(`/goals/${g.id}`)}
            />
          </div>
        ))}

        {!loading && hasMore && <div ref={loaderRef} style={{ height: 40 }} />}
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


      {/* Zu Liste hinzufügen */}
      {bookmarkRequest && (
        <AddToListSheet
          request={bookmarkRequest}
          onClose={() => setBookmarkRequest(null)}
        />
      )}

      {/* Weiterleiten */}
      {forwardRequest && (
        <ForwardSheet
          previewTitle={forwardRequest.title}
          buildMessage={() => ({
            type: 'prayer_request',
            text: forwardRequest.title || 'Gebetsanliegen',
            bible_verse_text: forwardRequest.description || null,
            [forwardRequest.person_id ? 'prayer_request_id' : 'personal_prayer_request_id']: forwardRequest.id,
          })}
          onClose={() => setForwardRequest(null)}
        />
      )}
    </div>
  )
}
