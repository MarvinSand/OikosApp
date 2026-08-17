import { ChevronRight, Globe, Lock, Shield, Users } from 'lucide-react'
import { communityCover, getInitials } from '../../lib/communityTheme'
import MemberAvatarStack from './MemberAvatarStack'

// Premium Community-Karte mit Cover-Akzent, Avatar, Meta und Mitglieder-Stapel.
// variant="member"  → ganze Karte tippbar (öffnen)
// variant="discover" → Beitreten-Button rechts
export default function CommunityCard({
  community, members = [], variant = 'member',
  onOpen, onJoin, joining = false, requested = false,
}) {
  const cover = communityCover(community.id || community.name)
  const memberCount = community.memberCount ?? community.member_count ?? 0
  const isMember = variant === 'member'
  const needsRequest = community.join_mode === 'request'

  const body = (
    <>
      {/* Cover-Akzent mit Avatar */}
      <div style={{ position: 'relative', height: 64, background: cover.gradient, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', left: 14, bottom: -20,
          width: 52, height: 52, borderRadius: 15,
          background: community.avatar_url ? `url(${community.avatar_url})` : cover.gradient,
          backgroundSize: 'cover', backgroundPosition: 'center',
          border: '3px solid var(--color-white)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 800,
        }}>
          {!community.avatar_url && getInitials(community.name)}
        </div>
        {/* Sichtbarkeits-Chip auf dem Cover */}
        <span style={{
          position: 'absolute', top: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 9px', borderRadius: 999,
          backgroundColor: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)',
          color: '#fff', fontFamily: 'Lora, serif', fontSize: 10.5, fontWeight: 600,
        }}>
          {community.is_public ? <><Globe size={11} /> Öffentlich</> : <><Lock size={11} /> Privat</>}
        </span>
        {community.role === 'admin' && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)',
            color: '#fff', fontFamily: 'Lora, serif', fontSize: 10.5, fontWeight: 700,
          }}>
            <Shield size={11} /> Admin
          </span>
        )}
      </div>

      {/* Inhalt */}
      <div style={{ padding: '26px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {community.name}
            </p>
            {community.description ? (
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {community.description}
              </p>
            ) : (
              <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>
                <Users size={12} /> {memberCount} {memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
              </p>
            )}
          </div>
          {isMember && <ChevronRight size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0, marginTop: 2 }} />}
        </div>

        {/* Mitglieder-Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <MemberAvatarStack members={members} count={memberCount} />
            <span style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              {memberCount} {memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
            </span>
          </div>
          {!isMember && (
            <button
              onClick={(e) => { e.stopPropagation(); if (!requested) onJoin?.(community) }}
              disabled={joining || requested}
              style={{
                flexShrink: 0, padding: '9px 18px', borderRadius: 999, border: 'none',
                backgroundColor: requested ? 'var(--color-bg-secondary)' : 'var(--color-accent)',
                color: requested ? 'var(--color-text-secondary)' : '#fff',
                fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700,
                cursor: (joining || requested) ? 'default' : 'pointer', opacity: joining ? 0.6 : 1,
                transition: 'opacity 0.15s, transform 0.15s',
              }}
            >
              {joining ? '…' : requested ? 'Angefragt' : needsRequest ? 'Anfrage senden' : 'Beitreten'}
            </button>
          )}
        </div>
      </div>
    </>
  )

  const cardStyle = {
    width: '100%', textAlign: 'left', padding: 0, overflow: 'hidden',
    borderRadius: 18, border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-white)',
    boxShadow: '0 2px 14px rgba(58,46,36,0.07)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  }

  if (isMember) {
    return (
      <button
        onClick={() => onOpen?.(community)}
        style={{ ...cardStyle, display: 'block', cursor: 'pointer' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.985)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {body}
      </button>
    )
  }
  return <div style={cardStyle}>{body}</div>
}
