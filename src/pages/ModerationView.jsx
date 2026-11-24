import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Flag, MessageSquare, Search, Shield, EyeOff, Trash2,
  CheckCircle2, XCircle, AlertTriangle, Ban, UserPlus, UserMinus, RefreshCw, Eye, User,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useIsAppAdmin } from '../hooks/useIsAppAdmin'
import { useToast } from '../context/ToastContext'
import { useT, tr, getLang } from '../i18n'

const ACTION_BTNS = [
  { key: 'dismiss', get label() { return tr('Verwerfen') }, icon: XCircle, status: 'dismissed', action: 'dismissed' },
  { key: 'hide', get label() { return tr('Verstecken') }, icon: EyeOff, rpc: 'moderation_hide_content', status: 'resolved', action: 'hidden' },
  { key: 'delete', get label() { return tr('Löschen') }, icon: Trash2, rpc: 'moderation_soft_delete_content', status: 'resolved', action: 'soft_deleted' },
  { key: 'warn', get label() { return tr('Verwarnen') }, icon: AlertTriangle, warn: true, status: 'resolved', action: 'warned' },
  { key: 'ban', get label() { return tr('Sperren') }, icon: Ban, ban: true, status: 'resolved', action: 'banned' },
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
  const { t } = useT()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAppAdmin, loading: adminLoading } = useIsAppAdmin()
  const { showToast } = useToast()

  const [tab, setTab] = useState('reports') // reports | hidden | admins | chat
  const [hiddenItems, setHiddenItems] = useState([])
  const [hiddenLoading, setHiddenLoading] = useState(false)
  const [hiddenBusyKey, setHiddenBusyKey] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [accounts, setAccounts] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    if (error) showToast(t('Meldungen laden fehlgeschlagen'), 'error')
    else {
      setReports(data || [])
      // Gemeldete Konten nachladen, damit klar ist, wer gemeint ist
      const ids = [...new Set((data || []).flatMap(r => [r.target_author_id, r.content_type === 'user' ? r.content_id : null]).filter(Boolean))]
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
        setAccounts(Object.fromEntries((profs || []).map(p => [p.id, p])))
      }
    }
    setLoading(false)
  }, [showToast])

  // Versteckte (noch nicht gelöschte) Inhalte aus allen Bereichen
  const loadHidden = useCallback(async () => {
    setHiddenLoading(true)
    const base = (q) => q.not('moderation_hidden_at', 'is', null).is('moderation_deleted_at', null)
      .order('moderation_hidden_at', { ascending: false }).limit(50)
    const [posts, comments, prayers, cposts, cevents] = await Promise.all([
      base(supabase.from('feed_posts').select('id, title, body, moderation_hidden_at, profiles:author_id(full_name, username)')),
      base(supabase.from('feed_comments').select('id, body, moderation_hidden_at, profiles:author_id(full_name, username)')),
      base(supabase.from('personal_prayer_requests').select('id, title, description, moderation_hidden_at, profiles!owner_id(full_name, username)')),
      base(supabase.from('community_posts').select('id, title, content, moderation_hidden_at, profiles:author_id(full_name, username)')),
      base(supabase.from('community_events').select('id, title, description, moderation_hidden_at')),
    ])
    const items = [
      ...(posts.data || []).map(r => ({ type: 'feed_post', label: tr('Beitrag'), id: r.id, text: [r.title, r.body].filter(Boolean).join(' – '), at: r.moderation_hidden_at, author: r.profiles })),
      ...(comments.data || []).map(r => ({ type: 'feed_comment', label: tr('Kommentar'), id: r.id, text: r.body, at: r.moderation_hidden_at, author: r.profiles })),
      ...(prayers.data || []).map(r => ({ type: 'personal_prayer_request', label: tr('Gebet'), id: r.id, text: [r.title, r.description].filter(Boolean).join(' – '), at: r.moderation_hidden_at, author: r.profiles })),
      ...(cposts.data || []).map(r => ({ type: 'community_post', label: tr('Community-Beitrag'), id: r.id, text: [r.title, r.content].filter(Boolean).join(' – '), at: r.moderation_hidden_at, author: r.profiles })),
      ...(cevents.data || []).map(r => ({ type: 'community_event', label: tr('Termin'), id: r.id, text: [r.title, r.description].filter(Boolean).join(' – '), at: r.moderation_hidden_at, author: null })),
    ].sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    setHiddenItems(items)
    setHiddenLoading(false)
  }, [])

  async function restoreHidden(item) {
    setHiddenBusyKey(`${item.type}:${item.id}`)
    const { error } = await supabase.rpc('moderation_restore_content', { p_content_type: item.type, p_content_id: item.id, p_note: null })
    setHiddenBusyKey(null)
    if (error) { showToast(t('Wiederherstellen fehlgeschlagen'), 'error'); return }
    showToast(t('Beitrag wieder sichtbar'))
    setHiddenItems(prev => prev.filter(i => !(i.type === item.type && i.id === item.id)))
  }

  async function deleteHidden(item) {
    if (!window.confirm(t('Beitrag endgültig löschen? Er ist danach für niemanden mehr sichtbar.'))) return
    setHiddenBusyKey(`${item.type}:${item.id}`)
    const { error } = await supabase.rpc('moderation_soft_delete_content', { p_content_type: item.type, p_content_id: item.id, p_note: null })
    setHiddenBusyKey(null)
    if (error) { showToast(t('Löschen fehlgeschlagen'), 'error'); return }
    showToast(t('Beitrag endgültig gelöscht'))
    setHiddenItems(prev => prev.filter(i => !(i.type === item.type && i.id === item.id)))
  }

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
    if (tab === 'hidden' && isAppAdmin) loadHidden()
  }, [tab, isAppAdmin, loadChat, loadHidden])

  function accountIdOf(g) {
    return g.target_author_id || (g.content_type === 'user' ? g.content_id : null)
  }

  function accountLabel(id) {
    const a = accounts[id]
    if (!a) return null
    return { name: a.full_name || a.username || t('Unbekannt'), handle: a.username ? `@${a.username}` : '' }
  }

  async function deleteAccount() {
    const uid = preview?.group && accountIdOf(preview.group)
    if (!uid) return
    setBusy(true)
    const { error } = await supabase.rpc('moderation_delete_user', { p_user_id: uid, p_note: note || null })
    setBusy(false)
    if (error) { showToast(error.message || t('Aktion fehlgeschlagen'), 'error'); return }
    showToast(t('Konto gelöscht'))
    setConfirmDelete(false)
    setPreview(null)
    setNote('')
    await loadReports()
  }

  async function loadPreview(group) {
    setConfirmDelete(false)
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
      showToast(t('Erledigt'))
      setPreview(null)
      setNote('')
      await loadReports()
    } catch (e) {
      showToast(e.message || t('Aktion fehlgeschlagen'), 'error')
    }
    setBusy(false)
  }

  async function searchUsers() {
    const q = userQuery.trim()
    if (q.length < 2) { setUserHits([]); return }
    // Komma, Klammern & Co. sind Steuerzeichen im PostgREST-or()-Filter
    const safe = q.replace(/[,()%*\\"]/g, ' ')
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${safe}%,full_name.ilike.%${safe}%`)
      .limit(15)
    setUserHits(data || [])
  }

  async function grantAdmin(uid) {
    const { error } = await supabase.rpc('grant_app_admin', { p_user_id: uid })
    if (error) showToast(error.message || t('Vergabe fehlgeschlagen'), 'error')
    else { showToast(t('Admin-Rechte vergeben')); loadAdmins(); setUserHits([]) }
  }

  async function revokeAdmin(uid) {
    const { error } = await supabase.rpc('revoke_app_admin', { p_user_id: uid })
    if (error) showToast(error.message || t('Entzug fehlgeschlagen'), 'error')
    else { showToast(t('Admin-Rechte entzogen')); loadAdmins() }
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
    if (error) showToast(t('Nachricht fehlgeschlagen'), 'error')
    else loadChat()
  }

  if (adminLoading) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>{t('Laden…')}</div>
  }

  if (!isAppAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate('/settings')} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ArrowLeft size={20} /></button>
        <p style={{ marginTop: 16 }}>{t('Kein Zugriff.')}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={() => navigate('/settings')} aria-label={t('Zurück')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>{t('Moderation')}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{openCount === 1 ? t('1 offene Meldung') : t('{openCount} offene Meldungen', { openCount })}</div>
        </div>
        <button onClick={loadReports} aria-label={t('Aktualisieren')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
        {[
          { k: 'reports', label: t('Meldungen ({openCount})', { openCount }), icon: Flag },
          { k: 'hidden', label: t('Versteckt'), icon: EyeOff },
          { k: 'admins', label: t('Admins'), icon: Shield },
          { k: 'chat', label: t('Admin-Chat'), icon: MessageSquare },
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
          loading ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{t('Laden…')}</p>
          : grouped.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{t('Keine offenen Meldungen.')}</p>
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
                {g.content_type}{' '}{g.reports.length === 1 ? t('· 1 Meldung') : t('· {length} Meldungen', { length: g.reports.length })}
              </div>
              {accountLabel(accountIdOf(g)) && (
                <div style={{ fontSize: 13, color: 'var(--color-text)', marginTop: 4 }}>
                  {g.content_type === 'user' ? t('Gemeldetes Konto') : t('Konto des Autors')}: <strong>{accountLabel(accountIdOf(g)).name}</strong>{' '}
                  <span style={{ color: 'var(--color-text-secondary)' }}>{accountLabel(accountIdOf(g)).handle}</span>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                {g.reports.map(r => r.reason).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                {new Date(g.reports[0].created_at).toLocaleString((getLang() === 'en' ? 'en-US' : 'de-DE'))}
              </div>
            </button>
          ))
        )}

        {tab === 'hidden' && (
          hiddenLoading ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{t('Laden…')}</p>
          : hiddenItems.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{t('Keine versteckten Beiträge.')}</p>
          : (
            <>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>{t('Versteckt – für andere nicht sichtbar')}</p>
              {hiddenItems.map(item => {
                const key = `${item.type}:${item.id}`
                const authorName = item.author?.full_name || item.author?.username
                return (
                  <div key={key} style={{ marginBottom: 10, padding: 14, borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      <EyeOff size={13} /> {item.label}{authorName ? ` · ${authorName}` : ''}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--color-text)', margin: '6px 0', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{item.text || '—'}</p>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
                      {t('Versteckt am {time}', { time: new Date(item.at).toLocaleString(getLang() === 'en' ? 'en-US' : 'de-DE') })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        disabled={hiddenBusyKey === key}
                        onClick={() => restoreHidden(item)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}
                      >
                        <Eye size={14} /> {t('Wiederherstellen')}
                      </button>
                      <button
                        disabled={hiddenBusyKey === key}
                        onClick={() => deleteHidden(item)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 10, border: 'none', background: 'var(--color-error)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff' }}
                      >
                        <Trash2 size={14} /> {t('Beitrag endgültig löschen')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )
        )}

        {tab === 'admins' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>{t('App-Admins können Meldungen prüfen und Rechte vergeben. Kein Selbst-Vergabe.')}</p>
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
                    <UserMinus size={14} />{' '}{t('Entziehen')}</button>
                )}
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('Nutzer suchen & Admin machen')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUsers()}
                  placeholder={t('Name oder Username…')}
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
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t('bereits Admin')}</span>
                    ) : u.id === user.id ? (
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t('du')}</span>
                    ) : (
                      <button onClick={() => grantAdmin(u.id)} style={{
                        border: 'none', background: 'var(--color-accent)', color: 'white', borderRadius: 8,
                        padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                      }}>
                        <UserPlus size={14} />{' '}{t('Admin machen')}</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 8px)', minHeight: 360 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>{t('Interner Admin-Chat (nicht in der normalen Chat-Liste).')}</p>
            <div style={{
              flex: 1, overflowY: 'auto', background: 'var(--color-white)', borderRadius: 12,
              border: '1px solid var(--color-border)', padding: 12, marginBottom: 8,
            }}>
              {chatMessages.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 13 }}>{t('Noch keine Nachrichten.')}</p>
              )}
              {chatMessages.map(m => (
                <div key={m.id} style={{
                  marginBottom: 10,
                  alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                    {m.profiles?.full_name || m.profiles?.username || t('Admin')}
                  </div>
                  <div style={{
                    display: 'inline-block', maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
                    background: m.sender_id === user.id ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    color: m.sender_id === user.id ? 'white' : 'var(--color-text)', fontSize: 14,
                  }}>
                    {m.is_deleted ? <em>{t('gelöscht')}</em> : m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder={t('Nachricht an Admins…')}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)',
                  background: 'var(--color-white)', fontSize: 14,
                }}
              />
              <button onClick={sendChat} style={{
                border: 'none', background: 'var(--color-accent)', color: 'white', borderRadius: 10,
                padding: '0 16px', cursor: 'pointer', fontWeight: 600,
              }}>{t('Senden')}</button>
            </div>
            {modConvId && (
              <button
                onClick={() => navigate(`/chat/${modConvId}`)}
                style={{ marginTop: 8, border: 'none', background: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 12 }}
              >{t('Im vollen Chat öffnen →')}</button>
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
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{t('Meldung prüfen')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              {preview.group.content_type} · {preview.group.content_id.slice(0, 8)}…
            </div>
            {accountIdOf(preview.group) && (() => {
              const uid = accountIdOf(preview.group)
              const acc = accountLabel(uid)
              const a = accounts[uid]
              const isSelf = uid === user.id
              return (
                <div style={{
                  padding: 12, borderRadius: 12, background: 'var(--color-white)',
                  border: '1px solid var(--color-border)', marginBottom: 12,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    {preview.group.content_type === 'user' ? t('Gemeldetes Konto') : t('Konto des Autors')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {a?.avatar_url ? (
                      <img src={a.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                      }}>{(acc?.name || '?').slice(0, 1).toUpperCase()}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{acc ? acc.name : t('Konto nicht mehr vorhanden')}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{acc?.handle}</div>
                    </div>
                  </div>
                  {acc && !isSelf && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => navigate(`/user/${uid}`)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px',
                          borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
                        }}
                      ><User size={14} /> {t('Profil ansehen')}</button>
                      <button
                        disabled={busy}
                        onClick={() => setConfirmDelete(true)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px',
                          borderRadius: 10, border: '1px solid var(--color-error)', background: 'var(--color-bg)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-error)',
                        }}
                      ><Trash2 size={14} /> {t('Konto löschen')}</button>
                    </div>
                  )}
                  {confirmDelete && acc && (
                    <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--color-bg-secondary)' }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 8 }}>
                        {t('Konto {handle} samt allen Daten endgültig löschen? Das kann nicht rückgängig gemacht werden.', { handle: acc.handle || acc.name })}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          disabled={busy}
                          onClick={() => setConfirmDelete(false)}
                          style={{ flex: 1, padding: '9px 10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-white)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}
                        >{t('Abbrechen')}</button>
                        <button
                          disabled={busy}
                          onClick={deleteAccount}
                          style={{ flex: 1, padding: '9px 10px', borderRadius: 10, border: 'none', background: 'var(--color-error)', cursor: busy ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, color: 'white' }}
                        >{busy ? t('Laden…') : t('Endgültig löschen')}</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
            {preview.loading ? <p>{t('Laden…')}</p> : (
              <div style={{
                padding: 12, borderRadius: 12, background: 'var(--color-white)',
                border: '1px solid var(--color-border)', marginBottom: 12, fontSize: 14, whiteSpace: 'pre-wrap',
              }}>
                {preview.body
                  ? (preview.body.title || preview.body.body || preview.body.content || preview.body.description || preview.body.bio || preview.body.full_name || JSON.stringify(preview.body, null, 2))
                  : <em>{t('Inhalt nicht gefunden (gelöscht?)')}</em>}
                {preview.body?.moderation_hidden_at && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-error)' }}>{t('Derzeit versteckt')}</div>
                )}
                {preview.body?.moderation_deleted_at && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-error)' }}>{t('Soft-gelöscht')}</div>
                )}
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('Gründe')}</div>
              {preview.group.reports.map(r => (
                <div key={r.id} style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>• {r.reason}</div>
              ))}
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('Notiz (optional)…')}
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10,
                border: '1px solid var(--color-border)', fontSize: 14, marginBottom: 12, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACTION_BTNS.filter(btn => !(preview.group.content_type === 'user' && btn.rpc)).map(btn => (
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
                    else { showToast(t('Wiederhergestellt')); loadPreview(preview.group) }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 10,
                    border: '1px solid var(--color-border)', background: 'var(--color-white)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} />{' '}{t('Wiederherstellen')}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
