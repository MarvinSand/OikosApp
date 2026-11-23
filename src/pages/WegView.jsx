import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Sparkles } from 'lucide-react'
import { useT } from '../i18n'
import { STATIONS, STUDIES, studiesOf } from '../lib/weg'
import { useWegProgress, studyStatus } from '../hooks/useWegProgress'
import WegBibleSwitch from '../components/weg/WegBibleSwitch'

// „Der Weg“: Bibelstudien in vier Stationen (Entdecken, Wurzeln schlagen,
// Nachfolgen, Jünger machen). Challenges und Mentoring folgen später.
export default function WegView() {
  const { t } = useT()
  const navigate = useNavigate()
  const { progress } = useWegProgress()

  const statusOf = (s) => studyStatus(progress[s.id])
  const next = STUDIES.find(s => statusOf(s) !== 'done') || null
  const nextStatus = next ? statusOf(next) : null
  const doneCount = STUDIES.filter(s => statusOf(s) === 'done').length

  return (
    <div style={{ minHeight: '100%', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <WegBibleSwitch active="weg" />
      </div>

      <div style={{ padding: '20px 16px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>{t('Der Weg')}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {t('Bibelstudien, die dich Schritt für Schritt weiterbringen. {done} von {total} abgeschlossen.', { done: doneCount, total: STUDIES.length })}
        </p>
      </div>

      {next ? (
        <button
          onClick={() => navigate(`/weg/${next.id}`)}
          style={{
            display: 'block', width: 'calc(100% - 32px)', margin: '12px 16px 4px', padding: '16px', borderRadius: 18, textAlign: 'left',
            backgroundColor: 'var(--color-gold-light)', border: '1px solid var(--color-gold)', color: 'var(--color-text)',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{t('Dein nächster Schritt')}</p>
          <p style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{next.nr}. {next.title}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>{next.ref} · {t('{n} Min', { n: next.minutes })}</p>
          <span style={{ display: 'inline-block', marginTop: 12, padding: '9px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600, backgroundColor: 'var(--color-text)', color: 'var(--color-bg)' }}>
            {nextStatus === 'progress' ? t('Weiter') : t('Starten')}
          </span>
        </button>
      ) : (
        <div style={{ margin: '12px 16px 4px', padding: 16, borderRadius: 18, backgroundColor: 'var(--color-gold-light)', border: '1px solid var(--color-gold)', color: 'var(--color-text)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Sparkles size={20} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{t('Alle Studien abgeschlossen. Starte jederzeit eine neu.')}</span>
        </div>
      )}

      {STATIONS.map((station, si) => {
        const list = studiesOf(station.id)
        const done = list.filter(s => statusOf(s) === 'done').length
        return (
          <section key={station.id} style={{ margin: '22px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, backgroundColor: 'var(--color-text)', color: 'var(--color-bg)' }}>{si + 1}</span>
              <h2 style={{ margin: 0, flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{t(station.name)}</h2>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{done} / {list.length}</span>
            </div>
            <p style={{ margin: '0 0 10px 36px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>{t(station.sub)}</p>

            {list.map((s, k) => {
              const st = statusOf(s)
              const isNext = next && next.id === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/weg/${s.id}`)}
                  style={{ display: 'flex', alignItems: 'stretch', gap: 12, width: '100%', textAlign: 'left', padding: 0, marginLeft: 0 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 26, flexShrink: 0 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 999, marginTop: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: st === 'done' ? '2px solid var(--color-gold)' : isNext || st === 'progress' ? '2px solid var(--color-gold)' : '2px solid var(--color-border)',
                      backgroundColor: st === 'done' ? 'var(--color-gold)' : 'var(--color-bg)',
                      color: '#1A1A1A',
                    }}>
                      {st === 'done' && <Check size={13} strokeWidth={3} />}
                    </span>
                    {k < list.length - 1 && <span style={{ flex: 1, width: 2, backgroundColor: 'var(--color-border)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.35 }}>{s.nr}. {s.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {s.ref} · {t('{n} Min', { n: s.minutes })}{st === 'progress' ? ` · ${t('begonnen')}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  </div>
                </button>
              )
            })}
          </section>
        )
      })}

      <div style={{ margin: '24px 16px 16px', padding: '14px 16px', borderRadius: 14, border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
        {t('Bald hier: Challenges und Mentoring.')}
      </div>
    </div>
  )
}
