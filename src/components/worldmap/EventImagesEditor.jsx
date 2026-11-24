import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { compressImage } from '../../lib/image'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useT } from '../../i18n'

// Bilder für die Event-Beschreibung (max. 4). Wird direkt beim Auswählen
// hochgeladen (Bucket feed-photos, Pfad <user>/events/…); `urls` = öffentliche URLs.
export const MAX_EVENT_IMAGES = 4
const BUCKET = 'feed-photos'

export default function EventImagesEditor({ urls, onChange, C }) {
  const { t } = useT()
  const { user } = useAuth()
  const { showToast } = useToast()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handlePick(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_EVENT_IMAGES - urls.length)
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    const added = []
    for (const file of files) {
      try {
        const { blob, contentType, ext } = await compressImage(file, 1280, 0.8)
        const path = `${user.id}/events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: false, cacheControl: '31536000' })
        if (error) throw error
        added.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
      } catch (err) {
        console.error('event image upload failed', err)
        showToast(t('Bild konnte nicht hochgeladen werden'), 'error')
      }
    }
    setUploading(false)
    if (added.length) onChange([...urls, ...added])
  }

  function remove(url) {
    onChange(urls.filter(u => u !== url))
    // Datei best effort aufräumen (nur eigene Uploads sind löschbar)
    const idx = url.indexOf(`/${BUCKET}/`)
    if (idx >= 0) supabase.storage.from(BUCKET).remove([decodeURIComponent(url.slice(idx + BUCKET.length + 2))]).catch(() => {})
  }

  const full = urls.length >= MAX_EVENT_IMAGES

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {urls.map(url => (
          <div key={url} style={{ position: 'relative', width: 72, height: 72 }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label={t('Bild entfernen')}
              style={{
                position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                border: `1.5px solid ${C.bg}`, background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              width: 72, height: 72, borderRadius: 10, cursor: 'pointer',
              border: `1.5px dashed ${C.accent}`, background: 'transparent', color: C.accentDark,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              fontSize: 11, fontWeight: 600,
            }}
          >
            <ImagePlus size={20} />
            {uploading ? t('Lädt…') : t('Bild')}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePick} style={{ display: 'none' }} />
    </div>
  )
}
