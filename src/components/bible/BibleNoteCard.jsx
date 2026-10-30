import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Send, Trash2, MoreHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { timeAgo } from '../../lib/prayerModel'
import BibleReferenceChip from '../bible/BibleReferenceChip'
import ModerationSheet from '../common/ModerationSheet'

const COMMENT_SELECT = 'id, note_id, author_id, body, created_at, profiles:author_id(id, full_name, username, avatar_url)'

function Avatar({ profile, size = 28 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 10, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  )
}

// Bibel-Notiz als kleiner Feed-Beitrag: Autor + Zeit, Gefällt mir, Kommentare.
export default function BibleNoteCard({ note, onRemove }) {
  const { user } = useAuth()
  const [likes, setLikes] = useState([])
  const [comments, setComments] = useState([])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [moderation, setModeration] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [lk, cm] = await Promise.all([
        supabase.from('bible_note_likes').select('user_id').eq('note_id', note.id),
        supabase.from('bible_note_comments').select(COMMENT_SELECT).eq('note_id', note.id).order('created_at'),
      ])
      if (cancelled) return
      if (!lk.error) setLikes(lk.data || [])
      if (!cm.error) setComments(cm.data || [])
    })()
    return () => { cancelled = true }
  }, [note.id])

  const liked = likes.some(l => l.user_id === user?.id)

  async function toggleLike() {
    setLikes(prev => liked ? prev.filter(l => l.user_id !== user.id) : [...prev, { user_id: user.id }])
    if (liked) await supabase.from('bible_note_likes').delete().eq('note_id', note.id).eq('user_id', user.id)
    else await supabase.from('bible_note_likes').insert({ note_id: note.id, user_id: user.id })
  }

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const { data, error } = await supabase
      .from('bible_note_comments')
      .insert({ note_id: note.id, author_id: user.id, body })
      .select(COMMENT_SELECT)
      .single()
    if (!error && data) { setComments(prev => [...prev, data]); setDraft('') }
    setSending(false)
  }

  async function removeComment(id) {
    setComments(prev => prev.filter(c => c.id !== id))
    await supabase.from('bible_note_comments').delete().eq('id', id)
  }

  const author = note.author
  const name = note.isOwn ? 'Du' : (author?.full_name || author?.username || 'Jemand')

  return (
    <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar profile={author || (note.isOwn ? { full_name: 'Du' } : null)} />
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>{name}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{timeAgo(note.created_at)}</span>
        </div>
        {note.isOwn && onRemove && (
          <button onClick={onRemove} aria-label="Notiz löschen" className="p-1" style={{ color: 'var(--color-text-tertiary)' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note.note}</p>
      {Array.isArray(note.linked_verses) && note.linked_verses.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2">
          {note.linked_verses.map((att, i) => <BibleReferenceChip key={i} attachment={att} variant="block" showVerse={false} />)}
        </div>
      )}

      <div className="flex items-center gap-4 mt-2">
        <button onClick={toggleLike} className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: liked ? '#E0245E' : 'var(--color-text-tertiary)' }}>
          <Heart size={15} fill={liked ? '#E0245E' : 'none'} /> {likes.length > 0 && likes.length}
        </button>
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: open ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
          <MessageCircle size={15} /> {comments.length > 0 && comments.length}
        </button>
      </div>

      {open && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          {comments.map(c => {
            const cname = c.profiles?.full_name || c.profiles?.username || 'Geschwister'
            const own = c.author_id === user?.id
            return (
              <div key={c.id} className="flex gap-2 mb-2">
                <Avatar profile={c.profiles} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{cname}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{timeAgo(c.created_at)}</span>
                    <span className="flex-1" />
                    {own ? (
                      <button onClick={() => removeComment(c.id)} aria-label="Kommentar löschen" className="p-1" style={{ color: 'var(--color-text-tertiary)' }}><Trash2 size={12} /></button>
                    ) : (
                      <button onClick={() => setModeration(c)} aria-label="Melden oder blockieren" className="p-1" style={{ color: 'var(--color-text-tertiary)' }}><MoreHorizontal size={14} /></button>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</p>
                </div>
              </div>
            )
          })}
          <div className="flex items-end gap-2">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
              placeholder="Kommentar schreiben…"
              maxLength={2000}
              className="flex-1 outline-none"
              style={{ border: '1px solid var(--color-border)', borderRadius: 18, padding: '7px 12px', fontSize: 13, backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              aria-label="Senden"
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 34, height: 34, borderRadius: '50%', color: '#fff', backgroundColor: draft.trim() ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {moderation && (
        <ModerationSheet
          contentType="bible_note_comment"
          contentId={moderation.id}
          authorId={moderation.author_id}
          authorName={moderation.profiles?.full_name || moderation.profiles?.username}
          onClose={() => setModeration(null)}
          onBlocked={() => setComments(prev => prev.filter(c => c.author_id !== moderation.author_id))}
        />
      )}
    </div>
  )
}
