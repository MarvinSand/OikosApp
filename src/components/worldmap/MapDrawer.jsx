import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, Users, CalendarDays, X, MapPin } from 'lucide-react'

const C = {
  accent: 'var(--color-accent)',
  accentDark: 'var(--color-accent-dark)',
  text: 'var(--color-text)',
  textSec: 'var(--color-text-secondary)',
  textTer: 'var(--color-text-tertiary)',
  border: 'var(--color-border)',
  bg: 'var(--color-bg)',
  bgSec: 'var(--color-bg-secondary)',
  surfaceBlur: 'var(--color-surface-blur)',
}

// Höhe der schwebenden Ebenen-Kapsel (Griff + Geschwister/Events-Buttons).
// Diese Kapsel schwebt IMMER sichtbar über dem Sheet – auch wenn das Sheet
// komplett eingeklappt/verschwunden ist, bleiben nur noch die Buttons stehen.
export const DRAWER_PEEK = 74

// Umkreis-Stufen in km – null = Weltweit (kein Filter)
const RADIUS_STEPS = [5, 10, 25, 50, 100, 250, 500, 1000, null]

const EVENT_FILTERS = [
  { key: 'alle',           label: 'Alle' },
  { key: 'evangelisieren', label: '📢 Evangelisieren' },
  { key: 'bibellesen',     label: '📖 Bibel lesen' },
  { key: 'lobpreis',       label: '🎵 Lobpreis' },
  { key: 'gemeinschaft',   label: '🤝 Gemeinschaft' },
  { key: 'sonstiges',      label: '✨ Sonstiges' },
]
const KNOWN_EVENT_TYPES = ['evangelisieren', 'bibellesen', 'lobpreis', 'gemeinschaft']

const SIBLING_FILTERS = [
  { key: 'alle',     label: 'Alle' },
  { key: 'stadt',    label: '🏙️ Gleiche Stadt' },
  { key: 'gemeinde', label: '⛪ Gleiche Gemeinde' },
]

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDistance(km) {
  if (km == null) return null
  if (km < 1) return '< 1 km'
  return `${Math.round(km)} km`
}

function formatEventDate(startsAt) {
  if (!startsAt) return null
  const d = new Date(startsAt)
  const date = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time} Uhr`
}

export default function MapDrawer({
  tab, showGeschwister, showEvents, onPillTap,
  users, activities, myProfile, hasOwnLocation,
  radiusKm, onRadiusChange,
  onSelectUser, onSelectActivity,
}) {
  const [expanded, setExpanded] = useState(false)
  const [dragY, setDragY] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('alle')
  const [showFilters, setShowFilters] = useState(false)
  const dragRef = useRef({ active: false, moved: false, startY: 0, startTranslate: 0, lastT: 0, max: 0 })

  // Sheet-Geometrie: feste Eigenhöhe. Bei Kollaps wird das Sheet um seine
  // gesamte Höhe PLUS die Kapsel-Höhe nach unten verschoben, damit es
  // komplett unter die sichtbare Fläche rutscht (sonst würde sein eigener
  // oberer Rand – Griff + Suchleiste – neben der Kapsel hervorschauen).
  // Übrig bleiben dadurch nur die schwebenden Geschwister/Events-Buttons.
  const expandedH = Math.min(Math.round(window.innerHeight * 0.72), 620)
  const collapsedTranslate = expandedH + DRAWER_PEEK
  const currentTranslate = dragY != null ? dragY : (expanded ? 0 : collapsedTranslate)

  // Beim Tab-Wechsel Suche/Filter zurücksetzen
  useEffect(() => {
    setSearch('')
    setFilter('alle')
  }, [tab])

  useEffect(() => {
    function move(e) {
      const d = dragRef.current
      if (!d.active) return
      const y = e.touches ? e.touches[0].clientY : e.clientY
      const dy = y - d.startY
      if (Math.abs(dy) > 6) d.moved = true
      const t = Math.min(Math.max(d.startTranslate + dy, 0), d.max)
      d.lastT = t
      setDragY(t)
    }
    function end() {
      const d = dragRef.current
      if (!d.active) return
      d.active = false
      if (d.moved) setExpanded(d.lastT < d.max / 2)
      setDragY(null)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [])

  function onDragStart(e) {
    const y = e.touches ? e.touches[0].clientY : e.clientY
    dragRef.current = {
      active: true, moved: false,
      startY: y,
      startTranslate: expanded ? 0 : collapsedTranslate,
      lastT: expanded ? 0 : collapsedTranslate,
      max: collapsedTranslate,
    }
  }

  function onHandleClick() {
    if (!dragRef.current.moved) setExpanded(v => !v)
  }

  const radiusIdx = RADIUS_STEPS.indexOf(radiusKm)
  const filterActive = filter !== 'alle' || radiusKm != null

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (tab === 'siblings') {
      let arr = users
      if (q) {
        arr = arr.filter(u =>
          [u.full_name, u.username, u.city, u.country, u.church_name]
            .filter(Boolean).some(s => s.toLowerCase().includes(q))
        )
      }
      if (filter === 'stadt' && myProfile?.city) {
        arr = arr.filter(u => u.city && u.city.toLowerCase() === myProfile.city.toLowerCase())
      }
      if (filter === 'gemeinde' && myProfile?.church_name) {
        arr = arr.filter(u => u.church_name && u.church_name.toLowerCase() === myProfile.church_name.toLowerCase())
      }
      return [...arr].sort((a, b) =>
        (a.distance ?? Infinity) - (b.distance ?? Infinity) ||
        (a.full_name || '').localeCompare(b.full_name || '')
      )
    }
    let arr = activities
    if (q) {
      arr = arr.filter(a =>
        [a.title, a.description, a.location_name]
          .filter(Boolean).some(s => s.toLowerCase().includes(q))
      )
    }
    if (filter !== 'alle') {
      arr = filter === 'sonstiges'
        ? arr.filter(a => !KNOWN_EVENT_TYPES.includes(a.activity_type))
        : arr.filter(a => a.activity_type === filter)
    }
    return [...arr].sort((a, b) =>
      (a.distance ?? Infinity) - (b.distance ?? Infinity) ||
      new Date(a.starts_at || 0) - new Date(b.starts_at || 0)
    )
  }, [tab, users, activities, search, filter, myProfile?.city, myProfile?.church_name])

  const filters = tab === 'siblings' ? SIBLING_FILTERS : EVENT_FILTERS

  return (
    // Wrapper endet an der Oberkante der Bottom-Nav und clippt das Sheet,
    // damit es im eingeklappten Zustand nicht hinter/über der Nav hervorschaut.
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 0,
      bottom: 'var(--bottom-nav-h, 64px)',
      overflow: 'hidden', pointerEvents: 'none', zIndex: 520,
    }}>
      {/* Sheet: Suche/Filter/Liste. Rutscht bei Kollaps um die eigene Höhe
          nach unten und verschwindet dadurch komplett hinter der Kapsel. */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: DRAWER_PEEK - 1,
        height: expandedH,
        pointerEvents: 'auto',
        transform: `translateY(${currentTranslate}px)`,
        transition: dragY != null ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0.25, 1)',
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        border: `1px solid ${C.border}`,
        borderBottom: 'none',
        boxShadow: '0 -6px 24px rgba(0,0,0,0.16)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '42rem',
        margin: '0 auto',
      }}>
      {/* Griff zum Ausklappen, oben im Sheet – nur sichtbar wenn ausgeklappt */}
      <div
        onClick={onHandleClick}
        style={{ padding: '10px 30px 6px', cursor: 'pointer', flexShrink: 0, alignSelf: 'center' }}
      >
        <div style={{ width: 38, height: 4.5, borderRadius: 3, background: C.border }} />
      </div>

      {/* Suchfeld + Filter-Button */}
      <div style={{ display: 'flex', gap: 8, padding: '2px 16px 10px', flexShrink: 0 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: C.bgSec, borderRadius: 12, padding: '9px 12px',
          border: `1px solid ${C.border}`,
        }}>
          <Search size={16} color={C.textTer} style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'siblings' ? 'Geschwister suchen…' : 'Events suchen…'}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: C.text, minWidth: 0,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', padding: 0, display: 'flex', cursor: 'pointer', color: C.textTer }}>
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            position: 'relative', width: 40, borderRadius: 12, flexShrink: 0,
            border: `1px solid ${showFilters ? C.accent : C.border}`,
            background: showFilters ? C.accent : C.bgSec,
            color: showFilters ? '#fff' : C.textSec,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
          title="Filter & Umkreis"
        >
          <SlidersHorizontal size={17} />
          {filterActive && !showFilters && (
            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: C.accent }} />
          )}
        </button>
      </div>

      {/* Filter-Chips + Umkreis-Regler (einklappbar) */}
      {showFilters && (
        <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
            {filters.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                    border: `1px solid ${active ? C.accent : C.border}`,
                    background: active ? C.accent : C.bgSec,
                    color: active ? '#fff' : C.textSec,
                    fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <div style={{
            background: C.bgSec, borderRadius: 12, border: `1px solid ${C.border}`,
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Umkreis</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.accentDark }}>
                {radiusKm == null ? '🌍 Weltweit' : `${radiusKm} km`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={RADIUS_STEPS.length - 1}
              step={1}
              value={radiusIdx === -1 ? RADIUS_STEPS.length - 1 : radiusIdx}
              onChange={e => onRadiusChange(RADIUS_STEPS[Number(e.target.value)])}
              disabled={!hasOwnLocation}
              style={{ width: '100%', accentColor: 'var(--color-accent)', opacity: hasOwnLocation ? 1 : 0.4 }}
            />
            {!hasOwnLocation && (
              <p style={{ fontSize: 11, color: C.textTer, margin: '4px 0 0' }}>
                Setze deinen Standort im Profil, um den Umkreis zu nutzen.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ergebnisliste */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.textTer, textTransform: 'uppercase', letterSpacing: 0.5, margin: '2px 6px 8px' }}>
          {list.length} {tab === 'siblings'
            ? (list.length === 1 ? 'Geschwister' : 'Geschwister')
            : (list.length === 1 ? 'Event' : 'Events')}
          {radiusKm != null && hasOwnLocation ? ` im Umkreis von ${radiusKm} km` : ''}
        </p>

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>{tab === 'siblings' ? '🧭' : '📅'}</div>
            <p style={{ fontSize: 13, color: C.textSec, margin: 0, lineHeight: 1.6 }}>
              {search || filterActive
                ? 'Keine Treffer – passe Suche, Filter oder Umkreis an.'
                : tab === 'siblings'
                  ? 'Noch keine Geschwister auf der Karte. Verbinde dich mit Freunden, um sie hier zu sehen.'
                  : 'Aktuell keine Events. Hoste doch selbst eins über den +‑Button!'}
            </p>
          </div>
        )}

        {tab === 'siblings'
          ? list.map(u => (
              <SiblingRow key={u.id} user={u} onClick={() => { setExpanded(false); onSelectUser(u) }} />
            ))
          : list.map(a => (
              <EventRow key={a.id} activity={a} onClick={() => { setExpanded(false); onSelectActivity(a) }} />
            ))}
      </div>
      </div>

      {/* Schwebende Ebenen-Kapsel – IMMER sichtbar, liegt über dem Sheet und
          dient gleichzeitig als Ziehgriff. Zieht man das Sheet ganz runter,
          bleibt nur noch diese Kapsel mit den beiden Buttons stehen. */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: DRAWER_PEEK, pointerEvents: 'auto',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4,
          cursor: 'grab', touchAction: 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <div style={{ width: 30, height: 4, borderRadius: 3, background: C.surfaceBlur, boxShadow: '0 1px 4px rgba(0,0,0,0.15)', opacity: 0.9 }} />
        <div
          onClick={() => { if (!dragRef.current.moved) setExpanded(true) }}
          style={{
            display: 'flex', gap: 8,
            background: C.surfaceBlur, padding: 5, borderRadius: 999,
            border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 18px rgba(0,0,0,0.16)',
          }}>
          <LayerPill
            active={showGeschwister}
            selected={tab === 'siblings'}
            onClick={() => onPillTap('siblings')}
            icon={<Users size={15} />}
            label="Geschwister"
          />
          <LayerPill
            active={showEvents}
            selected={tab === 'events'}
            onClick={() => onPillTap('events')}
            icon={<CalendarDays size={15} />}
            label="Events"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Ebenen-Button (Geschwister / Events) ─────────────────
function LayerPill({ active, selected, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 999,
        border: 'none',
        background: active ? C.accent : 'transparent',
        color: active ? '#fff' : C.textSec,
        boxShadow: selected && active ? `0 0 0 2px ${C.bgSec}, 0 0 0 3.5px ${C.accent}` : 'none',
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Geschwister-Zeile ────────────────────────────────────
function SiblingRow({ user, onClick }) {
  const sub = [user.city, user.church_name].filter(Boolean).join(' · ')
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 8px', border: 'none', background: 'transparent',
        borderRadius: 14, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: user.avatar_url ? 'transparent' : C.accent,
        border: `2px solid ${C.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {user.avatar_url
          ? <img src={user.avatar_url} referrerPolicy="no-referrer" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{getInitials(user.full_name)}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.full_name || user.username}
        </p>
        {sub && (
          <p style={{ fontSize: 12, color: C.textTer, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </p>
        )}
      </div>
      {user.distance != null && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: C.accentDark, flexShrink: 0,
          background: C.bgSec, border: `1px solid ${C.border}`,
          padding: '4px 9px', borderRadius: 999,
        }}>
          {formatDistance(user.distance)}
        </span>
      )}
    </button>
  )
}

// ─── Event-Zeile ──────────────────────────────────────────
function EventRow({ activity, onClick }) {
  const when = formatEventDate(activity.starts_at)
  const participantCount = (activity.participants || []).length
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 8px', border: 'none', background: 'transparent',
        borderRadius: 14, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: C.bgSec, border: `2px solid ${C.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
      }}>
        {activity.activity_emoji || '📍'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activity.title}
        </p>
        <p style={{ fontSize: 12, color: C.textTer, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
          {when && <span>{when}</span>}
          {when && activity.location_name && <span>·</span>}
          {activity.location_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <MapPin size={11} style={{ flexShrink: 0 }} />{activity.location_name}
            </span>
          )}
          {!when && !activity.location_name && <span>{participantCount} Teilnehmer</span>}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {activity.distance != null && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: C.accentDark,
            background: C.bgSec, border: `1px solid ${C.border}`,
            padding: '4px 9px', borderRadius: 999,
          }}>
            {formatDistance(activity.distance)}
          </span>
        )}
        {participantCount > 0 && (
          <span style={{ fontSize: 10.5, color: C.textTer, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Users size={10} />{participantCount}
          </span>
        )}
      </div>
    </button>
  )
}
