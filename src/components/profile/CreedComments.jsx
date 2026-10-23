import { useState, useEffect } from 'react'
import { Send, Trash2, MoreHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { timeAgo } from '../../lib/prayerModel'
import ModerationSheet from '../common/ModerationSheet'

const COMMENT_SELECT = 'id, author_id, body, created_at, profiles:author_id(id, full_name, username, avatar_url)'

function Avatar({ profile }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 10, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  )
}

// Kommentare unter einem Bekenntnis (wie die Antworten im Feed). Lädt erst,
// wenn der Bereich aufgeklappt wird; onCountChange hält den Zähler der Zeile aktuell.
export default function CreedComments({ creedId, onCountChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [moderation, setModeration] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('creed_comments').select(COMMENT_SELECT).eq('creed_id', creedId).order('created_at')
      .then(({ data }) => {
        if (cancelled) return
        setComments(data || [])
        onCountChange?.((data || []).length)
      })
    return () => { cancelled = true }
  }, [creedId])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const { data, error } = await supabase
      .from('creed_comments')
      .insert({ creed_id: creedId, author_id: user.id, body })
      .select(COMMENT_SELECT)
      .single()
    if (!error && data) {
      const next = [...(comments || []), data]
      setComments(next)
      onCountChange?.(next.length)
      setDraft('')
    }
    setSending(false)
  }

  async function remove(id) {
    const next = (comments || []).filter(c => c.id !== id)
    setComments(next)
    onCountChange?.(next.length)
    await supabase.from('creed_comments').delete().eq('id', id)
  }

  return (
    <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
      {!comments && <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
      {comments?.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Noch keine Kommentare.</p>
      )}
      {comments?.map(c => {
        const name = c.profiles?.full_name || c.profiles?.username || 'Geschwister'
        const own = c.author_id === user?.id
        return (
          <div key={c.id} className="flex gap-2 mb-3">
            <Avatar profile={c.profiles} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>{name}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{timeAgo(c.created_at)}</span>
                <span className="flex-1" />
                {own ? (
                  <button onClick={() => remove(c.id)} aria-label="Kommentar löschen" className="p-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <button onClick={() => setModeration(c)} aria-label="Melden oder blockieren" className="p-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    <MoreHorizontal size={14} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</p>
            </div>
          </div>
        )
      })}

      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Kommentar schreiben…"
          rows={1}
          maxLength={2000}
          className="flex-1 outline-none"
          style={{
            resize: 'none', border: '1px solid var(--color-border)', borderRadius: 18, padding: '8px 12px',
            fontSize: 13.5, lineHeight: 1.4, backgroundColor: 'var(--color-bg)', color: 'var(--color-text)',
          }}
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          aria-label="Senden"
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', color: '#fff',
            backgroundColor: draft.trim() ? 'var(--color-accent)' : 'var(--color-border)',
          }}
        >
          <Send size={15} />
        </button>
      </div>

      {moderation && (
        <ModerationSheet
          contentType="creed_comment"
          contentId={moderation.id}
          authorId={moderation.author_id}
          authorName={moderation.profiles?.full_name || moderation.profiles?.username}
          onClose={() => setModeration(null)}
          onBlocked={() => setComments(prev => (prev || []).filter(c => c.author_id !== moderation.author_id))}
        />
      )}
    </div>
  )
}
