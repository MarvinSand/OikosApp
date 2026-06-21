import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ArrowLeft, Search, MoreVertical, MessageCircle, SlidersHorizontal, X, MapPin, Flag, Church,
} from 'lucide-react'
import { useJsApiLoader } from '@react-google-maps/api'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useFriendships } from '../../hooks/useFriendships'
import { useToast } from '../../context/ToastContext'
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../lib/googleMaps'

// ─── Helpers ──────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ profile, size = 44 }) {
  const name = profile?.full_name || profile?.username || '?'
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0, border: '1px solid var(--color-border)',
        }}
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
        fontSize: size * 0.34, fontWeight: 700,
        border: '1px solid var(--color-border)',
      }}
    >
      {getInitials(name)}
    </div>
  )
}

// ─── Google Places city/country autocomplete ──────────────────
function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

function PlacesAutocompleteInput({ value, onChange, types, placeholder }) {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS)
  const [input, setInput] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const tokenRef = useRef(null)

  useEffect(() => { setInput(value || '') }, [value])

  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places) return
    if (!tokenRef.current && window.google.maps.places.AutocompleteSessionToken) {
      tokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [isLoaded])

  const doSearch = useMemo(
    () =>
      debounce((q) => {
        if (!isLoaded || !window.google?.maps?.places?.AutocompleteService) {
          setSuggestions([])
          return
        }
        const service = new window.google.maps.places.AutocompleteService()
        service.getPlacePredictions(
          { input: q, types, language: 'de', sessionToken: tokenRef.current },
          (predictions, status) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
              setSuggestions([])
              return
            }
            setSuggestions(predictions)
          }
        )
      }, 250),
    [isLoaded, types]
  )

  function handleChange(e) {
    const v = e.target.value
    setInput(v)
    setOpen(true)
    if (v.trim().length >= 2) doSearch(v.trim())
    else setSuggestions([])
    onChange(v)
  }

  function pick(p) {
    const name = p.structured_formatting?.main_text || p.description
    setInput(name)
    setOpen(false)
    setSuggestions([])
    onChange(name)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={isLoaded ? placeholder : 'Karte wird geladen…'}
        autoFocus
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid var(--color-accent)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 14,
          color: 'var(--color-text)',
          outline: 'none',
        }}
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 5,
            overflow: 'hidden',
          }}
        >
          {suggestions.map(s => (
            <button
              key={s.place_id}
              onMouseDown={() => pick(s)}
              style={{
                display: 'block', width: '100%',
                padding: '10px 12px', textAlign: 'left',
                border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 13, color: 'var(--color-text)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{s.structured_formatting?.main_text || s.description}</div>
              {s.structured_formatting?.secondary_text && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {s.structured_formatting.secondary_text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Friend row with 3-dot menu ───────────────────────────────
function FriendRow({ profile, onProfile, onMessage, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--color-border)',
        position: 'relative',
      }}
    >
      <button
        onClick={onProfile}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flex: 1,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, textAlign: 'left', minWidth: 0,
        }}
      >
        <Avatar profile={profile} />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 15, fontWeight: 600, color: 'var(--color-text)',
              margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {profile.full_name || profile.username || '—'}
          </p>
          {profile.username && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              @{profile.username}
            </p>
          )}
        </div>
      </button>

      <button
        onClick={onMessage}
        aria-label="Nachricht schreiben"
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          padding: 6, color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center',
        }}
      >
        <MessageCircle size={18} />
      </button>

      <button
        onClick={() => setMenuOpen(v => !v)}
        aria-label="Mehr"
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          padding: 6, color: 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center',
        }}
      >
        <MoreVertical size={18} />
      </button>

      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          />
          <div
            style={{
              position: 'absolute', right: 4, top: '100%',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
              zIndex: 51, minWidth: 200,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => { setMenuOpen(false); onProfile() }}
              style={menuItemStyle()}
            >
              Profil öffnen
            </button>
            <button
              onClick={() => { setMenuOpen(false); onMessage() }}
              style={menuItemStyle()}
            >
              Nachricht schreiben
            </button>
            <button
              onClick={() => { setMenuOpen(false); onRemove() }}
              style={menuItemStyle('var(--color-error)')}
            >
              Verbindung entfernen
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function menuItemStyle(color) {
  return {
    display: 'block', width: '100%',
    padding: '12px 14px', border: 'none', background: 'none',
    fontSize: 14, color: color || 'var(--color-text)',
    cursor: 'pointer', textAlign: 'left',
  }
}

// ─── Main overlay ─────────────────────────────────────────────
export default function ConnectionsOverlay({ onClose, profileUserId }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { friends, loading, removeFriend, getFriendshipStatus, sendRequest, acceptRequest, getFriendship } = useFriendships()
  const { showToast } = useToast()

  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(null) // 'city'|'country'|'church'|null
  const [cityFilter, setCityFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [churchFilter, setChurchFilter] = useState('')
  const [profileDetails, setProfileDetails] = useState({})
  const [notConnected, setNotConnected] = useState([])
  const [sendingId, setSendingId] = useState(null)

  // Determine whose connections we're showing (defaults to current user)
  const targetUserId = profileUserId || user?.id

  // For own profile we use `friends` from useFriendships; for foreign profile we'd need
  // a separate fetch. For now this overlay is shown on own profile only.
  const isOwn = targetUserId === user?.id

  // Load city / country / church_name for connection filtering
  useEffect(() => {
    if (!isOwn || friends.length === 0) return
    const ids = friends.map(f => f.otherUser?.id).filter(Boolean)
    if (ids.length === 0) return
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, city, country, church_name')
        .in('id', ids)
      const map = {}
      ;(data || []).forEach(p => { map[p.id] = p })
      setProfileDetails(map)
    })()
  }, [friends, isOwn])

  const enriched = useMemo(() => {
    return friends
      .map(f => {
        const o = f.otherUser
        if (!o) return null
        const extra = profileDetails[o.id] || {}
        return {
          friendshipId: f.id,
          id: o.id,
          full_name: o.full_name,
          username: o.username,
          avatar_url: o.avatar_url,
          is_christian: o.is_christian,
          city: extra.city,
          country: extra.country,
          church_name: extra.church_name,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const an = (a.full_name || a.username || '').toLocaleLowerCase('de')
        const bn = (b.full_name || b.username || '').toLocaleLowerCase('de')
        return an.localeCompare(bn, 'de')
      })
  }, [friends, profileDetails])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enriched.filter(p => {
      if (q && !((p.full_name || '').toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q))) {
        return false
      }
      if (cityFilter && !(p.city || '').toLowerCase().includes(cityFilter.toLowerCase())) return false
      if (countryFilter && !(p.country || '').toLowerCase().includes(countryFilter.toLowerCase())) return false
      if (churchFilter && !(p.church_name || '').toLowerCase().includes(churchFilter.toLowerCase())) return false
      return true
    })
  }, [enriched, query, cityFilter, countryFilter, churchFilter])

  // Noch nicht verbundene Geschwister laden (nur eigenes Profil)
  useEffect(() => {
    if (!isOwn || !user) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, is_christian, avatar_url, city, country, church_name')
        .neq('id', user.id)
      if (cancelled || !data) return
      const connectedIds = new Set(friends.map(f => f.otherUser?.id).filter(Boolean))
      setNotConnected(data.filter(p => !connectedIds.has(p.id)))
    })()
    return () => { cancelled = true }
  }, [isOwn, user, friends])

  const filteredNotConnected = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notConnected
      .filter(p => {
        if (q && !((p.full_name || '').toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q))) return false
        if (cityFilter && !(p.city || '').toLowerCase().includes(cityFilter.toLowerCase())) return false
        if (countryFilter && !(p.country || '').toLowerCase().includes(countryFilter.toLowerCase())) return false
        if (churchFilter && !(p.church_name || '').toLowerCase().includes(churchFilter.toLowerCase())) return false
        return true
      })
      .sort((a, b) => (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '', 'de'))
  }, [notConnected, query, cityFilter, countryFilter, churchFilter])

  async function handleConnect(id) {
    setSendingId(id)
    try {
      await sendRequest(id)
      showToast('Anfrage gesendet ✓')
    } catch (e) {
      showToast(e.message || 'Fehler', 'error')
    } finally {
      setSendingId(null)
    }
  }

  async function handleAcceptFor(id) {
    setSendingId(id)
    try {
      const f = getFriendship(id)
      if (f) { await acceptRequest(f.id); showToast('Verbunden ✓') }
    } catch (e) {
      showToast(e.message || 'Fehler', 'error')
    } finally {
      setSendingId(null)
    }
  }

  const hasAnyFilter = !!(cityFilter || countryFilter || churchFilter)

  async function handleStartChat(otherId) {
    try {
      const { data: convId, error } = await supabase.rpc('start_direct_chat', { other_user_id: otherId })
      if (error) throw error
      onClose()
      navigate(`/chat/${convId}`)
    } catch {
      showToast('Fehler beim Öffnen des Chats', 'error')
    }
  }

  async function handleRemove(friendshipId) {
    if (!window.confirm('Verbindung wirklich entfernen?')) return
    await removeFriend(friendshipId)
    showToast('Verbindung entfernt', 'info')
  }

  function handleProfile(id) {
    onClose()
    navigate(`/user/${id}`)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        backgroundColor: 'var(--color-bg)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 52, padding: '0 8px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Zurück"
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--color-text)',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
          Geschwister ({enriched.length})
        </h2>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search
            size={15}
            style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name oder Username suchen…"
            style={{
              width: '100%', padding: '11px 12px 11px 36px',
              borderRadius: 10, border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              fontSize: 14, color: 'var(--color-text)', display: 'block',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter chips */}
        <div
          className="hide-scrollbar"
          style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}
        >
          {[
            { key: null,      label: <><SlidersHorizontal size={12} style={{ verticalAlign: '-1px' }} /> Alle</> },
            { key: 'city',    label: <><MapPin size={12} style={{ verticalAlign: '-1px' }} /> {cityFilter || 'Stadt'}</> },
            { key: 'country', label: <><Flag size={12} style={{ verticalAlign: '-1px' }} /> {countryFilter || 'Land'}</> },
            { key: 'church',  label: <><Church size={12} style={{ verticalAlign: '-1px' }} /> {churchFilter || 'Gemeinde'}</> },
          ].map(f => {
            const isOn =
              (f.key === null && !hasAnyFilter) ||
              activeFilter === f.key ||
              (f.key === 'city' && cityFilter) ||
              (f.key === 'country' && countryFilter) ||
              (f.key === 'church' && churchFilter)
            return (
              <button
                key={String(f.key)}
                onClick={() => {
                  if (f.key === null) {
                    setCityFilter(''); setCountryFilter(''); setChurchFilter('')
                    setActiveFilter(null)
                  } else {
                    setActiveFilter(activeFilter === f.key ? null : f.key)
                  }
                }}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 999,
                  border: `1px solid ${isOn ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: isOn ? 'var(--color-accent-light)' : 'transparent',
                  color: isOn ? 'var(--color-accent-dark)' : 'var(--color-text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            )
          })}
          {hasAnyFilter && (
            <button
              onClick={() => { setCityFilter(''); setCountryFilter(''); setChurchFilter(''); setActiveFilter(null) }}
              style={{
                flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 10px', borderRadius: 999,
                border: 'none', background: 'none',
                color: 'var(--color-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <X size={12} /> Zurücksetzen
            </button>
          )}
        </div>

        {/* Filter input (city/country via Google Places, church text) */}
        {activeFilter === 'city' && (
          <div style={{ marginBottom: 14 }}>
            <PlacesAutocompleteInput
              value={cityFilter}
              onChange={v => setCityFilter(v)}
              types={['(cities)']}
              placeholder="Stadt suchen…"
            />
          </div>
        )}
        {activeFilter === 'country' && (
          <div style={{ marginBottom: 14 }}>
            <PlacesAutocompleteInput
              value={countryFilter}
              onChange={v => setCountryFilter(v)}
              types={['country']}
              placeholder="Land suchen…"
            />
          </div>
        )}
        {activeFilter === 'church' && (
          <div style={{ marginBottom: 14 }}>
            <input
              autoFocus
              type="text"
              value={churchFilter}
              onChange={e => setChurchFilter(e.target.value)}
              placeholder="Gemeinde suchen…"
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 10, border: '1px solid var(--color-accent)',
                backgroundColor: 'var(--color-bg)',
                fontSize: 14, color: 'var(--color-text)', display: 'block',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* List */}
        {loading && (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            Lade…
          </p>
        )}
        {!loading && filtered.length === 0 && (
          <p style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {query || hasAnyFilter ? 'Keine Treffer' : 'Noch keine Geschwister verbunden'}
          </p>
        )}
        {!loading && filtered.map(p => (
          <FriendRow
            key={p.friendshipId}
            profile={p}
            onProfile={() => handleProfile(p.id)}
            onMessage={() => handleStartChat(p.id)}
            onRemove={() => handleRemove(p.friendshipId)}
          />
        ))}

        {/* Noch nicht verbundene Geschwister */}
        {!loading && isOwn && filteredNotConnected.length > 0 && (
          <>
            <p style={{
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
              color: 'var(--color-text-muted)', margin: '22px 0 4px',
            }}>
              Noch nicht verbunden ({filteredNotConnected.length})
            </p>
            {filteredNotConnected.map(p => (
              <NotConnectedRow
                key={p.id}
                profile={p}
                status={getFriendshipStatus(p.id)}
                busy={sendingId === p.id}
                onProfile={() => handleProfile(p.id)}
                onConnect={() => handleConnect(p.id)}
                onAccept={() => handleAcceptFor(p.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Zeile für noch nicht verbundene Geschwister ──────────────
function NotConnectedRow({ profile, status, busy, onProfile, onConnect, onAccept }) {
  const btnBase = {
    border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700,
    cursor: busy ? 'default' : 'pointer', flexShrink: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
      <button
        onClick={onProfile}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', minWidth: 0 }}
      >
        <Avatar profile={profile} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.full_name || profile.username || '—'}
          </p>
          {profile.username && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>@{profile.username}</p>
          )}
        </div>
      </button>

      {status === 'sent' ? (
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600, padding: '8px 12px' }}>Angefragt</span>
      ) : status === 'received' ? (
        <button onClick={onAccept} disabled={busy} style={{ ...btnBase, backgroundColor: 'var(--color-accent)', color: '#fff' }}>
          {busy ? '…' : 'Annehmen'}
        </button>
      ) : (
        <button onClick={onConnect} disabled={busy} style={{ ...btnBase, backgroundColor: 'var(--color-accent)', color: '#fff' }}>
          {busy ? '…' : 'Verbinden'}
        </button>
      )}
    </div>
  )
}
