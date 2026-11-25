import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { compressImage } from '../../lib/image'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import { useT } from '../../i18n'

// Event-Bild (statt Emoji in Pin, Listen und Detail). Wird beim Auswählen
// komprimiert (400 px, siehe Dauerregel Bilder) und in feed-photos hochgeladen.
const BUCKET = 'feed-photos'

export default function EventAvatarPicker({ url, emoji, onChange, C }) {
  const { t } = useT()
  const { user } = useAuth()
  const { showToast } = useToast()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  async function handlePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { blob, contentType, ext } = await compressImage(file, 400, 0.8)
      const path = `${user.id}/events/avatar-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: false, cacheControl: '31536000' })
      if (error) throw error
      removeFile(url)
      onChange(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
    } catch (err) {
      console.error('event avatar upload failed', err)
      showToast(t('Bild konnte nicht hochgeladen werden'), 'error')
    } finally {
      setBusy(false)
    }
  }

  function removeFile(u) {
    const idx = u ? u.indexOf(`/${BUCKET}/`) : -1
    if (idx >= 0) supabase.storage.from(BUCKET).remove([decodeURIComponent(u.slice(idx + BUCKET.length + 2))]).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label={t('Event-Bild ändern')}
        style={{
          position: 'relative', width: 64, height: 64, borderRadius: 18, padding: 0, flexShrink: 0, cursor: 'pointer', overflow: 'hidden',
          border: `2px solid ${C.accent}`, background: C.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
        }}
      >
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (emoji || '📍')}
        <span style={{
          position: 'absolute', right: 2, bottom: 2, width: 20, height: 20, borderRadius: '50%',
          background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Camera size={12} />
        </span>
      </button>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
          {busy ? t('Lädt…') : url ? t('Event-Bild ändern') : t('Eigenes Event-Bild (optional)')}
        </p>
        {url && !busy && (
          <button
            type="button"
            onClick={() => { removeFile(url); onChange(null) }}
            style={{ border: 'none', background: 'none', padding: '4px 0 0', cursor: 'pointer', color: C.textTer, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <X size={12} /> {t('Bild entfernen und Symbol zeigen')}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} style={{ display: 'none' }} />
    </div>
  )
}
