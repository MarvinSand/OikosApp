import { useNavigate } from 'react-router-dom'
import { Compass, BookOpen } from 'lucide-react'
import { useT } from '../../i18n'

// Umschalter oben auf „Der Weg“ und „Bibel“: beide teilen sich einen Tab in
// der Navigation.
export default function WegBibleSwitch({ active }) {
  const navigate = useNavigate()
  const { t } = useT()
  const items = [
    { key: 'weg', label: t('Der Weg'), icon: Compass, path: '/weg' },
    { key: 'bible', label: t('Bibel'), icon: BookOpen, path: '/bible' },
  ]
  return (
    <div
      role="tablist"
      style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {items.map(({ key, label, icon: Icon, path }) => {
        const on = key === active
        return (
          <button
            key={key}
            role="tab"
            aria-selected={on}
            onClick={() => { if (!on) navigate(path) }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 10, fontSize: 14, fontWeight: on ? 600 : 500,
              border: on ? '1px solid var(--color-border)' : '1px solid transparent',
              backgroundColor: on ? 'var(--color-bg)' : 'transparent',
              color: on ? 'var(--color-text)' : 'var(--color-text-secondary)',
              cursor: on ? 'default' : 'pointer',
            }}
          >
            <Icon size={16} />{label}
          </button>
        )
      })}
    </div>
  )
}
