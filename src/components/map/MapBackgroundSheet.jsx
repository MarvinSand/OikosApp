import { useRef, useState } from 'react'
import { X, ImagePlus, Trash2, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { compressImage } from '../../lib/image'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useT } from '../../i18n'

// Hintergrund einer Oikos Map: Farbe (bg_color) oder Foto (bg_image_url).
// Das Foto wird stark verkleinert (max. 1080 px, WebP ~60 %), damit das
// Verschieben/Zoomen der Karte flüssig bleibt.
const BUCKET = 'oikos-map-backgrounds'

const SWATCHES = [
  '#FFFFFF', '#F5EFE6', '#FDE7E4', '#FDEFD6', '#FFF8C9', '#E3F4DC',
  '#D9F0F5', '#DCE9FB', '#E9E1F7', '#F7DCEB', '#2B3A4F', '#14181F',
]

function isDark(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return false
  const n = parseInt(m[1], 16)
  const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L < 0.35
}

// Style-Objekt für den Container hinter dem MapCanvas. Setzt auch die
// Textfarben passend zum Untergrund, damit Namen lesbar bleiben.
export function mapBackgroundStyle(map) {
  if (!map?.bg_image_url && !map?.bg_color) return {}
  const light = !!map.bg_image_url || isDark(map.bg_color) // helle Schrift nötig?
  const vars = light
    ? { '--color-text': '#FFFFFF', '--color-text-muted': 'rgba(255,255,255,0.8)', '--color-text-light': 'rgba(255,255,255,0.7)', '--color-text-secondary': 'rgba(255,255,255,0.8)' }
    : { '--color-text': '#1C1C1E', '--color-text-muted': '#555555', '--color-text-light': '#6B6B6B', '--color-text-secondary': '#555555' }
  if (map.bg_image_url) {
    return {
      ...vars,
      backgroundColor: map.bg_color || '#14181F',
      backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${map.bg_image_url}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { ...vars, backgroundColor: map.bg_color }
}

export default function MapBackgroundSheet({ map, updateMap, onClose }) {
  const { t } = useT()
  const { user } = useAuth()
  const { showToast } = useToast()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  async function save(updates) {
    try {
      await updateMap(map.id, updates)
    } catch {
      showToast(t('Fehler beim Speichern'), 'error')
    }
  }

  async function pickColor(color) {
    // Farbe gewählt → Foto ersetzen (Farbe oder Foto, nicht beides)
    await save({ bg_color: color, bg_image_url: null })
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { blob, contentType, ext } = await compressImage(file, 1080, 0.6)
      const path = `${user.id}/${map.id}.${ext}`
      await supabase.storage.from(BUCKET).remove([`${user.id}/${map.id}.jpg`, `${user.id}/${map.id}.webp`])
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType, upsert: true, cacheControl: '31536000' })
      if (error) throw error
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      await updateMap(map.id, { bg_image_url: `${data.publicUrl}?t=${Date.now()}`, bg_color: null })
      showToast(t('Hintergrund aktualisiert ✓'))
    } catch (err) {
      console.error('[MapBackground] Upload fehlgeschlagen:', err)
      showToast(t('Fehler beim Hochladen'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setBusy(true)
    try {
      if (map.bg_image_url) {
        await supabase.storage.from(BUCKET).remove([`${user.id}/${map.id}.jpg`, `${user.id}/${map.id}.webp`])
      }
      await updateMap(map.id, { bg_color: null, bg_image_url: null })
      showToast(t('Hintergrund zurückgesetzt'))
    } catch {
      showToast(t('Fehler beim Entfernen'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const hasBg = !!(map.bg_color || map.bg_image_url)

  return (
    <>
      {/* Kein Abdunkeln – so sieht man den neuen Hintergrund sofort */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        animation: 'sheetSlideUp 0.3s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {t('Hintergrund')}
          </h3>
          <button onClick={onClose} aria-label={t('Schließen')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <p style={label}>{t('Farbe')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          {SWATCHES.map(c => {
            const active = !map.bg_image_url && map.bg_color?.toLowerCase() === c.toLowerCase()
            return (
              <button
                key={c}
                onClick={() => pickColor(c)}
                aria-label={c}
                style={{
                  width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', padding: 0,
                  backgroundColor: c,
                  border: active ? '3px solid var(--color-accent)' : '1.5px solid rgba(128,128,128,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {active && <Check size={16} color={isDark(c) ? '#fff' : '#111'} />}
              </button>
            )
          })}
          {/* Eigene Farbe */}
          <label
            style={{
              width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', position: 'relative',
              border: '1.5px solid rgba(128,128,128,0.4)',
              background: 'conic-gradient(#f66, #fc6, #6f6, #6cf, #96f, #f6c, #f66)',
            }}
            title={t('Eigene Farbe')}
          >
            <input
              type="color"
              value={map.bg_color || '#ffffff'}
              onChange={e => pickColor(e.target.value.toUpperCase())}
              style={{ position: 'absolute', inset: -8, width: 60, height: 60, opacity: 0, cursor: 'pointer' }}
            />
          </label>
        </div>

        <p style={label}>{t('Eigenes Foto')}</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', cursor: busy ? 'default' : 'pointer',
              backgroundColor: 'var(--color-warm-1)', color: 'var(--color-bg)',
              fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, opacity: busy ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <ImagePlus size={16} /> {busy ? t('Lädt…') : map.bg_image_url ? t('Foto ändern') : t('Foto auswählen')}
          </button>
          {hasBg && (
            <button
              onClick={reset}
              disabled={busy}
              style={{
                padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--color-warm-3)', background: 'none',
                cursor: busy ? 'default' : 'pointer', color: 'var(--color-text-muted)',
                fontFamily: 'Lora, serif', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Trash2 size={15} /> {t('Zurücksetzen')}
            </button>
          )}
        </div>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
          {t('Das Foto wird automatisch verkleinert, damit die Karte flüssig bleibt. Wer deine Map sehen darf, sieht auch den Hintergrund.')}
        </p>
      </div>
    </>
  )
}

const label = { fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }
