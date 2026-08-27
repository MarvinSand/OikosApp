import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreVertical, Pencil, Check, Trash2, Pin, Lock, Globe,
  MessageCircle, BookmarkPlus, Forward, ChevronDown, ChevronUp,
  CornerUpLeft,
} from 'lucide-react'
import Confetti from '../ui/Confetti'
import ProgressBar from './ProgressBar'
import PrayedBySheet from './PrayedBySheet'
import EditPrayerSheet from './EditPrayerSheet'
import CommentInput from './CommentInput'
import { useToast } from '../../context/ToastContext'
import { summarizeLogs } from '../../hooks/usePrayerEngagement'
import BibleReferenceChip from '../bible/BibleReferenceChip'
import {
  timeAgo, formatLastPrayed, getInitials, authorName as displayName, KIND_OIKOS,
  prayerContext,
} from '../../lib/prayerModel'

// ════════════════════════════════════════════════════════════════════════
// Die EINE Gebets-Karte
// ════════════════════════════════════════════════════════════════════════
// Design: Gebetsanliegen aus der Oikos-Map. Wird überall verwendet – Oikos-
// Person, Community, For-You-Feed, Gebetsliste, erhörte Gebete.
//
// prayer  – normalisiertes Gebet (lib/prayerModel)
// logs    – Gebets-Logs dieses Anliegens (aus usePrayerEngagement)
// notes   – Kommentare
// goal    – optionales verknüpftes Gebetsziel

function AvatarBubble({ name, size = 42, isChristian, avatarUrl }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isChristian ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: isChristian ? '#fff' : 'var(--color-text-secondary)',
      fontFamily: 'Lora, serif', fontSize: size * 0.32, fontWeight: 700,
    }}>{getInitials(name)}</div>
  )
}

function OverlappingPrayerAvatars({ prayersByUser, currentUserId }) {
  const shown = prayersByUser.slice(0, 3)
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((p, i) => {
        const name = p.userId === currentUserId ? 'Du' : (p.profile?.full_name || p.profile?.username || '?')
        return (
          <div key={p.userId} style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            backgroundColor: p.profile?.is_christian ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: p.profile?.is_christian ? '#fff' : 'var(--color-text-secondary)',
            fontFamily: 'Lora, serif', fontSize: 8, fontWeight: 700,
            border: '2px solid var(--color-white)', marginLeft: i > 0 ? -8 : 0,
            position: 'relative', zIndex: 3 - i,
          }}>{getInitials(name)}</div>
        )
      })}
    </div>
  )
}

// Woher stammt dieses Gebet – kleiner Kontext-Hinweis, damit im
// „Alle Gebete"-Feed erkennbar bleibt, worüber man es sieht.
const CATEGORIES = [
  { key: 'heilung',   label: 'Heilung',   emoji: '🌿' },
  { key: 'weisheit',  label: 'Weisheit',  emoji: '🕊️' },
  { key: 'erweckung', label: 'Erweckung', emoji: '🔥' },
  { key: 'wahrheit',  label: 'Wahrheit',  emoji: '📖' },
  { key: 'liebe',     label: 'Liebe',     emoji: '❤️' },
  { key: 'sonstiges', label: 'Sonstiges', emoji: '🙏' },
]

const SOURCE_LABELS = {
  oikos: 'Oikos',
  community: 'Community',
  shared: 'Geteilt',
  sibling: 'Geschwister',
}

// Ein Kommentar + seine öffentlichen Antworten. Nur eine Ebene tief –
// „direkt unter dem Gebet im Kommentarbereich" reicht für Antworten.
function CommentThread({ note, replies, currentUserId, replyingTo, setReplyingTo, onSubmitReply, onDelete, onPrivateReply }) {
  const isReplying = replyingTo === note.id

  function Row({ n, isReply }) {
    const isOwn = n.author_id === currentUserId
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <AvatarBubble name={n.profiles?.full_name || n.profiles?.username || 'Du'} size={isReply ? 24 : 28} avatarUrl={n.profiles?.avatar_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                {isOwn ? 'Du' : (n.profiles?.full_name || n.profiles?.username || 'Unbekannt')}
              </span>
              {n.is_public === false && (
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '1px 5px' }}>
                  nur Ersteller
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{n.text}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, paddingLeft: 2 }}>
            {!isReply && (
              <button onClick={() => setReplyingTo(isReplying ? null : n.id)} style={commentActionLink}>
                <CornerUpLeft size={11} /> Antworten
              </button>
            )}
            {!isOwn && (
              <button onClick={() => onPrivateReply(n)} style={commentActionLink}>
                Privat antworten
              </button>
            )}
            {isOwn && (
              <button onClick={() => onDelete(n)} style={{ ...commentActionLink, color: 'var(--color-error)' }}>
                <Trash2 size={11} /> Löschen
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row n={note} isReply={false} />
      {replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 22, paddingLeft: 10, borderLeft: '2px solid var(--color-border)' }}>
          {replies.map(r => <Row key={r.id} n={r} isReply />)}
        </div>
      )}
      {isReplying && (
        <div style={{ marginLeft: 22 }}>
          <CommentInput
            onSubmit={(text, isPublic) => { onSubmitReply(text, isPublic); setReplyingTo(null) }}
            placeholder="Antworten…"
          />
        </div>
      )}
    </div>
  )
}

export default function PrayerCard({
  prayer,
  logs,
  notes,
  currentUserId,
  goal = null,
  showSourceBadge = false,
  // Herkunfts-Zeile (Oikos-Person/Map bzw. Community). Dort ausschalten, wo
  // die Herkunft schon der Bildschirm selbst ist – Oikos-Person, Community.
  showContext = true,
  extraBadge = null,
  extraMenuItems = [],
  onPray,
  onComment,
  onDeleteComment,
  onPrivateReply,
  onUpdate,
  onToggleAnswered,
  onDelete,
  onAddToList,
  onLaterPray,
  onForward,
  onOpenGoal,
}) {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [showPrayedBy, setShowPrayedBy] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)

  const isOwner = !!currentUserId && prayer.ownerId === currentUserId
  const isAnswered = prayer.isAnswered
  const author = prayer.author
  const name = displayName(prayer, currentUserId)
  const desc = prayer.description || ''
  const shortDesc = desc.length > 120 ? desc.slice(0, 120) + '…' : desc
  const commentList = notes || []

  // Anzeigewerte aus den Logs
  const { prayersByUser, totalCount, myLastPrayedAt, othersLastPrayedAt } = summarizeLogs(logs, currentUserId)
  const peopleCount = prayersByUser.length

  const sourceLabel = showSourceBadge ? SOURCE_LABELS[prayer.source] : null
  const cat = CATEGORIES.find(c => c.key === prayer.category)
  const context = showContext ? prayerContext(prayer) : null

  async function handlePray() {
    try {
      await onPray?.(prayer)
      showToast('🙏 Gebet wurde notiert')
    } catch {
      showToast('Fehler beim Speichern', 'error')
    }
  }

  async function handleToggleAnswered() {
    if (!isAnswered) { setConfetti(true); setTimeout(() => setConfetti(false), 3200) }
    await onToggleAnswered?.(prayer)
    showToast(isAnswered ? 'Als offen markiert' : '🎉 Als erhört markiert!')
  }

  return (
    <>
      <Confetti show={confetti} />
      <div
        id={'prayer-' + prayer.id}
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 16, padding: '16px 18px',
          border: isAnswered ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 2,
        }}
      >
        {/* Kopf: Avatar + Name + Zeit + Menü */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <AvatarBubble name={name} size={42} isChristian={author?.is_christian} avatarUrl={author?.avatar_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
                {name}
              </p>
              {author?.gender === 'brother' && !isOwner && <span style={genderBadge}>Bruder</span>}
              {author?.gender === 'sister' && !isOwner && <span style={genderBadge}>Schwester</span>}
              {isAnswered && (
                <span style={{ ...genderBadge, backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent-dark)', fontWeight: 700 }}>
                  🎉 Erhört
                </span>
              )}
              {cat && <span style={genderBadge}>{cat.emoji} {cat.label}</span>}
              {sourceLabel && <span style={genderBadge}>{sourceLabel}</span>}
              {extraBadge && (
                <span style={{ ...genderBadge, color: extraBadge.color || 'var(--color-text-secondary)', borderColor: extraBadge.color || 'var(--color-border)' }}>
                  {extraBadge.label}
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              {!isOwner && author?.username ? `@${author.username} · ` : ''}{timeAgo(prayer.createdAt)}
            </p>
          </div>

          {/* Anpinnen + ⋯ (Besitzer) */}
          {isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => onUpdate?.(prayer, { is_pinned: !prayer.isPinned })}
                title={prayer.isPinned ? 'Nicht mehr anpinnen' : 'Oben anpinnen'}
                style={iconBtn(prayer.isPinned ? 'var(--color-accent)' : 'var(--color-text-tertiary)')}
              >
                <Pin size={16} fill={prayer.isPinned ? 'var(--color-accent)' : 'none'} />
              </button>
            </div>
          )}
        </div>

        {/* Titel */}
        <h3 style={{
          fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700,
          color: isAnswered ? 'var(--color-text-secondary)' : 'var(--color-text)',
          margin: `0 0 ${desc ? 8 : 0}px`, lineHeight: 1.3,
          textDecoration: isAnswered ? 'line-through' : 'none',
        }}>
          {prayer.title}
        </h3>

        {/* Beschreibung */}
        {desc && (
          <div style={{ marginBottom: 4 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {expanded ? desc : shortDesc}
            </p>
            {desc.length > 120 && (
              <button onClick={() => setExpanded(v => !v)} style={linkBtn}>
                {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
              </button>
            )}
          </div>
        )}

        {/* Verknüpfte Bibelstelle */}
        {prayer.bibleVerse && (
          <BibleReferenceChip attachment={prayer.bibleVerse} variant="block" />
        )}

        {/* Herkunft: für wen / aus welcher Map / von wem – bzw. Community */}
        {context && (
          <button
            onClick={() => context.to && navigate(context.to)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
              border: 'none', background: 'none', padding: 0, textAlign: 'left',
              cursor: context.to ? 'pointer' : 'default',
              fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-secondary)',
            }}
          >
            <span style={{ flexShrink: 0 }}>{context.icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {context.text}
            </span>
          </button>
        )}

        {/* Gebetsziel */}
        {goal && (
          <div
            onClick={() => onOpenGoal?.(goal)}
            style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', cursor: onOpenGoal ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: goal.goal_type === 'custom' ? 0 : 8 }}>
              <span style={{ fontSize: 15 }}>{goal.icon || '🎯'}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {goal.goal_type === 'hours' ? 'Stunden-Ziel' : goal.goal_type === 'days' ? 'Tage-Ziel' : goal.goal_type === 'custom' ? 'Individuelles Ziel' : 'Personen-Ziel'}
              </span>
              {goal.goal_type !== 'custom' && (
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  🙏 {goal.participant_count || 0} dabei
                </span>
              )}
            </div>
            {goal.goal_type === 'custom' ? (
              <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{goal.title}</p>
            ) : (
              <ProgressBar
                value={Number(goal.current_value) || 0}
                target={Number(goal.target_value)}
                color={goal.color || 'var(--color-accent)'}
                unitLabel={goal.goal_type === 'hours' ? 'Std' : goal.goal_type === 'days' ? 'Tage' : 'Pers.'}
              />
            )}
          </div>
        )}

        {/* Gebets-Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={() => peopleCount > 0 && setShowPrayedBy(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: 0, cursor: peopleCount > 0 ? 'pointer' : 'default', minWidth: 0 }}
          >
            {peopleCount > 0 ? (
              <>
                <OverlappingPrayerAvatars prayersByUser={prayersByUser} currentUserId={currentUserId} />
                <span style={{ fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {peopleCount} {peopleCount === 1 ? 'Person' : 'Personen'} · {totalCount} {totalCount === 1 ? 'Gebet' : 'Gebete'}
                </span>
              </>
            ) : (
              <span style={{ fontFamily: 'Lora, serif', fontSize: 13.5, color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '3px 10px', borderRadius: 20, backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                Noch keine Gebete
              </span>
            )}
          </button>

          <button onClick={handlePray} style={prayBtn}>🙏 Beten</button>
        </div>

        {/* Letztes Gebet – eigenes und fremdes */}
        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Du: {formatLastPrayed(myLastPrayedAt)}
          </span>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Andere: {formatLastPrayed(othersLastPrayedAt)}
          </span>
        </div>

        {/* Aktionen: Kommentar · Liste · Weiterleiten · Besitzer-Menü */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
          <button onClick={() => setShowComments(v => !v)} style={actionBtn}>
            <MessageCircle size={14} />
            Kommentar{commentList.length > 0 ? ` · ${commentList.length}` : ''}
            {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <div style={{ marginLeft: 'auto', position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setShowMenu(v => !v)} aria-label="Weitere Optionen" style={{ ...actionBtn, padding: '6px 10px' }}>
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{
                  position: 'absolute', right: 0, bottom: '100%', marginBottom: 6,
                  backgroundColor: 'var(--color-white)', borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)',
                  zIndex: 20, minWidth: 215, overflow: 'hidden',
                }}>
                  {extraMenuItems.map((mi, i) => (
                    <button
                      key={mi.label}
                      onClick={() => { setShowMenu(false); mi.onClick() }}
                      style={{ ...menuItem, ...(i > 0 ? { borderTop: '1px solid var(--color-border)' } : {}), ...(mi.danger ? { color: 'var(--color-error)' } : {}) }}
                    >
                      {mi.label}
                    </button>
                  ))}
                  <button onClick={() => { setShowMenu(false); onAddToList?.(prayer) }} style={extraMenuItems.length > 0 ? { ...menuItem, borderTop: '1px solid var(--color-border)' } : menuItem}>
                    <BookmarkPlus size={15} /> Zur Gebetsliste hinzufügen
                  </button>
                  <button onClick={() => { setShowMenu(false); onLaterPray?.(prayer) }} style={{ ...menuItem, borderTop: '1px solid var(--color-border)' }}>
                    ⏰ Später beten
                  </button>
                  <button onClick={() => { setShowMenu(false); onForward?.(prayer) }} style={{ ...menuItem, borderTop: '1px solid var(--color-border)' }}>
                    <Forward size={15} /> Weiterleiten
                  </button>
                  {isOwner && (
                    <>
                      <button onClick={() => { setShowMenu(false); setShowEdit(true) }} style={{ ...menuItem, borderTop: '1px solid var(--color-border)' }}>
                        <Pencil size={15} /> Bearbeiten
                      </button>
                      <button onClick={() => { setShowMenu(false); handleToggleAnswered() }} style={{ ...menuItem, borderTop: '1px solid var(--color-border)' }}>
                        <Check size={15} /> {isAnswered ? 'Als offen markieren' : 'Als erhört markieren'}
                      </button>
                      {/* Community-Anliegen behalten ihre Community-Sichtbarkeit –
                          ein Privat-Schalter würde sie aus der Community entfernen. */}
                      {prayer.visibility !== 'community' && (
                        <button
                          onClick={() => { setShowMenu(false); onUpdate?.(prayer, prayer.kind === KIND_OIKOS ? { is_public: !prayer.isPublic } : { visibility: prayer.visibility === 'private' ? 'public' : 'private' }) }}
                          style={{ ...menuItem, borderTop: '1px solid var(--color-border)' }}
                        >
                          {prayer.isPublic ? <><Lock size={15} /> Privat machen</> : <><Globe size={15} /> Öffentlich machen</>}
                        </button>
                      )}
                      <button onClick={() => { setShowMenu(false); onDelete?.(prayer) }} style={{ ...menuItem, borderTop: '1px solid var(--color-border)', color: 'var(--color-error)' }}>
                        <Trash2 size={15} /> Löschen
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Kommentar-Bereich */}
        {showComments && (
          <div style={{ marginTop: 10 }}>
            {commentList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 10 }}>
                {commentList.filter(n => !n.reply_to_id).map(n => (
                  <CommentThread
                    key={n.id}
                    note={n}
                    replies={commentList.filter(r => r.reply_to_id === n.id)}
                    currentUserId={currentUserId}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    onSubmitReply={(text, isPublic) => onComment?.(prayer, text, isPublic, n.id)}
                    onDelete={note => onDeleteComment?.(prayer, note)}
                    onPrivateReply={note => onPrivateReply?.(prayer, note)}
                  />
                ))}
              </div>
            )}
            <CommentInput onSubmit={(text, isPublic) => onComment?.(prayer, text, isPublic)} />
          </div>
        )}
      </div>

      {showPrayedBy && (
        <PrayedBySheet
          prayersByUser={prayersByUser}
          totalCount={totalCount}
          currentUserId={currentUserId}
          onClose={() => setShowPrayedBy(false)}
        />
      )}
      {showEdit && (
        <EditPrayerSheet
          prayer={prayer}
          onSave={updates => onUpdate?.(prayer, updates)}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}

const genderBadge = {
  fontFamily: 'Lora, serif', fontSize: 10, padding: '1px 8px', borderRadius: 20,
  backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
  fontWeight: 600, border: '1px solid var(--color-border)',
}
const iconBtn = color => ({
  border: 'none', background: 'none', cursor: 'pointer', padding: 6,
  borderRadius: '50%', color, display: 'flex',
})
const linkBtn = {
  border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Lora, serif',
  fontSize: 13, color: 'var(--color-accent-dark)', fontWeight: 600, padding: '4px 0', marginTop: 2,
}
const prayBtn = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20,
  border: '1.5px solid var(--color-accent)', backgroundColor: 'transparent',
  color: 'var(--color-accent-dark)', fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap',
}
const actionBtn = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999,
  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
  color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const commentActionLink = {
  display: 'flex', alignItems: 'center', gap: 3, border: 'none', background: 'none',
  cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: 11.5, fontWeight: 600,
  color: 'var(--color-text-tertiary)', padding: 0,
}
const menuItem = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '11px 16px',
  border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14,
  color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left',
}
