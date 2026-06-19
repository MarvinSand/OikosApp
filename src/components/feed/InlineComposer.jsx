import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Image as ImageIcon, X, ChevronDown, Globe, Users, Home as HomeIcon,
  UserCheck, Loader2, Tag, Check, Search,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useFriendships } from '../../hooks/useFriendships'
import { useCommunities } from '../../hooks/useCommunities'
import { supabase } from '../../lib/supabase'

const CATEGORIES = [
  { key: 'bibelstelle', label: 'Bibelstelle', emoji: '📖' },
  { key: 'zeugnis',     label: 'Zeugnis',     emoji: '🙌' },
  { key: 'frage',       label: 'Frage',       emoji: '❓' },
  { key: 'meilenstein', label: 'Meilenstein', emoji: '🏔' },
  { key: 'ermutigung',  label: 'Ermutigung',  emoji: '💛' },
  { key: 'sonstiges',   label: 'Sonstiges',   emoji: '💬' },
]

const VISIBILITY_OPTIONS = [
  { key: 'public',           label: 'Für alle App Nutzer',    icon: Globe },
  { key: 'siblings',         label: 'Nur verbundene Geschwister', icon: UserCheck },
  { key: 'communities',      label: 'Communities',            icon: HomeIcon },
  { key: 'specific_include', label: 'Nur bestimmte Geschwister', icon: Users },
]

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ profile, size = 40 }) {
  const name = profile?.full_name || profile?.username || '?'
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }}
      />
    )
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700,
        border: '1px solid var(--color-border)',
      }}
    >
      {getInitials(name)}
    </div>
  )
}

// ─── User picker (search + multi-select) ──────────────────────
function UserPicker({ title, selected, onChange, onClose }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_christian')
        .neq('id', user.id)
        .order('full_name')
        .limit(200)
      setAllUsers(data || [])
      setLoading(false)
    })()
  }, [user.id])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allUsers
    return allUsers.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    )
  }, [query, allUsers])

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, backgroundColor: 'var(--color-bg)',
          borderRadius: '16px 16px 0 0', zIndex: 70,
          padding: '14px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '80vh', overflowY: 'auto',
          animation: 'sheetSlideUp 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--color-bg-secondary)', marginBottom: 10 }}>
          <Search size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Suchen…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--color-text)' }}
          />
        </div>
        {loading && <p style={{ padding: 12, color: 'var(--color-text-tertiary)', fontSize: 13 }}>Lade…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-text-tertiary)', fontSize: 13, textAlign: 'center' }}>Keine Treffer</p>
        )}
        {!loading && filtered.map(u => {
          const isSel = selected.includes(u.id)
          return (
            <button
              key={u.id}
              onClick={() => toggle(u.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '10px 12px', borderRadius: 10,
                border: 'none', background: isSel ? 'var(--color-accent-light)' : 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <Avatar profile={u} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.full_name || u.username || '—'}
                </p>
                {u.username && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>@{u.username}</p>
                )}
              </div>
              {isSel && <Check size={18} style={{ color: 'var(--color-accent-dark)' }} />}
            </button>
          )
        })}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 999, border: 'none',
              backgroundColor: 'var(--color-accent)', color: 'white',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Fertig{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Visibility menu ──────────────────────────────────────────
function VisibilityMenu({ value, onChange, communityIds, onCommunityIdsChange, onOpenSpecificPicker, onClose }) {
  const { myCommunities } = useCommunities()

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, backgroundColor: 'var(--color-bg)',
          borderRadius: '16px 16px 0 0', zIndex: 70,
          padding: '14px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
          animation: 'sheetSlideUp 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Wer kann das sehen?</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
            <X size={18} />
          </button>
        </div>

        {VISIBILITY_OPTIONS.map(opt => {
          const isSel = value === opt.key
          const Icon = opt.icon
          return (
            <div key={opt.key}>
              <button
                onClick={() => {
                  onChange(opt.key)
                  if (opt.key === 'specific_include') {
                    onOpenSpecificPicker()
                  }
                  if (opt.key !== 'communities') onClose()
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '14px 12px', borderRadius: 12,
                  border: 'none', background: isSel ? 'var(--color-accent-light)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <Icon size={20} style={{ color: isSel ? 'var(--color-accent-dark)' : 'var(--color-text)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: isSel ? 600 : 500, color: 'var(--color-text)' }}>
                  {opt.label}
                </span>
                {isSel && <Check size={18} style={{ color: 'var(--color-accent-dark)' }} />}
              </button>

              {opt.key === 'communities' && isSel && (
                <div style={{ padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {myCommunities.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Du bist in keiner Community.</p>
                  )}
                  {myCommunities.map(c => {
                    const checked = communityIds.includes(c.id)
                    return (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onCommunityIdsChange(
                            checked ? communityIds.filter(x => x !== c.id) : [...communityIds, c.id]
                          )}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{c.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {value === 'communities' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: 999, border: 'none',
                backgroundColor: 'var(--color-accent)', color: 'white',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Fertig
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Category menu ────────────────────────────────────────────
function CategoryMenu({ value, onChange, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, backgroundColor: 'var(--color-bg)',
          borderRadius: '16px 16px 0 0', zIndex: 70,
          padding: '14px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
          animation: 'sheetSlideUp 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Kategorie wählen</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
            <X size={18} />
          </button>
        </div>
        {CATEGORIES.map(c => {
          const isSel = value === c.key
          return (
            <button
              key={c.key}
              onClick={() => { onChange(c.key); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '12px 10px', borderRadius: 12,
                border: 'none', background: isSel ? 'var(--color-accent-light)' : 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: isSel ? 600 : 500, color: 'var(--color-text)' }}>
                {c.label}
              </span>
              {isSel && <Check size={18} style={{ color: 'var(--color-accent-dark)' }} />}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── Main composer ────────────────────────────────────────────
export default function InlineComposer({ placeholder = "Was möchtest du teilen?", onSubmit, profile }) {
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(null)
  const [visibility, setVisibility] = useState('public')
  const [communityIds, setCommunityIds] = useState([])
  const [visibilityUserIds, setVisibilityUserIds] = useState([])
  const [excludedUserIds, setExcludedUserIds] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showVis, setShowVis] = useState(false)
  const [showCat, setShowCat] = useState(false)
  const [showSpecific, setShowSpecific] = useState(false)
  const [showExclude, setShowExclude] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  // Auto-grow the textarea
  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
  }, [body])

  const currentVis = VISIBILITY_OPTIONS.find(o => o.key === visibility)
  const VisIcon = currentVis?.icon || Globe
  const currentCat = CATEGORIES.find(c => c.key === category)

  const canPost =
    body.trim().length > 0 &&
    !!category &&
    !submitting &&
    (visibility !== 'communities' || communityIds.length > 0) &&
    (visibility !== 'specific_include' || visibilityUserIds.length > 0)

  async function handleSubmit() {
    if (!canPost) return
    setSubmitting(true)
    try {
      await onSubmit({
        body: body.trim(),
        category,
        visibilityMode: visibility,
        communityIds,
        visibilityUserIds,
        excludedUserIds,
        photoFile,
      })
      setBody('')
      setCategory(null)
      setVisibility('public')
      setCommunityIds([])
      setVisibilityUserIds([])
      setExcludedUserIds([])
      setPhotoFile(null)
    } finally {
      setSubmitting(false)
    }
  }

  function handlePhotoChange(e) {
    const f = e.target.files?.[0]
    if (f) setPhotoFile(f)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div
      style={{
        display: 'flex', gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <Avatar profile={profile || { avatar_url: user?.user_metadata?.avatar_url, full_name: user?.user_metadata?.full_name, username: user?.email }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Visibility pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowVis(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 999,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-accent)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <VisIcon size={14} /> {currentVis?.label}
            <ChevronDown size={14} />
          </button>

          {visibility !== 'specific_include' && (
            <button
              onClick={() => setShowExclude(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: excludedUserIds.length > 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Alle außer…{excludedUserIds.length > 0 ? ` (${excludedUserIds.length})` : ''}
            </button>
          )}
        </div>

        {/* Textarea (inline) */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value.slice(0, 1000))}
          placeholder={placeholder}
          rows={2}
          style={{
            width: '100%',
            border: 'none', outline: 'none',
            background: 'transparent',
            color: 'var(--color-text)',
            fontSize: 18,
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: 56,
            lineHeight: 1.4,
          }}
        />

        {/* Photo preview */}
        {photoPreview && (
          <div style={{ position: 'relative', marginTop: 8, marginBottom: 8 }}>
            <img
              src={photoPreview}
              alt=""
              style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
            <button
              onClick={() => setPhotoFile(null)}
              aria-label="Foto entfernen"
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Bottom toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, borderTop: '1px solid var(--color-border)', paddingTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Foto hinzufügen"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ImageIcon size={20} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => setShowCat(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999,
              border: `1px solid ${category ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: category ? 'var(--color-accent-light)' : 'var(--color-bg)',
              color: category ? 'var(--color-accent-dark)' : 'var(--color-text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Tag size={14} />
            {currentCat ? `${currentCat.emoji} ${currentCat.label}` : 'Kategorie wählen *'}
          </button>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 11, color: body.length > 900 ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
            {body.length}/1000
          </span>

          <button
            onClick={handleSubmit}
            disabled={!canPost}
            style={{
              padding: '8px 18px', borderRadius: 999, border: 'none',
              backgroundColor: canPost ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: canPost ? 'white' : 'var(--color-text-tertiary)',
              fontSize: 14, fontWeight: 700,
              cursor: canPost ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Post
          </button>
        </div>
      </div>

      {showVis && (
        <VisibilityMenu
          value={visibility}
          onChange={setVisibility}
          communityIds={communityIds}
          onCommunityIdsChange={setCommunityIds}
          onOpenSpecificPicker={() => setShowSpecific(true)}
          onClose={() => setShowVis(false)}
        />
      )}
      {showCat && (
        <CategoryMenu value={category} onChange={setCategory} onClose={() => setShowCat(false)} />
      )}
      {showSpecific && (
        <UserPicker
          title="Wer soll den Post sehen?"
          selected={visibilityUserIds}
          onChange={setVisibilityUserIds}
          onClose={() => setShowSpecific(false)}
        />
      )}
      {showExclude && (
        <UserPicker
          title="Wer soll den Post NICHT sehen?"
          selected={excludedUserIds}
          onChange={setExcludedUserIds}
          onClose={() => setShowExclude(false)}
        />
      )}
    </div>
  )
}
