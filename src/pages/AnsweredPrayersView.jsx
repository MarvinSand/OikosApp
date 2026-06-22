import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useAnsweredPrayers } from '../hooks/useAnsweredPrayers'

function formatAnsweredDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ padding: '0 16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 90, borderRadius: 14, backgroundColor: 'var(--color-warm-4)', marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

// ─── Answered Card ────────────────────────────────────────────
function AnsweredCard({ req }) {
  const dateLabel = formatAnsweredDate(req.answered_at)

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      backgroundColor: 'var(--color-white)', borderRadius: 14,
      marginBottom: 10, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(58,46,36,0.07)',
      border: '1px solid var(--color-warm-3)',
    }}>
      {/* Green left border */}
      <div style={{ width: 4, flexShrink: 0, backgroundColor: '#27AE60' }} />

      <div style={{ flex: 1, padding: '14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <CheckCircle size={15} style={{ color: '#27AE60', flexShrink: 0, marginTop: 1 }} />
          <p style={{
            fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700,
            color: 'var(--color-text)', margin: 0, lineHeight: 1.35,
            flex: 1,
          }}>
            {req.title}
          </p>
        </div>

        {dateLabel && (
          <p style={{
            fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)',
            margin: '0 0 6px 23px',
          }}>
            Erhört am {dateLabel}
          </p>
        )}

        {req.answered_note && (
          <p style={{
            fontFamily: 'Lora, serif', fontSize: 13, color: 'var(--color-text-muted)',
            fontStyle: 'italic', lineHeight: 1.55,
            margin: '0 0 0 23px',
          }}>
            „{req.answered_note}"
          </p>
        )}
      </div>

      {/* Green Erhört badge */}
      <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
        <span style={{
          fontFamily: 'Lora, serif', fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 20,
          backgroundColor: '#DFF5E8', color: '#1E8449',
        }}>
          ✓ Erhört
        </span>
      </div>
    </div>
  )
}

// ─── Month Group ──────────────────────────────────────────────
function MonthGroup({ monthLabel, requests }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>📅</span>
        <p style={{
          fontFamily: 'Lora, serif', fontSize: 11, fontWeight: 600,
          color: 'var(--color-text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.6px', margin: 0,
        }}>
          {monthLabel}
        </p>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-warm-3)' }} />
        <span style={{
          fontFamily: 'Lora, serif', fontSize: 11, color: 'var(--color-text-muted)',
        }}>
          {requests.length}
        </span>
      </div>
      <div style={{ padding: '0 16px' }}>
        {requests.map(req => <AnsweredCard key={req.id} req={req} />)}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function AnsweredPrayersView() {
  const navigate = useNavigate()
  const { answeredRequests, byMonth, totalCount, loading } = useAnsweredPrayers()

  const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a))

  return (
    <div className="bg-bg min-h-full pb-24 md:max-w-2xl md:mx-auto">
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-white)', borderBottom: '1px solid var(--color-warm-3)',
        padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/prayers')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8, flexShrink: 0 }}
          >
            <ArrowLeft size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <h1 style={{
                fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700,
                color: 'var(--color-text)', margin: 0,
              }}>
                Erhörte Gebete
              </h1>
            </div>
          </div>
          {totalCount > 0 && (
            <span style={{
              fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 700,
              color: '#27AE60', backgroundColor: '#DFF5E8',
              padding: '3px 10px', borderRadius: 20,
            }}>
              {totalCount} ✓
            </span>
          )}
        </div>
      </div>

      {/* Summary banner */}
      {!loading && totalCount > 0 && (
        <div style={{
          margin: '16px 16px 8px',
          background: 'linear-gradient(135deg, #DFF5E8 0%, #F0FFF4 100%)',
          borderRadius: 16, padding: '16px 20px', textAlign: 'center',
          border: '1px solid #B2E0C4',
        }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700, color: '#1E8449', margin: '0 0 4px' }}>
            {totalCount}
          </p>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 13, color: '#2E7D50', margin: 0 }}>
            erhörte Gebete insgesamt 🙏
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && <Skeleton />}

      {/* Empty state */}
      {!loading && totalCount === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <span style={{ fontSize: 56, display: 'block', marginBottom: 16 }}>🙏</span>
          <p style={{
            fontFamily: 'Lora, serif', fontSize: 15, color: 'var(--color-text-muted)',
            fontStyle: 'italic', lineHeight: 1.7,
          }}>
            Noch keine erhörten Gebete.{'\n'}Wenn Gott antwortet, kannst du ein Anliegen als erhört markieren.
          </p>
        </div>
      )}

      {/* Month groups */}
      {!loading && monthKeys.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {monthKeys.map(key => (
            <MonthGroup
              key={key}
              monthLabel={byMonth[key].label}
              requests={byMonth[key].requests}
            />
          ))}
        </div>
      )}
    </div>
  )
}
