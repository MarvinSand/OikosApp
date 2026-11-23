import { EyeOff, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { anchoredMenuItemStyle } from '../common/AnchoredMenu'
import { useT } from '../../i18n'
import { setModerationHidden, useModerationHiddenAt } from '../../lib/moderationState'

/**
 * Extra ⋯ menu rows for app admins: soft-hide / restore on others' content.
 * Call only when viewer is app admin and content is not own.
 */
export default function AdminContentMenuItems({
  contentType,
  contentId,
  hiddenAt,
  onDone,
  onClose,
}) {
  const { t } = useT()
  const { showToast } = useToast()
  const hidden = !!useModerationHiddenAt(contentType, contentId, hiddenAt)

  async function hide() {
    onClose?.()
    const { error } = await supabase.rpc('moderation_hide_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_note: null,
    })
    if (error) showToast(t('Verstecken fehlgeschlagen'), 'error')
    else {
      setModerationHidden(contentType, contentId, true)
      showToast(t('Beitrag versteckt (Moderation)'))
      onDone?.('hide')
    }
  }

  async function restore() {
    onClose?.()
    const { error } = await supabase.rpc('moderation_restore_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_note: null,
    })
    if (error) showToast(t('Wiederherstellen fehlgeschlagen'), 'error')
    else {
      setModerationHidden(contentType, contentId, false)
      showToast(t('Beitrag wieder sichtbar'))
      onDone?.('restore')
    }
  }

  return (
    <button
      onClick={hidden ? restore : hide}
      style={anchoredMenuItemStyle}
    >
      {hidden
        ? <><Eye size={14} />{' '}{t('Beitrag wiederherstellen')}</>
        : <><EyeOff size={14} />{' '}{t('Beitrag verstecken (Moderation)')}</>}
    </button>
  )
}
