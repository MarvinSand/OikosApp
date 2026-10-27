import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Flag, MessageSquare, Search, Shield, EyeOff, Trash2,
  CheckCircle2, XCircle, AlertTriangle, Ban, UserPlus, UserMinus, RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsAppAdmin } from '../hooks/useIsAppAdmin'
import { useToast } from '../context/ToastContext'

const ACTION_BTNS = [
  { key: 'dismiss', label: 'Verwerfen', icon: XCircle, status: 'dismissed', action: 'dismissed' },
  { key: 'hide', label: 'Verstecken', icon: EyeOff, rpc: 'moderation_hide_content', status: 'resolved', action: 'hidden' },
  { key: 'delete', label: 'Löschen', icon: Trash2, rpc: 'moderation_soft_delete_content', status: 'resolved', action: 'soft_deleted' },
  { key: 'warn', label: 'Verwarnen', icon: AlertTriangle, warn: true, status: 'resolved', action: 'warned' },
  { key: 'ban', label: 'Sperren', icon: Ban, ban: true, status: 'resolved', action: 'banned' },
]

function groupByContent(reports) {
  const map = new Map()
  for (const r of reports) {
    const key = `${r.content_type}:${r.content_id}`
    if (!map.has(key)) map.set(key, { key, content_type: r.content_type, content_id: r.content_id, target_author_id: r.target_author_id, community_id: r.community_id, reports: [] })
    map.get(key).reports.push(r)
  }
  return [...map.values()].sort((a, b) => {
    const aAt = a.reports[0]?.created_at || ''
    const bAt = b.reports[0]?.created_at || ''
    return bAt.localeCompare(aAt)
  })
}

export default function ModerationView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAppAdmin, loading: adminLoading } = useIsAppAdmin()
  const { showToast } = useToast()

  const [tab, setTab] = useState('reports') // reports | admins | chat
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [admins, setAdmins] = useState([])
  const [userQuery, setUserQuery] = useState('')
  const [userHits, setUserHits] = useState([])
  const [modConvId, setModConvId] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatText, setChatText] = useState('')

  const openCount = useMemo(() => reports.filter(r => r.status === 'open').length, [reports])
  const grouped = useMemo(() => groupByContent(reports.filter(r => r.status === 'open')), [reports])

  const loadReports = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('content_reports')
      .select('id, reporter_id, content_type, content_id, reason, status, target_author_id, community_id, created_at, action_taken, resolution_note, resolved_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) showToast('Meldungen laden fehlgeschlagen', 'error')
    else setReports(data || [])
    setLoading(false)
  }, [showToast])

  const loadAdmins = useCallback(async () => {
    const { data } = await supabase
      .from('app_admins')
      .select('user_id, created_at, profiles:user_id(id, username, full_name, avatar_url)')
    setAdmins(data || [])
  }, [])

  const loadChat = useCallback(async () => {
    const { data: id, error } = await supabase.rpc('get_moderation_conversation_id')
    if (error || !id) return
    setModConvId(id)
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, text, created_at, type, is_deleted, profiles:sender_id(username, full_name)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(100)
    setChatMessages(msgs || [])
  }, [])

  useEffect(() => {
    if (!isAppAdmin) return
    loadReports()
    loadAdmins()
  }, [isAppAdmin, loadReports, loadAdmins])

  useEffect(() => {
    if (tab === 'chat' && isAppAdmin) loadChat()
  }, [tab, isAppAdmin, loadChat])

  async function loadPreview(group) {
    setPreview({ group, body: null, loading: true })
    let body = null
    const { content_type: t, content_id: id } = group
    if (t === 'feed_post') {
      const { data } = await supabase.from('feed_posts').select('id, title, body, author_id, moderation_hidden_at, moderation_deleted_at, profiles:author_id(username, full_name)').eq('id', id).maybeSingle()
      body = data
    } else if (t === 'feed_comment') {
      const { data } = await supabase.from('feed_comments').select('id, body, author_id, moderation_hidden_at, moderation_deleted_at, profiles:author_id(username, full_name)').eq('id', id).maybeSingle()
      body = data
    } else if (t === 'personal_prayer_request' || t === 'prayer_request') {
      const { data } = await supabase.from('personal_prayer_requests').select('id, title, description, owner_id, moderation_hidden_at, moderation_deleted_at').eq('id', id).maybeSingle()
      body = data
    } else if (t === 'community_post') {
      const { data } = await supabase.from('community_posts').select('id, title, content, author_id, community_id, moderation_hidden_at, moderation_deleted_at').eq('id', id).maybeSingle()
      body = data
    } else if (t === 'community_event') {
      const { data } = await supabase.from('community_events').select('id, title, description, created_by, community_id, moderation_hidden_at, moderation_deleted_at').eq('id', id).maybeSingle()
      body = data
    } else if (t === 'user') {
      const { data } = await supabase.from('profiles').select('id, username, full_name, bio').eq('id', id).maybeSingle()
      body = data
    }
    setPreview({ group, body, loading: false })
  }

  async function runAction(btn) {
    if (!preview?.group) return
    setBusy(true)
    const g = preview.group
    const reportIds = g.reports.map(r => r.id)
    try {
      if (btn.rpc) {
        const { error } = await supabase.rpc(btn.rpc, {
          p_content_type: g.content_type,
          p_content_id: g.content_id,
          p_note: note || null,
        })
        if (error) throw error
      }
      if (btn.warn && g.target_author_id) {
        const { error } = await supabase.rpc('moderation_warn_user', {
          p_user_id: g.target_author_id,
          p_note: note || null,
        })
        if (error) throw error
      }
      if (btn.ban && g.target_author_id) {
        const { error } = await supabase.rpc('moderation_ban_user', {
          p_user_id: g.target_author_id,
          p_note: note || null,
        })
        if (error) throw error
      }
      for (const rid of reportIds) {
        const { error } = await supabase.rpc('moderation_resolve_report', {
          p_report_id: rid,
          p_status: btn.status,
          p_action_taken: btn.action,
          p_note: note || null,
        })
        if (error) throw error
      }
      showToast('Erledigt')
      setPreview(null)
      setNote('')
      await loadReports()
    } catch (e) {
      showToast(e.message || 'Aktion fehlgeschlagen', 'error')
    }
    setBusy(false)
  }

  async function searchUsers() {
    const q = userQuery.trim()
    if (q.length < 2) { setUserHits([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(15)
    setUserHits(data || [])
  }

  async function grantAdmin(uid) {
    const { error } = await supabase.rpc('grant_app_admin', { p_user_id: uid })
    if (error) showToast(error.message || 'Vergabe fehlgeschlagen', 'error')
    else { showToast('Admin-Rechte vergeben'); loadAdmins(); setUserHits([]) }
  }

  async function revokeAdmin(uid) {
    const { error } = await supabase.rpc('revoke_app_admin', { p_user_id: uid })
    if (error) showToast(error.message || 'Entzug fehlgeschlagen', 'error')
    else { showToast('Admin-Rechte entzogen'); loadAdmins() }
  }

  async function sendChat() {
    const text = chatText.trim()
    if (!text || !modConvId) return
    setChatText('')
    const { error } = await supabase.from('messages').insert({
      conversation_id: modConvId,
      sender_id: user.id,
      type: 'text',
      text,
    })
    if (error) showToast('Nachricht fehlgeschlagen', 'error')
    else loadChat()
  }

  if (adminLoading) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Laden…</div>
  }

  if (!isAppAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate('/settings')} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ArrowLeft size={20} /></button>
        <p style={{ marginTop: 16 }}>Kein Zugriff.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={() => navigate('/settings')} aria-label="Zurück" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>Moderation</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{openCount} offene Meldung{openCount === 1 ? '' : 'en'}</div>
        </div>
        <button onClick={loadReports} aria-label="Aktualisieren" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
        {[
          { k: 'reports', label: `Meldungen (${openCount})`, icon: Flag },
          { k: 'admins', label: 'Admins', icon: Shield },
          { k: 'chat', label: 'Admin-Chat', icon: MessageSquare },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 6px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.k ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: tab === t.k ? 'white' : 'var(--color-text)',
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {tab === 'reports' && (
          loading ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Laden…</p>
          : grouped.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Keine offenen Meldungen.</p>
          : grouped.map(g => (
            <button
              key={g.key}
              onClick={() => loadPreview(g)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', marginBottom: 10,
                padding: 14, borderRadius: 12, border: '1px solid var(--color-border)',
                background: 'var(--color-white)', cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
                {g.content_type} · {g.reports.length} Meldung{g.reports.length === 1 ? '' : 'en'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                {g.reports.map(r => r.reason).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                {new Date(g.reports[0].created_at).toLocaleString('de-DE')}
              </div>
            </button>
          ))
        )}

        {tab === 'admins' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>
              App-Admins können Meldungen prüfen und Rechte vergeben. Kein Selbst-Vergabe.
            </p>
            {admins.map(a => (
              <div key={a.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--color-white)', borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.profiles?.full_name || a.profiles?.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>@{a.profiles?.username}</div>
                </div>
                {a.user_id !== user.id && (
                  <button onClick={() => revokeAdmin(a.user_id)} style={{
                    border: 'none', background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '6px 10px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-error)',
                  }}>
                    <UserMinus size={14} /> Entziehen
                  </button>
                )}
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Nutzer suchen & Admin machen</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUsers()}
                  placeholder="Name oder Username…"
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)',
                    background: 'var(--color-white)', fontSize: 14,
                  }}
                />
                <button onClick={searchUsers} style={{
                  border: 'none', background: 'var(--color-accent)', color: 'white', borderRadius: 10,
                  padding: '0 14px', cursor: 'pointer',
                }}><Search size={16} /></button>
              </div>
              {userHits.map(u => {
                const already = admins.some(a => a.user_id === u.id)
                return (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || u.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>@{u.username}</div>
                    </div>
                    {already ? (
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>bereits Admin</span>
                    ) : u.id === user.id ? (
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>du</span>
                    ) : (
                      <button onClick={() => grantAdmin(u.id)} style={{
                        border: 'none', background: 'var(--color-accent)', color: 'white', borderRadius: 8,
                        padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                      }}>
                        <UserPlus size={14} /> Admin machen
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 8px)', minHeight: 360 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>
              Interner Admin-Chat (nicht in der normalen Chat-Liste).
            </p>
            <div style={{
              flex: 1, overflowY: 'auto', background: 'var(--color-white)', borderRadius: 12,
              border: '1px solid var(--color-border)', padding: 12, marginBottom: 8,
            }}>
              {chatMessages.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 13 }}>
                  Noch keine Nachrichten.
                </p>
              )}
              {chatMessages.map(m => (
                <div key={m.id} style={{
                  marginBottom: 10,
                  alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                    {m.profiles?.full_name || m.profiles?.username || 'Admin'}
                  </div>
                  <div style={{
                    display: 'inline-block', maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
                    background: m.sender_id === user.id ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    color: m.sender_id === user.id ? 'white' : 'var(--color-text)', fontSize: 14,
                  }}>
                    {m.is_deleted ? <em>gelöscht</em> : m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Nachricht an Admins…"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)',
                  background: 'var(--color-white)', fontSize: 14,
                }}
              />
              <button onClick={sendChat} style={{
                border: 'none', background: 'var(--color-accent)', color: 'white', borderRadius: 10,
                padding: '0 16px', cursor: 'pointer', fontWeight: 600,
              }}>Senden</button>
            </div>
            {modConvId && (
              <button
                onClick={() => navigate(`/chat/${modConvId}`)}
                style={{ marginTop: 8, border: 'none', background: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 12 }}
              >
                Im vollen Chat öffnen →
              </button>
            )}
          </div>
        )}
      </div>

      {preview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => !busy && setPreview(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto',
              background: 'var(--color-bg)', borderRadius: '20px 20px 0 0', padding: 16,
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Meldung prüfen</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              {preview.group.content_type} · {preview.group.content_id.slice(0, 8)}…
            </div>
            {preview.loading ? <p>Laden…</p> : (
              <div style={{
                padding: 12, borderRadius: 12, background: 'var(--color-white)',
                border: '1px solid var(--color-border)', marginBottom: 12, fontSize: 14, whiteSpace: 'pre-wrap',
              }}>
                {preview.body
                  ? (preview.body.title || preview.body.body || preview.body.content || preview.body.description || preview.body.bio || preview.body.full_name || JSON.stringify(preview.body, null, 2))
                  : <em>Inhalt nicht gefunden (gelöscht?)</em>}
                {preview.body?.moderation_hidden_at && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-error)' }}>Derzeit versteckt</div>
                )}
                {preview.body?.moderation_deleted_at && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-error)' }}>Soft-gelöscht</div>
                )}
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Gründe</div>
              {preview.group.reports.map(r => (
                <div key={r.id} style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>• {r.reason}</div>
              ))}
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Notiz (optional)…"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10,
                border: '1px solid var(--color-border)', fontSize: 14, marginBottom: 12, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACTION_BTNS.map(btn => (
                <button
                  key={btn.key}
                  disabled={busy}
                  onClick={() => runAction(btn)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 10,
                    border: '1px solid var(--color-border)', background: 'var(--color-white)',
                    cursor: busy ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
                    color: btn.key === 'ban' || btn.key === 'delete' ? 'var(--color-error)' : 'var(--color-text)',
                  }}
                >
                  <btn.icon size={14} /> {btn.label}
                </button>
              ))}
              {preview.body?.moderation_hidden_at && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    const { error } = await supabase.rpc('moderation_restore_content', {
                      p_content_type: preview.group.content_type,
                      p_content_id: preview.group.content_id,
                      p_note: note || null,
                    })
                    setBusy(false)
                    if (error) showToast(error.message, 'error')
                    else { showToast('Wiederhergestellt'); loadPreview(preview.group) }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 10,
                    border: '1px solid var(--color-border)', background: 'var(--color-white)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} /> Wiederherstellen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
