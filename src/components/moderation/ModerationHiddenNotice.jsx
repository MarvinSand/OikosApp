import { useState } from 'react'
import { EyeOff, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useModerationHiddenAt, setModerationDeleted } from '../../lib/moderationState'
import { useIsAppAdmin } from '../../hooks/useIsAppAdmin'
import { useT } from '../../i18n'

/**
 * Hinweisband für Moderatoren: dieser Inhalt ist versteckt (für alle anderen
 * unsichtbar). Dazu die Auswahl „Beitrag endgültig löschen“.
 * `show` erlaubt z. B. auch Community-Admins, das Band zu sehen.
 */
export default function ModerationHiddenNotice({ contentType, contentId, hiddenAt, show }) {
  const { t } = useT()
  const { showToast } = useToast()
  const { isAppAdmin } = useIsAppAdmin()
  const effective = useModerationHiddenAt(contentType, contentId, hiddenAt)
  const [busy, setBusy] = useState(false)
  if (!effective || !(show ?? isAppAdmin)) return null

  async function deleteForever() {
    if (!window.confirm(t('Beitrag endgültig löschen? Er ist danach für niemanden mehr sichtbar.'))) return
    setBusy(true)
    const { error } = await supabase.rpc('moderation_soft_delete_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_note: null,
    })
    setBusy(false)
    if (error) { showToast(t('Löschen fehlgeschlagen'), 'error'); return }
    setModerationDeleted(contentType, contentId)
    showToast(t('Beitrag endgültig gelöscht'))
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '6px 12px', margin: '0 0 8px',
      borderRadius: 10, backgroundColor: 'var(--color-warm-4)',
      border: '1px dashed var(--color-warm-3)',
      fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600,
      color: 'var(--color-text-secondary)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
        <EyeOff size={13} /> {t('Versteckt – für andere nicht sichtbar')}
      </span>
      <button
        onClick={deleteForever}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, border: 'none', cursor: busy ? 'default' : 'pointer',
          padding: '4px 10px', borderRadius: 8, backgroundColor: 'transparent',
          color: 'var(--color-error)', fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 700,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Trash2 size={12} /> {t('Beitrag endgültig löschen')}
      </button>
    </div>
  )
}
