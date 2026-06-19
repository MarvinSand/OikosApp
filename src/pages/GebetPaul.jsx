import { useState, useRef, useEffect } from 'react'
import { Globe, UserCheck, Home as HomeIcon, Users, X, ChevronDown, Send, MessageCircle, ChevronUp, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PrayerFeedSwitcher from '../components/layout/PrayerFeedSwitcher'
import { usePrayerFeed } from '../hooks/usePrayerFeed'
import { usePersonalPrayer } from '../hooks/usePersonalPrayer'
import { useAuth } from '../hooks/useAuth'
import { useCommunities } from '../hooks/useCommunities'
import { useToast } from '../context/ToastContext'

// ─── Konstanten ───────────────────────────────────────────────

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

function PrayerCard({ request, logs, notes, onPray, onComment }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)

  const prayCount = (logs || []).length
  const hasPrayed = (logs || []).some(l => l.user_id === user?.id)
  const cat = CATEGORIES.find(c => c.key === request.category)
  const profile = request.profiles

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 16, overflow: 'hidden',
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

      {/* Aktionen */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}>
        {/* Ja-Button */}
        <button
          onClick={() => !hasPrayed && onPray(request.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 999,
            border: `1.5px solid ${hasPrayed ? 'var(--color-accent)' : 'var(--color-border)'}`,
            background: hasPrayed ? 'var(--color-accent)' : 'var(--color-bg)',
            color: hasPrayed ? '#fff' : 'var(--color-text-secondary)',
            fontSize: 13, fontWeight: 700, cursor: hasPrayed ? 'default' : 'pointer',
          }}
        >
          🙏 Ja{prayCount > 0 ? ` · ${prayCount}` : ''}
        </button>

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

// ─── Geschwister-Suche ────────────────────────────────────────

function SiblingPicker({ selected, onChange }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [siblings, setSiblings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')
      const ids = (friendships || []).map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', ids)
          .order('full_name')
        setSiblings(profiles || [])
      }
      setLoading(false)
    })()
  }, [user?.id])

  const filtered = siblings.filter(s => {
    const name = (s.full_name || s.username || '').toLowerCase()
    return name.includes(query.toLowerCase())
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: 10, backgroundColor: 'var(--color-bg)' }}>
        <Search size={14} color="var(--color-text-tertiary)" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Geschwister suchen…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--color-text)' }}
        />
      </div>
      {loading && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '16px 0' }}>Lade…</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(s => {
          const checked = selected.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => onChange(checked ? selected.filter(id => id !== s.id) : [...selected, s.id])}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                border: `1.5px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: checked ? 'var(--color-accent)10' : 'var(--color-bg)',
                cursor: 'pointer',
              }}
            >
              <Avatar profile={s} size={30} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                {s.full_name || s.username}
              </span>
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: checked ? 'var(--color-accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
            </button>
          )
        })}
        {!loading && filtered.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '16px 0' }}>Keine Geschwister gefunden</p>
        )}
      </div>
    </div>
  )
}

// ─── Neues Gebet erstellen ────────────────────────────────────

// steps: 1=visibility, 2=sub-selection (community/siblings), 3=category, 4=details
function CreatePrayerSheet({ onClose, onCreate }) {
  const { myCommunities } = useCommunities()
  const [step, setStep] = useState(1)
  const [visibility, setVisibility] = useState(null)
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [selectedSiblings, setSelectedSiblings] = useState([])
  const [category, setCategory] = useState(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalSteps = (visibility === 'community' || visibility === 'specific') ? 4 : 3
  const stepDisplay = step <= 1 ? 1 : (visibility === 'community' || visibility === 'specific') ? step : step - 1

  function goToSubSelection(vis) {
    setVisibility(vis)
    if (vis === 'community' || vis === 'specific') {
      setStep(2)
    } else {
      setStep(3)
    }
  }

  function backFromSub() {
    setStep(1)
    setSelectedCommunity(null)
    setSelectedSiblings([])
  }

  async function handleSubmit() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await onCreate({
        title: title.trim() || (CATEGORIES.find(c => c.key === category)?.label || ''),
        description: text.trim(),
        visibility: visibility === 'specific' ? 'siblings' : (visibility || 'public'),
        category,
        visibility_community_id: visibility === 'community' ? selectedCommunity : null,
        visibility_user_ids: visibility === 'specific' ? selectedSiblings : [],
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = text.trim().length > 0 && !submitting &&
    (visibility !== 'community' || selectedCommunity) &&
    (visibility !== 'specific' || selectedSiblings.length > 0)

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>
            Neues Gebet
          </p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--color-bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Schritt-Indikator */}
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 16px' }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: stepDisplay > i ? 'var(--color-accent)' : 'var(--color-border)' }} />
          ))}
        </div>

        {/* Schritt 1: Sichtbarkeit */}
        {step === 1 && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              Wer soll dieses Gebet sehen?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {VISIBILITY_OPTIONS.map(o => {
                const Icon = o.icon
                return (
                  <button
                    key={o.key}
                    onClick={() => goToSubSelection(o.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 14,
                      border: `1.5px solid ${visibility === o.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: visibility === o.key ? 'var(--color-accent)10' : 'var(--color-bg)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <Icon size={18} color={visibility === o.key ? 'var(--color-accent)' : 'var(--color-text-secondary)'} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: visibility === o.key ? 'var(--color-accent)' : 'var(--color-text)' }}>
                      {o.label}
                    </span>
                    {(o.key === 'community' || o.key === 'specific') && (
                      <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>›</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Schritt 2a: Community auswählen */}
        {step === 2 && visibility === 'community' && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              Welche Community?
            </p>
            {myCommunities.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '24px 0' }}>
                Du bist noch in keiner Community.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myCommunities.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCommunity(c.id); setStep(3) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 14,
                      border: `1.5px solid ${selectedCommunity === c.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: selectedCommunity === c.id ? 'var(--color-accent)10' : 'var(--color-bg)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{c.icon || '🏠'}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={backFromSub} style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Zurück
            </button>
          </div>
        )}

        {/* Schritt 2b: Geschwister auswählen */}
        {step === 2 && visibility === 'specific' && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              Welche Geschwister?
            </p>
            <SiblingPicker selected={selectedSiblings} onChange={setSelectedSiblings} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={backFromSub} style={{ fontSize: 13, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Zurück
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedSiblings.length === 0}
                style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                  background: selectedSiblings.length > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: selectedSiblings.length > 0 ? 'pointer' : 'default',
                }}
              >
                Weiter ({selectedSiblings.length} ausgewählt)
              </button>
            </div>
          </div>
        )}

        {/* Schritt 3: Kategorie */}
        {step === 3 && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              Worum geht es?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => { setCategory(c.key); setStep(4) }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '16px 12px', borderRadius: 14,
                    border: `1.5px solid ${category === c.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: category === c.key ? 'var(--color-accent)10' : 'var(--color-bg)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{c.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: category === c.key ? 'var(--color-accent)' : 'var(--color-text)' }}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(visibility === 'community' || visibility === 'specific' ? 2 : 1)} style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Zurück
            </button>
          </div>
        )}

        {/* Schritt 4: Titel & Text */}
        {step === 4 && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              Dein Gebetsanliegen
            </p>

            {/* Überschrift */}
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`Überschrift (z. B. ${CATEGORIES.find(c => c.key === category)?.label || 'Gebet'})`}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)', outline: 'none', marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />

            {/* Freitext */}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Schreibe dein Anliegen…"
              rows={5}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)', outline: 'none', lineHeight: 1.6,
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setStep(3)} style={{ fontSize: 13, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Zurück
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                  background: canSubmit ? 'var(--color-accent)' : 'var(--color-border)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: canSubmit ? 'pointer' : 'default',
                }}
              >
                {submitting ? 'Wird geteilt…' : 'Gebet teilen 🙏'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Haupt-Seite ──────────────────────────────────────────────

export default function GebetPaul() {
  const { showToast } = useToast()
  const { requests, logsMap, notesMap, loading, hasMore, loadMore, reload, logPrayer, addNote } = usePrayerFeed('all')
  const { createRequest } = usePersonalPrayer()
  const [showCreate, setShowCreate] = useState(false)
  const loaderRef = useRef(null)

  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [loadMore])

  async function handleCreate({ title, description, visibility, category, visibility_community_id }) {
    try {
      await createRequest({ title, description, visibility, visibility_community_id })
      showToast('Gebet geteilt 🙏')
      reload()
    } catch {
      showToast('Fehler beim Teilen', 'error')
    }
  }

  async function handleComment(requestId, text, isPublic) {
    try {
      await addNote(requestId, text, isPublic)
    } catch {
      showToast('Fehler beim Kommentieren', 'error')
    }
  }

  return (
    <div className="bg-bg min-h-full pb-24 md:pb-10 md:max-w-2xl md:mx-auto md:w-full" style={{ position: 'relative' }}>
      <PrayerFeedSwitcher active="gebet-paul" />

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

        {!loading && requests.map(req => (
          <PrayerCard
            key={req.id}
            request={req}
            logs={logsMap[req.id]}
            notes={notesMap[req.id]}
            onPray={logPrayer}
            onComment={handleComment}
          />
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
        />
      )}
    </div>
  )
}
