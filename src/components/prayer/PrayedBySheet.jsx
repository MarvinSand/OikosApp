import { getInitials } from '../../lib/prayerModel'
import BodyPortal from '../common/BodyPortal'
import { useT, tr } from '../../i18n'

// „Haben gebetet"-Sheet: alle Beter eines Anliegens mit ihrer Anzahl.
export default function PrayedBySheet({ prayersByUser, totalCount, currentUserId, onClose }) {
  const { t } = useT()
  return (
    <BodyPortal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '16px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '65vh', overflowY: 'auto', animation: 'sheetSlideUp 0.25s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)', margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{t('🙏 Haben gebetet ({length})', { length: prayersByUser.length })}</h3>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
          {totalCount} {totalCount === 1 ? t('Gebet') : t('Gebete')}{' '}{t('insgesamt')}</p>
        {prayersByUser.map(({ userId, profile, count }) => {
          const name = userId === currentUserId
            ? tr('Du')
            : (profile?.full_name || profile?.username || tr('Unbekannt'))
          return (
            <div key={userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: profile?.is_christian ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: profile?.is_christian ? '#fff' : 'var(--color-text-secondary)',
                  fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
                }}>
                  {getInitials(name)}
                </div>
              )}
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0, flex: 1 }}>{name}</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12.5, color: 'var(--color-text-secondary)', margin: 0, flexShrink: 0 }}>
                {t('{count}× gebetet', { count })}</p>
            </div>
          )
        })}
      </div>
    </BodyPortal>
  )
}
