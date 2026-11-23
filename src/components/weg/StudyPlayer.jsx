import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, GraduationCap, Link2, Heart, RotateCcw } from 'lucide-react'
import { useT } from '../../i18n'
import { PHASES } from '../../lib/weg'
import { parseGermanReference } from '../../lib/bibleBooks'
import { useStationPassage } from '../../hooks/useStationPassage'
import BodyPortal from '../common/BodyPortal'
import RichText, { VerseRef } from './RichText'

const BiblePassageSheet = lazy(() => import('../discipleship/BiblePassageSheet'))

// ─── Styles ────────────────────────────────────────────────────
// Theme-sichere Variablen (siehe CLAUDE.md: keine „Ink“-Variablen als Fläche).
const card = {
  width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 14, marginBottom: 8,
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)',
  color: 'var(--color-text)', fontSize: 15, lineHeight: 1.5,
}
const cardSelected = { ...card, backgroundColor: 'var(--color-gold-light)', border: '1.5px solid var(--color-gold)' }
const label = { fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }
const heading = { fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '4px 0 12px', lineHeight: 1.3, letterSpacing: '-0.01em' }
const answerBox = {
  padding: '12px 14px', borderRadius: 14, marginTop: 8, fontSize: 15, lineHeight: 1.65,
  backgroundColor: 'var(--color-accent-light)', color: 'var(--color-text)',
}
const mentorBox = {
  padding: '10px 12px', borderRadius: 12, marginTop: 10, fontSize: 13, lineHeight: 1.5,
  border: '1px dashed var(--color-accent-dark)', color: 'var(--color-accent-dark)',
}
const primaryBtn = {
  flex: 1, padding: '14px 16px', borderRadius: 14, fontSize: 15, fontWeight: 600, border: 'none',
  backgroundColor: 'var(--color-text)', color: 'var(--color-bg)', cursor: 'pointer',
}
const secondaryBtn = {
  padding: '14px 18px', borderRadius: 14, fontSize: 15, fontWeight: 500,
  border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer',
}
const ghostBtn = { ...secondaryBtn, width: '100%', marginTop: 8, padding: '12px 16px' }

// ─── Einzelne Schritt-Ansichten ────────────────────────────────

function PassageInline({ parsed }) {
  const { t } = useT()
  const { html, loading, error, retry } = useStationPassage(parsed?.book, parsed?.chapter, parsed?.verseStart, parsed?.verseEnd)
  if (!parsed) return null
  if (loading) return <p style={{ color: 'var(--color-text-tertiary)' }}>{t('Lädt…')}</p>
  if (error) {
    return (
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('Text konnte nicht geladen werden.')}</span>
        <button onClick={retry} style={{ color: 'var(--color-accent-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RotateCcw size={14} /> {t('Erneut')}
        </button>
      </div>
    )
  }
  if (!html) return null
  return (
    <div
      style={{ fontFamily: 'Lora, serif', fontSize: 17, lineHeight: 1.85, color: 'var(--color-text)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function IntroStep({ study, onOpen, t }) {
  return (
    <>
      <h1 style={{ ...heading, fontSize: 24 }}>{study.title}</h1>
      <p style={{ ...label, marginBottom: 18 }}>
        <VerseRef label={study.ref} reference={study.ref} onOpen={onOpen} /> · {t('{n} Min', { n: study.minutes })}
      </p>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 10px' }}>{t('Worum es geht')}</p>
      {study.goals.map((g, i) => (
        <div key={i} style={{ ...card, backgroundColor: 'var(--color-gold-light)', border: '1px solid var(--color-gold)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {i === 0 ? <Link2 size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : i === 1 ? <Heart size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : <BookOpen size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
          <span>{g}</span>
        </div>
      ))}
      <p style={{ ...label, marginTop: 14, lineHeight: 1.6 }}>
        {t('Kopf, Herz, Hand. Den Text kannst du jederzeit oben über die Bibelstelle nochmal lesen, ohne zurückzugehen. Deine Antworten bleiben auf diesem Gerät.')}
      </p>
    </>
  )
}

function ReadStep({ study, t }) {
  const parsed = useMemo(() => parseGermanReference(study.ref), [study.ref])
  return (
    <>
      <h2 style={heading}>{t('Lies {ref}', { ref: study.ref })}</h2>
      <PassageInline parsed={parsed} />
      <p style={{ ...label, marginTop: 14 }}>{t('Nimm dir Zeit. Du kannst jederzeit zurückblättern.')}</p>
    </>
  )
}

function ChoiceStep({ step, idx, saved, patch, onOpen, t }) {
  const ans = saved.ans || {}
  const a = ans[idx]
  const chosen = a != null ? step.o[a] : null

  function choose(j) { patch({ ans: { ...ans, [idx]: j } }) }
  function reset() {
    const next = { ...ans }
    delete next[idx]
    patch({ ans: next, customSaved: false })
  }

  return (
    <>
      <h2 style={heading}>{step.q}</h2>
      {!chosen && step.o.map((o, j) => (
        <button key={j} onClick={() => choose(j)} style={card}>{o.label}</button>
      ))}
      {chosen && (
        <>
          <div style={cardSelected}>
            <p style={{ ...label, marginBottom: 2 }}>
              {t('Deine Antwort')}
              <button onClick={reset} style={{ marginLeft: 8, color: 'var(--color-accent-dark)', fontWeight: 600, fontSize: 12 }}>{t('ändern')}</button>
            </p>
            {chosen.label}
          </div>
          <div style={answerBox}>
            {(step.all || step.lbl) && <p style={{ ...label, marginBottom: 6 }}>{t(step.all ? 'Auflösung' : step.lbl)}</p>}
            {step.all ? (
              <>
                <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{chosen.text}</p>
                <RichText text={step.all} onOpen={onOpen} />
              </>
            ) : (
              <RichText text={chosen.text} onOpen={onOpen} />
            )}
          </div>
          {chosen.custom && (
            <div style={{ marginTop: 10 }}>
              <input
                type="text"
                value={saved.custom || ''}
                onChange={(e) => patch({ custom: e.target.value, customSaved: false })}
                placeholder={t('Was willst du diese Woche tun?')}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
              />
              {saved.customSaved ? (
                <div style={{ ...answerBox, marginTop: 8, fontSize: 14 }}>{t('Gespeichert. Am Ende der Woche fragen wir, wie es lief.')}</div>
              ) : (
                <button
                  onClick={() => { if ((saved.custom || '').trim()) patch({ customSaved: true }) }}
                  style={{ ...ghostBtn, opacity: (saved.custom || '').trim() ? 1 : 0.5 }}
                >
                  {t('Schritt speichern')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

function TextStep({ step, idx, saved, patch, onOpen, t }) {
  const ans = saved.ans || {}
  const open = (saved.open || {})[idx]
  const value = ans[idx] || ''
  const lbl = step.lbl || 'Auflösung'
  return (
    <>
      <h2 style={heading}>{step.q}</h2>
      {open ? (
        <>
          {value.trim() && (
            <div style={{ ...card, marginBottom: 0 }}>
              <p style={{ ...label, marginBottom: 2 }}>{t('Deine Antwort')}</p>
              <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{value}</div>
            </div>
          )}
          <div style={answerBox}>
            <p style={{ ...label, marginBottom: 6 }}>{t(lbl)}</p>
            <RichText text={step.hint} onOpen={onOpen} />
          </div>
          <button onClick={() => patch({ open: { ...(saved.open || {}), [idx]: false } })} style={ghostBtn}>{t('Antwort bearbeiten')}</button>
        </>
      ) : (
        <>
          <textarea
            rows={5}
            value={value}
            onChange={(e) => patch({ ans: { ...ans, [idx]: e.target.value } })}
            placeholder={t('Deine Gedanken')}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, lineHeight: 1.5, resize: 'vertical', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
          />
          <p style={{ ...label, margin: '6px 2px 0' }}>{t('Deine Antworten bleiben auf diesem Gerät.')}</p>
          <button onClick={() => patch({ open: { ...(saved.open || {}), [idx]: true } })} style={{ ...secondaryBtn, width: '100%', marginTop: 12 }}>
            {t('{x} ansehen', { x: t(lbl) })}
          </button>
        </>
      )}
    </>
  )
}

function CardsStep({ step, ui, setUi, onOpen, t }) {
  const sel = ui.sel ?? -1
  const grid = step.layout === 'grid'
  return (
    <>
      <h2 style={heading}>{step.title}</h2>
      {step.lead && (
        <div style={{ ...card, backgroundColor: 'var(--color-gold-light)', border: '1px solid var(--color-gold)' }}>
          <b>{step.lead.title}</b>
          <p style={{ ...label, margin: '2px 0 0', color: 'var(--color-text)', fontSize: 14 }}>{step.lead.text}</p>
        </div>
      )}
      {step.intro && <p style={{ ...label, margin: '10px 0 8px' }}>{step.intro}</p>}
      <div style={grid ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } : undefined}>
        {step.items.map(([name, text], j) => {
          const on = sel === j
          if (grid) {
            return (
              <button
                key={j}
                onClick={() => setUi({ sel: j })}
                style={{ ...(on ? cardSelected : card), marginBottom: 0, textAlign: 'center', fontWeight: 600 }}
              >
                {name}
              </button>
            )
          }
          // Liste: Kopfzeile ist der Knopf, der Text darunter darf eigene
          // Verweise enthalten (kein Knopf im Knopf).
          return (
            <div key={j} style={on ? cardSelected : card}>
              <button
                onClick={() => setUi({ sel: on ? -1 : j })}
                aria-expanded={on}
                style={{ width: '100%', textAlign: 'left', fontWeight: 600, color: 'var(--color-text)', fontSize: 15 }}
              >
                {name}
              </button>
              {on && (
                <div style={{ fontSize: 14, marginTop: 6, color: 'var(--color-text)' }}>
                  <RichText text={text} onOpen={onOpen} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {grid && (
        <div style={{ ...answerBox, marginTop: 12 }}>
          {sel >= 0 ? (
            <>
              <b>{step.items[sel][0]}</b>
              <div style={{ marginTop: 4 }}><RichText text={step.items[sel][1]} onOpen={onOpen} /></div>
            </>
          ) : (
            <span>{t('Tippe auf eine Karte, um mehr zu sehen.')}</span>
          )}
        </div>
      )}
    </>
  )
}

function RevealStep({ step, ui, setUi, t }) {
  const shown = ui.rev ?? 1
  return (
    <>
      <h2 style={heading}>{step.title}</h2>
      {step.items.slice(0, shown).map((it, j) => (
        <div key={j} style={{ ...card, backgroundColor: 'var(--color-gold-light)', border: '1px solid var(--color-gold)' }}>
          <div>{it.text}</div>
          {it.note && <p style={{ ...label, fontStyle: 'italic', marginTop: 8, color: 'var(--color-text)' }}>{it.note}</p>}
        </div>
      ))}
      {shown < step.items.length && (
        <button onClick={() => setUi({ rev: shown + 1 })} style={ghostBtn}>{t('Weiterdenken')}</button>
      )}
    </>
  )
}

function PrayerStep({ step, t }) {
  return (
    <>
      <h2 style={heading}>{t('Gebet')}</h2>
      <div style={{ ...card, backgroundColor: 'var(--color-gold-light)', border: '1px solid var(--color-gold)', fontSize: 16, lineHeight: 1.7, fontFamily: 'Lora, serif' }}>
        {step.text}
      </div>
      <p style={{ ...label, marginTop: 8 }}>{t('Du kannst das mitbeten oder in eigenen Worten sagen.')}</p>
    </>
  )
}

function MoreStep({ study, saved, onOpen, t }) {
  const ans = saved.ans || {}
  const stepIdx = study.steps.findIndex(s => s.q === 'Dein Schritt für diese Woche')
  const a = stepIdx >= 0 ? ans[stepIdx] : null
  const opt = a != null ? study.steps[stepIdx].o[a] : null
  const stepText = opt ? (opt.custom ? (saved.custom || '').trim() : opt.label) : ''
  return (
    <>
      <h2 style={heading}>{t('Zum Weiterdenken')}</h2>
      {stepText && (
        <div style={{ ...card, backgroundColor: 'var(--color-gold-light)', border: '1px solid var(--color-gold)' }}>
          <p style={{ ...label, marginBottom: 2 }}>{t('Dein Schritt für diese Woche')}</p>
          {stepText}
        </div>
      )}
      {(study.verses || []).map(([ref, note]) => (
        <button key={ref} onClick={() => onOpen(ref)} style={card}>
          <span style={{ color: 'var(--color-accent-dark)', fontWeight: 600 }}>{ref}</span>
          <div style={{ ...label, marginTop: 2, fontSize: 13 }}>{note}</div>
        </button>
      ))}
      <p style={{ ...label, marginTop: 12, lineHeight: 1.6 }}>
        {t('Was nimmst du aus diesem Studium mit? Erzähl es heute einem Menschen.')}
      </p>
    </>
  )
}

// ─── Player ────────────────────────────────────────────────────

export default function StudyPlayer({ study, saved, patch, onExit, onFinish }) {
  const { t } = useT()
  const steps = study.steps
  const i = Math.min(saved.i ?? 0, steps.length - 1)
  const step = steps[i]
  const last = i === steps.length - 1
  const bodyRef = useRef(null)
  const [sheet, setSheet] = useState(null)
  const [mentor, setMentor] = useState(false)
  const [ui, setUi] = useState({})

  // Beim Schrittwechsel nach oben scrollen und lokale Ansicht zurücksetzen
  useEffect(() => {
    setUi({})
    bodyRef.current?.scrollTo?.(0, 0)
  }, [i])

  function openRef(reference) {
    setSheet({ label: reference, parsed: parseGermanReference(reference) })
  }

  function go(next) { patch({ i: next }) }

  const chipLabel = study.ref.replace(/,.*$/, '')
  const mentorText = mentor && step.m ? step.m : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      {/* Kopf: zurück, Phase, Bibeltext immer erreichbar */}
      <header style={{ borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div className="flex items-center gap-2 px-2" style={{ minHeight: 56 }}>
          <button onClick={onExit} aria-label={t('Zurück')} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...label, fontSize: 11 }}>{t(PHASES[step.p])} · {i + 1} / {steps.length}</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{study.title}</p>
          </div>
          <button
            onClick={() => openRef(study.ref)}
            aria-label={t('Text lesen')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: 'var(--color-accent-dark)', backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-accent-dark)', maxWidth: 150 }}
          >
            <BookOpen size={15} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chipLabel}</span>
          </button>
          <button
            onClick={() => setMentor(m => !m)}
            aria-label={t('Mentor-Ansicht')}
            aria-pressed={mentor}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, color: mentor ? 'var(--color-accent-dark)' : 'var(--color-text-tertiary)', backgroundColor: mentor ? 'var(--color-accent-light)' : 'transparent' }}
          >
            <GraduationCap size={20} />
          </button>
        </div>
        <div style={{ height: 3, backgroundColor: 'var(--color-bg-secondary)' }}>
          <div style={{ height: 3, width: `${((i + 1) / steps.length) * 100}%`, backgroundColor: 'var(--color-gold)', transition: 'width .25s' }} />
        </div>
      </header>

      <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 24px' }}>
        {step.t === 'intro' && <IntroStep study={study} onOpen={openRef} t={t} />}
        {step.t === 'read' && <ReadStep study={study} t={t} />}
        {step.t === 'choice' && <ChoiceStep key={i} step={step} idx={i} saved={saved} patch={patch} onOpen={openRef} t={t} />}
        {step.t === 'text' && <TextStep key={i} step={step} idx={i} saved={saved} patch={patch} onOpen={openRef} t={t} />}
        {step.t === 'cards' && <CardsStep step={step} ui={ui} setUi={setUi} onOpen={openRef} t={t} />}
        {step.t === 'reveal' && <RevealStep step={step} ui={ui} setUi={setUi} t={t} />}
        {step.t === 'prayer' && <PrayerStep step={step} t={t} />}
        {step.t === 'more' && <MoreStep study={study} saved={saved} onOpen={openRef} t={t} />}
        {mentorText && (
          <div style={mentorBox}>
            <b style={{ fontWeight: 600 }}>{t('Ziel der Frage')}</b>
            <br />
            {mentorText}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '10px 16px 12px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', flexShrink: 0 }}>
        {i > 0 && <button onClick={() => go(i - 1)} style={secondaryBtn}>{t('Zurück')}</button>}
        <button onClick={() => (last ? onFinish() : go(i + 1))} style={primaryBtn}>{last ? t('Fertig') : t('Weiter')}</button>
      </div>

      {sheet && (
        <BodyPortal>
          <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
            <Suspense fallback={null}>
              <BiblePassageSheet label={sheet.label} parsed={sheet.parsed} onClose={() => setSheet(null)} />
            </Suspense>
          </div>
        </BodyPortal>
      )}
    </div>
  )
}
