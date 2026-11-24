import { Megaphone } from 'lucide-react'
import { anchoredMenuItemStyle } from '../common/AnchoredMenu'
import { useIsAppAdmin } from '../../hooks/useIsAppAdmin'
import { openHighlightComposer } from '../../lib/highlightComposer'
import { useT } from '../../i18n'

/**
 * ⋯-Menüpunkt für Moderatoren: Inhalt im Aktuelles-Tab hervorheben.
 * kind: 'post' | 'community_post' | 'prayer' | 'event'
 */
export default function AdminHighlightMenuItem({ kind, refId, label, onClose }) {
  const { t } = useT()
  const { isAppAdmin } = useIsAppAdmin()
  if (!isAppAdmin) return null
  return (
    <button
      onClick={() => {
        onClose?.()
        openHighlightComposer({ kind, refId, label: (label || '').trim().slice(0, 160) || t('Beitrag') })
      }}
      style={anchoredMenuItemStyle}
    >
      <Megaphone size={14} />{' '}{t('In Aktuelles anzeigen (Moderation)')}
    </button>
  )
}
