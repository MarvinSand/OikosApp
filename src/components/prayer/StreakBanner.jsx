import { useState } from 'react'
import { X } from 'lucide-react'

function FreezeConfirmSheet({ streak, freezeDaysRemaining, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        padding: '20px 20px calc(88px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            ❄️ Freeze Day
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: 20 }}>
          Du hast heute noch nicht gebetet.<br />
          Möchtest du deinen Freeze Day nutzen, um deinen Streak zu schützen?
        </p>

        <div style={{ backgroundColor: 'var(--color-warm-4)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', margin: '0 0 6px' }}>
            🔥 Dein Streak: <strong>{streak} Tage</strong>
          </p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-text)', margin: 0 }}>
            ❄️ Freeze Days übrig: <strong>{freezeDaysRemaining}</strong>
          </p>
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            backgroundColor: '#4B9ED6', color: 'white',
            fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          {loading ? '…' : '❄️ Freeze Day nutzen'}
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 14,
            border: '1.5px solid var(--color-warm-3)', background: 'none',
            fontFamily: 'Lora, serif', fontSize: 14, color: 'var(--color-warm-1)', cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Lieber heute noch beten
        </button>
      </div>
    </>
  )
}

export default function StreakBanner({ stats, streakStatus, onFreezeDay, onStatsClick }) {
  const [showFreeze, setShowFreeze] = useState(false)

  if (!stats) return null

  const streak = stats.current_streak || 0
  const longest = stats.longest_streak || 0
  const freezeRemaining = stats.freeze_days_remaining ?? 1
  const isNewRecord = streak > 0 && streak === longest && streakStatus === 'active' && streak > 1

  // Don't show the banner if user has never prayed
  if (!stats.last_prayer_date && streak === 0) {
    return null
  }

  if (streak === 0 && streakStatus === 'broken') {
    return (
      <div style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        borderRadius: 16,
        backgroundColor: 'var(--color-warm-4)',
        border: '1px solid var(--color-warm-3)',
      }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px' }}>
          🕊 Starte heute deine Gebetsserie
        </p>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
          Bete für mindestens ein Anliegen
        </p>
      </div>
    )
  }

  const progress = longest > 0 ? Math.min(streak / longest, 1) : 1
  const progressPercent = Math.round(progress * 100)

  return (
    <>
      <div style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        borderRadius: 16,
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-warm-3)',
        boxShadow: '0 2px 8px rgba(58,46,36,0.07)',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: '#E67E22', lineHeight: 1 }}>
                  {streak}
                </span>
                {isNewRecord && (
                  <span style={{
                    fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 700,
                    backgroundColor: '#FEF3C7', color: '#92400E',
                    padding: '2px 7px', borderRadius: 20, marginLeft: 4,
                  }}>
                    🏆 Neuer Rekord!
                  </span>
                )}
              </div>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                {streak === 1 ? 'Tag – ein guter Start!' : 'Tage in Folge gebetet'}
              </p>
            </div>
          </div>

          {onStatsClick && (
            <button
              onClick={onStatsClick}
              style={{
                border: 'none', background: 'none',
                fontFamily: 'Lora, serif', fontSize: 12,
                color: 'var(--color-warm-1)', cursor: 'pointer',
                fontWeight: 500, padding: '4px 0',
              }}
            >
              📊 Statistiken →
            </button>
          )}
        </div>

        {/* Progress bar */}
        {longest > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              height: 6, borderRadius: 3,
              backgroundColor: 'var(--color-warm-3)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${progressPercent}%`,
                backgroundColor: '#E67E22',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)' }}>
                Längste: {longest} Tage
              </span>
            </div>
          </div>
        )}

        {/* Freeze Day button */}
        {streakStatus === 'at_risk' && streak > 0 && freezeRemaining > 0 && (
          <button
            onClick={() => setShowFreeze(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10,
              border: '1.5px solid #4B9ED6',
              backgroundColor: '#EFF8FF',
              fontFamily: 'Lora, serif', fontSize: 12,
              color: '#2B6CB0', cursor: 'pointer', fontWeight: 500,
              marginTop: 4,
            }}
          >
            ❄️ Freeze Day nutzen · {freezeRemaining} übrig
          </button>
        )}

        {streak === 1 && (
          <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0 0', fontStyle: 'italic' }}>
            Bete auch morgen um den Streak zu halten.
          </p>
        )}
      </div>

      {showFreeze && (
        <FreezeConfirmSheet
          streak={streak}
          freezeDaysRemaining={freezeRemaining}
          onConfirm={onFreezeDay}
          onClose={() => setShowFreeze(false)}
        />
      )}
    </>
  )
}
