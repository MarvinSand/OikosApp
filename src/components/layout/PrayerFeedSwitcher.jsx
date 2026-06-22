import { useNavigate } from 'react-router-dom'
import { Newspaper, HandHeart } from 'lucide-react'
import SegmentedTabs from './SegmentedTabs'

/**
 * Top tab switch shared between the Gebete (/prayers) and Feed (/friends?tab=feed)
 * pages. Premium-Segmented-Control im einheitlichen Design.
 */
export default function PrayerFeedSwitcher({ active }) {
  const navigate = useNavigate()

  const tabs = [
    { key: 'feed',    label: 'Feed',   icon: Newspaper,  target: '/friends?tab=feed' },
    { key: 'prayers', label: 'Gebete', icon: HandHeart,  target: '/prayers' },
  ]

  return (
    <div
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <SegmentedTabs
        tabs={tabs}
        active={active}
        onSelect={(key) => {
          const t = tabs.find(x => x.key === key)
          if (t) navigate(t.target)
        }}
      />
    </div>
  )
}
