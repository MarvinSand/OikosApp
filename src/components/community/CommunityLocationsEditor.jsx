import { useState, useEffect, lazy, Suspense } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useT } from '../../i18n'
const AddressAutocomplete = lazy(() => import('../common/AddressAutocomplete'))

// Weitere Treffpunkte einer Gemeinde/Hausgemeinde (gleiche Community, mehrere Orte).
// Speichert direkt in community_locations (RLS: nur Admins der Community).
const fieldCls = 'w-full bg-bg border-[1.5px] border-warm-3 rounded-xl px-4 py-2.5 font-serif text-[15px] focus:outline-none focus:border-warm-1'

export default function CommunityLocationsEditor({ communityId }) {
  const { t } = useT()
  const { showToast } = useToast()
  const [locations, setLocations] = useState([])
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [place, setPlace] = useState(null)
  const [meetingInfo, setMeetingInfo] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('community_locations')
      .select('id, label, address, latitude, longitude, meeting_info')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true })
    setLocations(data || [])
  }
  useEffect(() => { load() }, [communityId]) // eslint-disable-line react-hooks/exhaustive-deps

  function reset() { setAdding(false); setLabel(''); setPlace(null); setMeetingInfo('') }

  async function handleAdd() {
    if (!place?.lat) return
    setSaving(true)
    const { error } = await supabase.from('community_locations').insert({
      community_id: communityId,
      label: label.trim() || null,
      address: place.address || null,
      latitude: place.lat,
      longitude: place.lng,
      meeting_info: meetingInfo.trim() || null,
    })
    setSaving(false)
    if (error) { showToast(t('Standort konnte nicht gespeichert werden'), 'error'); return }
    showToast(t('Standort hinzugefügt ✓'))
    reset()
    load()
  }

  async function handleRemove(id) {
    if (!window.confirm(t('Diesen Standort entfernen?'))) return
    const { error } = await supabase.from('community_locations').delete().eq('id', id)
    if (error) { showToast(t('Fehler beim Entfernen'), 'error'); return }
    setLocations(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div>
      <label className="font-serif text-sm font-semibold text-dark-muted mb-1.5 block">{t('Weitere Standorte')}</label>
      <p className="font-serif text-[12px] text-dark-muted mb-2 mt-0">
        {t('Trefft ihr euch an wechselnden Orten? Jeder Standort erscheint als eigener Pin auf der Karte – die Gemeinde bleibt dieselbe.')}
      </p>

      <div className="flex flex-col gap-2">
        {locations.map(l => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl border-[1.5px] border-warm-3 px-3 py-2.5">
            <MapPin size={16} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-serif text-[14px] font-semibold text-dark m-0 truncate">{l.label || l.address}</p>
              {l.label && l.address && <p className="font-serif text-[12px] text-dark-muted m-0 truncate">{l.address}</p>}
              {l.meeting_info && <p className="font-serif text-[12px] text-dark-muted m-0 truncate">🕒 {l.meeting_info}</p>}
            </div>
            <button onClick={() => handleRemove(l.id)} aria-label={t('Standort entfernen')} className="border-none bg-transparent cursor-pointer p-1.5 text-dark-muted flex">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-warm-3 bg-transparent py-2.5 font-serif text-[13px] font-semibold text-dark cursor-pointer"
        >
          <Plus size={15} /> {t('Standort hinzufügen')}
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-3 rounded-xl border-[1.5px] border-warm-3 p-3">
          <input type="text" value={label} onChange={e => setLabel(e.target.value.slice(0, 60))} placeholder={t('Bezeichnung (optional), z. B. Bei Familie Müller')} className={fieldCls} />
          <Suspense fallback={<div style={{ height: 44, borderRadius: 10, background: 'var(--color-bg-secondary)' }} />}>
            <AddressAutocomplete value={place} onChange={setPlace} placeholder={t('Adresse des Treffpunkts…')} showMapPreview />
          </Suspense>
          <input type="text" value={meetingInfo} onChange={e => setMeetingInfo(e.target.value.slice(0, 120))} placeholder={t('Treffzeit (optional), z. B. 1. Mittwoch im Monat, 19 Uhr')} className={fieldCls} />
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 rounded-xl border-[1.5px] border-warm-3 bg-transparent py-2.5 font-serif text-[14px] text-dark-muted cursor-pointer">{t('Abbrechen')}</button>
            <button
              onClick={handleAdd}
              disabled={!place?.lat || saving}
              className="flex-1 rounded-xl border-none py-2.5 font-serif text-[14px] font-semibold cursor-pointer"
              style={{ background: place?.lat ? 'var(--color-warm-1)' : 'var(--color-warm-3)', color: 'var(--color-bg)' }}
            >
              {saving ? t('Speichere…') : t('Hinzufügen')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
