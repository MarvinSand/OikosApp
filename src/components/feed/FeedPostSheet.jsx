import { useState, useRef, useEffect } from 'react'
import { X, Globe, Users, UserCheck, Search, Image, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useCommunities } from '../../hooks/useCommunities'
import { supabase } from '../../lib/supabase'
import BibleReferenceChip from '../bible/BibleReferenceChip'
import VersePickerSheet from '../bible/VersePickerSheet'

export const FEED_CATEGORIES = [
  { key: 'bibelstelle', label: 'Bibelstelle', emoji: '📖' },
  { key: 'zeugnis',     label: 'Zeugnis',     emoji: '🙌' },
  { key: 'frage',       label: 'Frage',       emoji: '❓' },
  { key: 'meilenstein', label: 'Meilenstein', emoji: '🏔' },
  { key: 'ermutigung',  label: 'Ermutigung',  emoji: '💛' },
  { key: 'sonstiges',   label: 'Sonstiges',   emoji: '💬' },
]

const FEED_VISIBILITY = [
  { key: 'public',           label: 'Öffentlich',              icon: Globe,      sub: null },
  { key: 'communities',      label: 'Community',               icon: Users,      sub: 'community' },
  { key: 'siblings',         label: 'Meine Geschwister',       icon: UserCheck,  sub: null },
  { key: 'specific_include', label: 'Ausgewählte Geschwister', icon: Users,      sub: 'siblings' },
]

function SiblingPickerFeed({ selected, onChange }) {
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
          .from('profiles').select('id, username, full_name, avatar_url').in('id', ids).order('full_name')
        setSiblings(profiles || [])
      }
      setLoading(false)
    })()
  }, [user?.id])

  const filtered = siblings.filter(s =>
    (s.full_name || s.username || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: 10, backgroundColor: 'var(--color-bg)' }}>
        <Search size={14} color="var(--color-text-tertiary)" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Geschwister suchen…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--color-text)' }} />
      </div>
      {loading && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '12px 0' }}>Lade…</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
        {filtered.map(s => {
          const checked = selected.includes(s.id)
          const name = s.full_name || s.username || '?'
          const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
          return (
            <button key={s.id} onClick={() => onChange(checked ? selected.filter(id => id !== s.id) : [...selected, s.id])}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textAlign: 'left', border: `1.5px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`, background: checked ? 'var(--color-accent)10' : 'var(--color-bg)', cursor: 'pointer' }}
            >
              {s.avatar_url
                ? <img src={s.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{initials}</div>
              }
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{name}</span>
              <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`, background: checked ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
            </button>
          )
        })}
        {!loading && filtered.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '12px 0' }}>Keine gefunden</p>}
      </div>
    </div>
  )
}

// Style-Helfer – analog zum Gebete-Erstellen-Flow (CreatePrayerSheet)
const fSecTitle = { margin: '20px 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.4px' }
const fField = { width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box', display: 'block' }
function fChip(active) {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '12px 6px', borderRadius: 12, cursor: 'pointer',
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
    color: active ? 'var(--color-accent)' : 'var(--color-text)',
  }
}
function fRow(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14,
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  }
}
function fPrimaryBtn(enabled) {
  return {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: enabled ? 'var(--color-accent)' : 'var(--color-border)',
    color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: enabled ? 'pointer' : 'default',
  }
}
function FeedSummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 2px', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function FeedPostSheet({
  onClose, onSubmit,
  initialBody = '', initialTitle = '', initialCategory = null, initialVerse = null,
}) {
  const { myCommunities } = useCommunities()
  const [phase, setPhase] = useState('form') // 'form' | 'review'
  const [visibility, setVisibility] = useState('public')
  const [communityIds, setCommunityIds] = useState([])
  const [visibilityUserIds, setVisibilityUserIds] = useState([])
  const [category, setCategory] = useState(initialCategory)
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [verse, setVerse] = useState(initialVerse)
  const [quoteVerse, setQuoteVerse] = useState(true)
  const [showVersePicker, setShowVersePicker] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const catObj = FEED_CATEGORIES.find(c => c.key === category)
  const visObj = FEED_VISIBILITY.find(o => o.key === visibility)
  const visOk =
    (visibility !== 'communities' || communityIds.length > 0) &&
    (visibility !== 'specific_include' || visibilityUserIds.length > 0)
  const formValid = body.trim().length > 0 && !!category && visOk

  async function handleSubmit() {
    if (!formValid || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim() || null,
        body: body.trim(),
        category,
        visibilityMode: visibility || 'public',
        communityIds,
        visibilityUserIds,
        excludedUserIds: [],
        photoFile,
        bibleVerseRef: verse ? { ...verse, verseText: quoteVerse ? verse.verseText : null } : null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 448, margin: '0 auto', backgroundColor: 'var(--color-bg)', borderRadius: '20px 20px 0 0', maxHeight: '92dvh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', position: 'sticky', top: 0, backgroundColor: 'var(--color-bg)', zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>
            {phase === 'review' ? 'Übersicht' : 'Neuer Beitrag'}
          </p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--color-bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {phase === 'form' ? (
          <div style={{ padding: '0 16px 28px' }}>
            {/* 1) Dein Beitrag */}
            <p style={fSecTitle}>1 · Dein Beitrag</p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Überschrift (optional)"
              style={{ ...fField, fontWeight: 600, marginBottom: 8 }}
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 1000))}
              placeholder="Was möchtest du teilen?"
              rows={4}
              style={{ ...fField, lineHeight: 1.6, resize: 'vertical' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: body.length > 900 ? 'var(--color-error)' : 'var(--color-text-tertiary)', textAlign: 'right' }}>{body.length}/1000</p>

            {/* Bild-Vorschau */}
            {photoPreview && (
              <div style={{ position: 'relative', marginTop: 10 }}>
                <img src={photoPreview} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                <button onClick={() => setPhotoFile(null)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            )}
            <button onClick={() => fileRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px dashed var(--color-border)', background: 'var(--color-bg-secondary)', cursor: 'pointer', marginTop: 10, width: '100%' }}
            >
              <Image size={16} color="var(--color-text-secondary)" />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {photoFile ? photoFile.name : 'Bild oder Video hinzufügen'}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={e => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); e.target.value = '' }} style={{ display: 'none' }} />

            {/* Bibelstelle verknüpfen */}
            {verse ? (
              <div style={{ marginTop: 10 }}>
                <BibleReferenceChip attachment={verse} variant="block" showVerse={quoteVerse} onRemove={() => setVerse(null)} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  <input type="checkbox" checked={quoteVerse} onChange={e => setQuoteVerse(e.target.checked)} style={{ accentColor: 'var(--color-accent)' }} />
                  Vers im Beitrag zitieren
                </label>
              </div>
            ) : (
              <button onClick={() => setShowVersePicker(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px dashed var(--color-border)', background: 'var(--color-bg-secondary)', cursor: 'pointer', marginTop: 10, width: '100%' }}
              >
                <span style={{ fontSize: 16 }}>📖</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Bibelstelle verknüpfen</span>
              </button>
            )}

            {/* 2) Kategorie */}
            <p style={fSecTitle}>2 · Kategorie</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {FEED_CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCategory(category === c.key ? null : c.key)} style={fChip(category === c.key)}>
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span>
                </button>
              ))}
            </div>

            {/* 3) Sichtbarkeit */}
            <p style={fSecTitle}>3 · Wer soll es sehen?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FEED_VISIBILITY.map(o => {
                const Icon = o.icon
                const active = visibility === o.key
                return (
                  <button key={o.key} onClick={() => setVisibility(o.key)} style={fRow(active)}>
                    <Icon size={18} color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>{o.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Community-Auswahl (inline) */}
            {visibility === 'communities' && (
              myCommunities.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic', margin: '8px 0 0' }}>Du bist noch in keiner Community.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {myCommunities.map(c => {
                    const checked = communityIds.includes(c.id)
                    return (
                      <button key={c.id} onClick={() => setCommunityIds(checked ? communityIds.filter(x => x !== c.id) : [...communityIds, c.id])} style={fRow(checked)}>
                        <span style={{ fontSize: 20 }}>{c.icon || '🏠'}</span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</span>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`, background: checked ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            )}

            {/* Geschwister-Auswahl (inline) */}
            {visibility === 'specific_include' && (
              <div style={{ marginTop: 8 }}>
                <SiblingPickerFeed selected={visibilityUserIds} onChange={setVisibilityUserIds} />
              </div>
            )}

            <button
              onClick={() => setPhase('review')}
              disabled={!formValid}
              style={{ ...fPrimaryBtn(formValid), marginTop: 22 }}
            >
              Weiter zur Übersicht
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 16px 28px' }}>
            {/* Übersicht */}
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              {title.trim() && <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{title.trim()}</p>}
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{body.trim()}</p>
              {photoPreview && <img src={photoPreview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginTop: 10, display: 'block' }} />}
            </div>
            <FeedSummaryRow label="Kategorie" value={catObj ? `${catObj.emoji} ${catObj.label}` : '—'} />
            <FeedSummaryRow label="Bibelstelle" value={verse ? verse.referenceLabel : '—'} />
            <FeedSummaryRow label="Sichtbarkeit" value={
              visibility === 'communities'
                ? `${visObj?.label} · ${communityIds.length} ausgewählt`
                : visibility === 'specific_include'
                ? `${visObj?.label} · ${visibilityUserIds.length} ausgewählt`
                : (visObj?.label || '')
            } />

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setPhase('form')} disabled={submitting} style={{ padding: '13px 18px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer' }}>
                ← Zurück
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{ ...fPrimaryBtn(!submitting), flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {submitting ? 'Wird geteilt…' : 'Beitrag teilen'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showVersePicker && (
        <VersePickerSheet
          onClose={() => setShowVersePicker(false)}
          onSelect={(att) => { setVerse(att); setShowVersePicker(false) }}
        />
      )}
    </div>
  )
}
