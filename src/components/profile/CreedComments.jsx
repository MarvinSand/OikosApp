import { useState, useEffect } from 'react'
import { Send, Trash2, MoreHorizontal, Heart, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { timeAgo } from '../../lib/prayerModel'
import ModerationSheet from '../common/ModerationSheet'

const COMMENT_SELECT = 'id, creed_id, parent_id, author_id, body, created_at, profiles:author_id(id, full_name, username, avatar_url)'

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
  const [likes, setLikes] = useState([])
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [sending, setSending] = useState(false)
  const [moderation, setModeration] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('creed_comments').select(COMMENT_SELECT).eq('creed_id', creedId).order('created_at')
      if (cancelled) return
      const list = data || []
      setComments(list)
      onCountChange?.(list.length)
      if (list.length) {
        const { data: lk } = await supabase.from('creed_comment_likes').select('comment_id, user_id').in('comment_id', list.map(c => c.id))
        if (!cancelled) setLikes(lk || [])
      }
    })()
    return () => { cancelled = true }
  }, [creedId])

  function update(next) {
    setComments(next)
    onCountChange?.(next.length)
  }

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const { data, error } = await supabase
      .from('creed_comments')
      .insert({ creed_id: creedId, author_id: user.id, body, parent_id: replyTo?.rootId ?? null })
      .select(COMMENT_SELECT)
      .single()
    if (!error && data) {
      update([...(comments || []), data])
      setDraft('')
      setReplyTo(null)
    }
    setSending(false)
  }

  async function remove(id) {
    // Antworten werden per ON DELETE CASCADE mitgelöscht
    update((comments || []).filter(c => c.id !== id && c.parent_id !== id))
    await supabase.from('creed_comments').delete().eq('id', id)
  }

  async function toggleLike(id) {
    const mine = likes.some(l => l.comment_id === id && l.user_id === user.id)
    setLikes(prev => mine
      ? prev.filter(l => !(l.comment_id === id && l.user_id === user.id))
      : [...prev, { comment_id: id, user_id: user.id }])
    if (mine) await supabase.from('creed_comment_likes').delete().eq('comment_id', id).eq('user_id', user.id)
    else await supabase.from('creed_comment_likes').insert({ comment_id: id, user_id: user.id })
  }

  function renderComment(c, isReply) {
    const name = c.profiles?.full_name || c.profiles?.username || 'Geschwister'
    const own = c.author_id === user?.id
    const likeCount = likes.filter(l => l.comment_id === c.id).length
    const liked = likes.some(l => l.comment_id === c.id && l.user_id === user?.id)
    return (
      <div key={c.id} className="flex gap-2 mb-3" style={isReply ? { marginLeft: 36 } : undefined}>
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
          <div className="flex items-center gap-4 mt-1">
            <button onClick={() => toggleLike(c.id)} className="flex items-center gap-1" style={{ fontSize: 11.5, fontWeight: 600, color: liked ? '#E0245E' : 'var(--color-text-tertiary)' }}>
              <Heart size={13} fill={liked ? '#E0245E' : 'none'} /> {likeCount > 0 && likeCount}
            </button>
            <button onClick={() => setReplyTo({ rootId: c.parent_id || c.id, name })} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
              Antworten
            </button>
          </div>
        </div>
      </div>
    )
  }

  const top = (comments || []).filter(c => !c.parent_id)

  return (
    <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
      {!comments && <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
      {comments?.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Noch keine Kommentare.</p>
      )}
      {top.map(c => (
        <div key={c.id}>
          {renderComment(c, false)}
          {comments.filter(r => r.parent_id === c.id).map(r => renderComment(r, true))}
        </div>
      ))}

      {replyTo && (
        <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Antwort an {replyTo.name}
          <button onClick={() => setReplyTo(null)} aria-label="Antwort abbrechen"><X size={13} /></button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={replyTo ? 'Antwort schreiben…' : 'Kommentar schreiben…'}
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
          onBlocked={() => update((comments || []).filter(c => c.author_id !== moderation.author_id))}
        />
      )}
    </div>
  )
}
