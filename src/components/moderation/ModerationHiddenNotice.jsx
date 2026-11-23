import { EyeOff } from 'lucide-react'
import { useModerationHiddenAt } from '../../lib/moderationState'
import { useIsAppAdmin } from '../../hooks/useIsAppAdmin'
import { useT } from '../../i18n'

/**
 * Hinweisband für Moderatoren: dieser Inhalt ist versteckt (für alle anderen
 * unsichtbar). `show` erlaubt z. B. auch Community-Admins, das Band zu sehen.
 */
export default function ModerationHiddenNotice({ contentType, contentId, hiddenAt, show }) {
  const { t } = useT()
  const { isAppAdmin } = useIsAppAdmin()
  const effective = useModerationHiddenAt(contentType, contentId, hiddenAt)
  if (!effective || !(show ?? isAppAdmin)) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', margin: '0 0 8px',
      borderRadius: 10, backgroundColor: 'var(--color-warm-4)',
      border: '1px dashed var(--color-warm-3)',
      fontFamily: 'Lora, serif', fontSize: 12, fontWeight: 600,
      color: 'var(--color-text-secondary)',
    }}>
      <EyeOff size={13} /> {t('Versteckt – für andere nicht sichtbar')}
    </div>
  )
}
