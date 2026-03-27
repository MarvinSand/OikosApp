import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Shield, MoreVertical, LogOut, Users } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCommunityDetail } from '../hooks/useCommunityDetail'
import { useCommunities } from '../hooks/useCommunities'
import { useToast } from '../context/ToastContext'

function Avatar({ name, size = 40 }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: 'var(--color-warm-4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-warm-1)', fontFamily: 'Lora, serif',
      fontSize: size * 0.32, fontWeight: 700,
      border: '1.5px solid var(--color-warm-3)',
    }}>{initials}</div>
  )
}

function MemberRow({ member, canManage, isSelf, isLastAdmin, onRoleChange, onRemove }) {
  const [open, setOpen] = useState(false)
  const isAdmin = member.role === 'admin'
  const name = member.profile?.full_name || member.profile?.username || 'Unbekannt'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-warm-3)', position: 'relative' }}>
      <Avatar name={name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
          {isSelf && <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>(Du)</span>}
        </p>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
          @{member.profile?.username || '—'}
        </p>
      </div>
      {isAdmin && (
        <span style={{ fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: 'var(--color-gold-light)', color: '#8A6020', flexShrink: 0 }}>
          Admin
        </span>
      )}
      {canManage && !isSelf && (
        <button
          onClick={() => setOpen(v => !v)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-text-light)' }}
        >
          <MoreVertical size={16} />
        </button>
      )}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--color-white)', borderRadius: 10, boxShadow: '0 4px 16px rgba(58,46,36,0.12)', border: '1px solid var(--color-warm-3)', zIndex: 20, minWidth: 200 }}>
            {isAdmin ? (
              <button
                onClick={() => { setOpen(false); onRoleChange(member.user_id, 'member') }}
                style={menuItem}
              >
                Admin-Rechte entziehen
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onRoleChange(member.user_id, 'admin') }}
                style={menuItem}
              >
                Zum Admin machen
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onRemove(member.user_id) }}
              style={{ ...menuItem, color: '#C0392B', borderTop: '1px solid var(--color-warm-3)' }}
            >
              Aus Community entfernen
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function CommunityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { community, members, myMembership, isAdmin, adminCount, loading, changeRole, removeMember } = useCommunityDetail(id)
  const { leaveCommunity } = useCommunities()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  async function handleRoleChange(userId, role) {
    await changeRole(userId, role)
    showToast(role === 'admin' ? 'Admin-Rechte vergeben ✓' : 'Admin-Rechte entzogen')
  }

  async function handleRemoveMember(userId) {
    if (!window.confirm('Mitglied wirklich entfernen?')) return
    await removeMember(userId)
    showToast('Mitglied entfernt')
  }

  async function handleLeave() {
    if (isAdmin && adminCount <= 1) {
      showToast('Als einziger Admin kannst du nicht austreten. Mache zuerst jemand anderen zum Admin.', 'error')
      return
    }
    setLeaving(true)
    try {
      await leaveCommunity(id)
      showToast('Community verlassen')
      navigate('/friends', { replace: true })
    } catch {
      showToast('Fehler beim Austreten', 'error')
      setLeaving(false)
    }
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(community.invite_code).then(() => {
      showToast('Code kopiert ✓')
    })
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%' }}>
        <div style={header}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <div style={{ height: 24, width: 140, borderRadius: 8, backgroundColor: 'var(--color-warm-3)' }} />
        </div>
        <div style={{ padding: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 60, borderRadius: 12, backgroundColor: 'var(--color-warm-4)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%' }}>
        <div style={header}>
          <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
          <span style={headerTitle}>Nicht gefunden</span>
        </div>
        <p style={{ padding: 20, fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Diese Community existiert nicht mehr.
        </p>
      </div>
    )
  }

  const initials = community.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100%', paddingBottom: 90 }}>
      {/* Header */}
      <div style={header}>
        <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={20} /></button>
        <span style={headerTitle}>{community.name}</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Community-Info */}
      <div style={{ backgroundColor: 'var(--color-white)', margin: 16, borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: community.description ? 14 : 0 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700, color: 'var(--color-warm-1)', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>
              {community.name}
            </p>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={12} />
              {members.length} Mitglieder
            </p>
          </div>
        </div>
        {community.description && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, margin: 0, padding: '12px 0 0', borderTop: '1px solid var(--color-warm-3)' }}>
            {community.description}
          </p>
        )}
      </div>

      {/* Einladungscode – nur für Admins */}
      {isAdmin && community.invite_code && (
        <div style={{ backgroundColor: 'var(--color-white)', marginHorizontal: 16, margin: '0 16px 16px', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            <Shield size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Einladungscode
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', letterSpacing: 3, flex: 1 }}>
              {community.invite_code}
            </span>
            <button
              onClick={copyInviteCode}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-warm-1)', cursor: 'pointer', fontWeight: 500 }}
            >
              <Copy size={13} /> Kopieren
            </button>
          </div>
        </div>
      )}

      {/* Mitgliederliste */}
      <div style={{ backgroundColor: 'var(--color-white)', margin: '0 16px 16px', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
          Mitglieder ({members.length})
        </p>
        {members.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            canManage={isAdmin}
            isSelf={m.user_id === user?.id}
            isLastAdmin={adminCount <= 1 && m.role === 'admin'}
            onRoleChange={handleRoleChange}
            onRemove={handleRemoveMember}
          />
        ))}
      </div>

      {/* Austreten */}
      {myMembership && (
        <div style={{ padding: '0 16px' }}>
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: '1.5px solid #E8C0B8', backgroundColor: 'transparent', color: '#C0392B', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <LogOut size={15} /> Community verlassen
            </button>
          ) : (
            <div style={{ backgroundColor: 'var(--color-white)', borderRadius: 16, padding: 16, border: '1.5px solid #E8C0B8', boxShadow: '0 2px 8px rgba(58,46,36,0.06)' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', marginBottom: 14, textAlign: 'center' }}>
                Wirklich <strong>{community.name}</strong> verlassen?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  Abbrechen
                </button>
                <button onClick={handleLeave} disabled={leaving} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', backgroundColor: '#C0392B', color: 'white', fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {leaving ? 'Austreten…' : 'Verlassen'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Styles
const header = { backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }
const backBtn = { border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }
const headerTitle = { fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center', margin: '0 8px' }
const menuItem = { display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }
