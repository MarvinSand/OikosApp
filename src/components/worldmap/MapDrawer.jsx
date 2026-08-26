import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, Users, CalendarDays, X, MapPin, Repeat, Home } from 'lucide-react'
import { nextOccurrence, formatRecurrenceLabel, isRecurring } from '../../lib/recurrence'

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

// Höhe des Kopfbereichs (Griff + Geschwister/Events-Buttons). Der Kopf ist
// Teil des Sheets: beim Hochziehen wandert er mit nach oben und bleibt dort
// stehen; im eingeklappten Zustand bleibt nur er sichtbar (Rest des Sheets
// rutscht dahinter weg).
export const DRAWER_PEEK = 74

// Zusätzliche Panel-Höhe im 'half'-Zustand (nur Suchzeile, keine Liste)
const HALF_PANEL_H = 66

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
  tab, showGeschwister, showEvents, showGemeinden, onPillTap,
  users, activities, gemeinden = [], myProfile, hasOwnLocation,
  radiusKm, onRadiusChange,
  onSelectUser, onSelectActivity, onSelectGemeinde, reopenListKey,
}) {
  // 'closed' = nur Kopf sichtbar · 'half' = + Suchleiste (Tap auf Geschwister/
  // Events landet hier) · 'full' = komplettes Sheet mit Liste (Tap in die
  // Suche, Filter öffnen oder weiter hochziehen)
  const [level, setLevel] = useState('closed')
  const [dragY, setDragY] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('alle')
  const [showFilters, setShowFilters] = useState(false)
  const dragRef = useRef({ active: false, moved: false, startY: 0, startTranslate: 0, lastT: 0, max: 0 })
  const didMountReopen = useRef(false)

  // Sheet-Geometrie: feste Eigenhöhe, Kopf (Griff+Buttons) ist Teil davon.
  // 'closed' zeigt nur den Kopf, 'half' zusätzlich die Suchzeile, 'full' das
  // komplette Sheet inkl. Liste. Beim Hochziehen wandert der Kopf an die
  // Oberkante des Sheets und bleibt dort stehen.
  const expandedH = Math.min(Math.round(window.innerHeight * 0.72), 620)
  const closedTranslate = expandedH - DRAWER_PEEK
  const halfTranslate = Math.max(0, expandedH - (DRAWER_PEEK + HALF_PANEL_H))
  const LEVEL_TRANSLATE = { closed: closedTranslate, half: halfTranslate, full: 0 }
  const currentTranslate = dragY != null ? dragY : LEVEL_TRANSLATE[level]

  // Beim Tab-Wechsel Suche/Filter zurücksetzen
  useEffect(() => {
    setSearch('')
    setFilter('alle')
  }, [tab])

  // Nach Schließen eines Event-/Personen-Details (X-Button), das von der
  // Liste aus geöffnet wurde, wieder zur vollen Liste zurückspringen.
  useEffect(() => {
    if (!didMountReopen.current) { didMountReopen.current = true; return }
    setLevel('full')
  }, [reopenListKey])

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
      if (d.moved) {
        // Nächstgelegene der drei Raststufen nach dem Loslassen
        let best = 'closed', bestDist = Infinity
        for (const key of ['closed', 'half', 'full']) {
          const dist = Math.abs(d.lastT - LEVEL_TRANSLATE[key])
          if (dist < bestDist) { bestDist = dist; best = key }
        }
        setLevel(best)
      }
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
  }, [LEVEL_TRANSLATE])

  function onDragStart(e) {
    const y = e.touches ? e.touches[0].clientY : e.clientY
    const start = LEVEL_TRANSLATE[level]
    dragRef.current = {
      active: true, moved: false,
      startY: y,
      startTranslate: start,
      lastT: start,
      max: closedTranslate,
    }
  }

  function onHandleClick() {
    if (!dragRef.current.moved) setLevel(l => (l === 'closed' ? 'full' : 'closed'))
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
    if (tab === 'gemeinden') {
      let arr = gemeinden
      if (q) {
        arr = arr.filter(g =>
          [g.name, g.description, g.address].filter(Boolean).some(s => s.toLowerCase().includes(q))
        )
      }
      return [...arr].sort((a, b) =>
        (a.distance ?? Infinity) - (b.distance ?? Infinity) ||
        (a.name || '').localeCompare(b.name || '')
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
      (nextOccurrence(a)?.getTime() ?? 0) - (nextOccurrence(b)?.getTime() ?? 0)
    )
  }, [tab, users, activities, gemeinden, search, filter, myProfile?.city, myProfile?.church_name])

  const filters = tab === 'siblings' ? SIBLING_FILTERS : tab === 'gemeinden' ? [] : EVENT_FILTERS

  return (
    // Wrapper endet an der Oberkante der Bottom-Nav und clippt das Sheet,
    // damit es im eingeklappten Zustand nicht hinter/über der Nav hervorschaut.
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 0,
      bottom: 'var(--bottom-nav-h, 64px)',
      overflow: 'hidden', pointerEvents: 'none', zIndex: 520,
    }}>
      {/* Klick auf die Karte bei ausgeklapptem Menü schließt es wieder */}
      {level !== 'closed' && (
        <div
          onClick={() => setLevel('closed')}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
        />
      )}

      {/* Sheet: Kopf (Griff+Buttons, transparent) + Panel (Suche/Filter/
          Liste, eigener schwarzer/weißer Hintergrund). Beide wandern
          zusammen – der Kopf bleibt dabei immer OHNE eigenen Hintergrund,
          sodass die Buttons frei über der Karte schweben statt in einem
          durchgehenden Feld zu stecken. Beim Hochziehen wandert der Kopf mit
          an die Oberkante und bleibt dort stehen; eingeklappt bleibt nur er
          sichtbar (das Panel rutscht komplett dahinter weg). */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: expandedH,
        pointerEvents: 'auto',
        transform: `translateY(${currentTranslate}px)`,
        transition: dragY != null ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0.25, 1)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '42rem',
        margin: '0 auto',
      }}>
      {/* Kopf: Griff + Geschwister/Events-Kapsel (immer sichtbar, ziehbar, transparent) */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          height: DRAWER_PEEK, flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'grab', touchAction: 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <div
          onClick={onHandleClick}
          style={{ padding: '2px 30px', cursor: 'pointer' }}
        >
          <div style={{ width: 34, height: 4.5, borderRadius: 3, background: C.surfaceBlur, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} />
        </div>
        <div
          onClick={() => { if (!dragRef.current.moved) setLevel(l => (l === 'closed' ? 'half' : l)) }}
          style={{
            display: 'flex', gap: 8,
            background: C.surfaceBlur, padding: 5, borderRadius: 999,
            border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
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
          <LayerPill
            active={showGemeinden}
            selected={tab === 'gemeinden'}
            onClick={() => onPillTap('gemeinden')}
            icon={<Home size={15} />}
            label="Gemeinden"
          />
        </div>
      </div>

      {/* Panel: eigener Hintergrund, nur unter Suche/Filter/Liste */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        border: `1px solid ${C.border}`,
        borderBottom: 'none',
        boxShadow: '0 -6px 24px rgba(0,0,0,0.16)',
      }}>
      {/* Suchfeld + Filter-Button */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 10px', flexShrink: 0 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: C.bgSec, borderRadius: 12, padding: '9px 12px',
          border: `1px solid ${C.border}`,
        }}>
          <Search size={16} color={C.textTer} style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setLevel('full')}
            placeholder={tab === 'siblings' ? 'Geschwister suchen…' : tab === 'gemeinden' ? 'Gemeinden suchen…' : 'Events suchen…'}
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
          onClick={() => setShowFilters(v => { const next = !v; if (next) setLevel('full'); return next })}
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
          {list.length} {tab === 'siblings' ? 'Geschwister' : tab === 'gemeinden' ? (list.length === 1 ? 'Gemeinde' : 'Gemeinden') : (list.length === 1 ? 'Event' : 'Events')}
          {radiusKm != null && hasOwnLocation ? ` im Umkreis von ${radiusKm} km` : ''}
        </p>

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>{tab === 'siblings' ? '🧭' : tab === 'gemeinden' ? '🏠' : '📅'}</div>
            <p style={{ fontSize: 13, color: C.textSec, margin: 0, lineHeight: 1.6 }}>
              {search || filterActive
                ? 'Keine Treffer – passe Suche, Filter oder Umkreis an.'
                : tab === 'siblings'
                  ? 'Noch keine Geschwister auf der Karte. Verbinde dich mit Freunden, um sie hier zu sehen.'
                  : tab === 'gemeinden'
                    ? 'Noch keine Gemeinden in der Nähe. Trage eure Hausgemeinde ein!'
                    : 'Aktuell keine Events. Hoste doch selbst eins über den +‑Button!'}
            </p>
          </div>
        )}

        {tab === 'siblings'
          ? list.map(u => (
              <SiblingRow key={u.id} user={u} onClick={() => { setLevel('closed'); onSelectUser(u) }} />
            ))
          : tab === 'gemeinden'
            ? list.map(g => (
                <GemeindeRow key={g.id} gemeinde={g} onClick={() => { setLevel('closed'); onSelectGemeinde(g) }} />
              ))
            : list.map(a => (
                <EventRow key={a.id} activity={a} onClick={() => { setLevel('closed'); onSelectActivity(a) }} />
              ))}
      </div>
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

// ─── Gemeinde-Zeile ───────────────────────────────────────
function GemeindeRow({ gemeinde, onClick }) {
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
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: gemeinde.avatar_url ? 'transparent' : C.accentDark,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 19,
      }}>
        {gemeinde.avatar_url
          ? <img src={gemeinde.avatar_url} referrerPolicy="no-referrer" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : '🏠'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {gemeinde.name}
        </p>
        {gemeinde.address && (
          <p style={{ fontSize: 12, color: C.textTer, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} style={{ flexShrink: 0 }} />{gemeinde.address}
          </p>
        )}
      </div>
      {gemeinde.distance != null && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: C.accentDark, flexShrink: 0,
          background: C.bgSec, border: `1px solid ${C.border}`,
          padding: '4px 9px', borderRadius: 999,
        }}>
          {formatDistance(gemeinde.distance)}
        </span>
      )}
    </button>
  )
}

// ─── Event-Zeile ──────────────────────────────────────────
function EventRow({ activity, onClick }) {
  const recurring = isRecurring(activity)
  const nextDate = nextOccurrence(activity)
  const when = nextDate ? formatEventDate(nextDate.toISOString()) : (recurring ? 'Serie beendet' : null)
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
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0, position: 'relative',
        background: C.bgSec, border: `2px solid ${C.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
      }}>
        {activity.activity_emoji || '📍'}
        {recurring && (
          <span style={{
            position: 'absolute', bottom: -3, right: -3, width: 17, height: 17, borderRadius: '50%',
            background: C.accent, border: `1.5px solid ${C.bg}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title={formatRecurrenceLabel(activity)}>
            <Repeat size={10} color="#fff" />
          </span>
        )}
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
          {(when || activity.location_name) && <span>·</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Users size={11} />{participantCount}
          </span>
        </p>
      </div>
      {activity.distance != null && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: C.accentDark, flexShrink: 0,
          background: C.bgSec, border: `1px solid ${C.border}`,
          padding: '4px 9px', borderRadius: 999,
        }}>
          {formatDistance(activity.distance)}
        </span>
      )}
    </button>
  )
}
