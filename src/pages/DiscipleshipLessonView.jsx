import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, BookOpen, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="animate-pulse px-4 pt-4 pb-10 space-y-5">
      <div className="aspect-video bg-warm-3/40 rounded-2xl" />
      <div className="space-y-2">
        <div className="h-6 bg-warm-3/40 rounded w-3/4" />
        <div className="h-4 bg-warm-3/30 rounded w-full" />
        <div className="h-4 bg-warm-3/30 rounded w-5/6" />
      </div>
    </div>
  )
}

// ─── Video placeholder ───────────────────────────────────────────────────────
function VideoPlaceholder({ videoUrl }) {
  if (videoUrl) {
    // If a real URL is set, embed it (YouTube iframe etc.)
    return (
      <div className="aspect-video bg-black rounded-2xl overflow-hidden">
        <iframe
          src={videoUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Lektion Video"
        />
      </div>
    )
  }
  return (
    <div className="aspect-video bg-warm-3/30 rounded-2xl flex flex-col items-center justify-center gap-3 border border-warm-3/40">
      <div className="w-14 h-14 rounded-full bg-white/70 flex items-center justify-center shadow-md">
        <Play size={22} className="text-dark-light ml-1" />
      </div>
      <p className="text-dark-light text-sm font-medium">Video folgt in Kürze</p>
    </div>
  )
}

// ─── Question component ───────────────────────────────────────────────────────
function QuestionItem({ question, answer, onChange }) {
  if (question.type === 'multiple_choice' && Array.isArray(question.options)) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-dark leading-snug">{question.question}</p>
        <div className="space-y-2">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ selectedOption: idx })}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                answer?.selectedOption === idx
                  ? 'bg-warm-1/10 border-warm-1/40 text-warm-1 font-semibold'
                  : 'bg-white/70 border-warm-3/30 text-dark hover:border-warm-3/60'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-dark leading-snug">{question.question}</p>
      <textarea
        value={answer?.answerText || ''}
        onChange={e => onChange({ answerText: e.target.value })}
        placeholder="Deine Antwort…"
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-warm-3/40 bg-white/70 text-sm text-dark placeholder:text-dark-light resize-none focus:outline-none focus:border-warm-1/50 focus:ring-2 focus:ring-warm-1/10 transition-all"
      />
    </div>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────
export default function DiscipleshipLessonView() {
  const { lessonId } = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()

  const [lesson, setLesson]           = useState(null)
  const [moduleInfo, setModuleInfo]   = useState(null)
  const [questions, setQuestions]     = useState([])
  const [answers, setAnswers]         = useState({})   // { questionId: { answerText?, selectedOption? } }
  const [isDone, setIsDone]           = useState(false)
  const [loading, setLoading]         = useState(true)
  const [completing, setCompleting]   = useState(false)

  useEffect(() => {
    if (!lessonId || !user) return
    loadLesson()
  }, [lessonId, user?.id])

  async function loadLesson() {
    setLoading(true)
    const [
      { data: lessonData },
      { data: questionsData },
      { data: completionData },
    ] = await Promise.all([
      supabase
        .from('course_lessons')
        .select('*, course_modules(id, title, stage, sort_order)')
        .eq('id', lessonId)
        .single(),
      supabase
        .from('lesson_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sort_order'),
      supabase
        .from('lesson_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle(),
    ])

    if (lessonData) {
      setLesson(lessonData)
      setModuleInfo(lessonData.course_modules || null)
    }
    setQuestions(questionsData || [])
    setIsDone(!!completionData)

    // Load existing answers
    if (questionsData && questionsData.length > 0) {
      const qIds = questionsData.map(q => q.id)
      const { data: existingAnswers } = await supabase
        .from('lesson_answers')
        .select('question_id, answer_text, selected_option')
        .eq('user_id', user.id)
        .in('question_id', qIds)
      if (existingAnswers) {
        const answerMap = {}
        existingAnswers.forEach(a => {
          answerMap[a.question_id] = {
            answerText: a.answer_text,
            selectedOption: a.selected_option,
          }
        })
        setAnswers(answerMap)
      }
    }
    setLoading(false)
  }

  // Check whether all questions are answered sufficiently
  function isAnswerSufficient(q) {
    const ans = answers[q.id]
    if (!ans) return false
    if (q.type === 'multiple_choice') return ans.selectedOption !== null && ans.selectedOption !== undefined
    return (ans.answerText || '').trim().length >= 20
  }

  const allAnswered = questions.length === 0 || questions.every(isAnswerSufficient)
  const canComplete = allAnswered && !isDone

  async function handleComplete() {
    if (!canComplete || completing) return
    setCompleting(true)

    // Save all answers
    for (const q of questions) {
      const ans = answers[q.id]
      if (ans) {
        await supabase.from('lesson_answers').upsert(
          {
            user_id: user.id,
            question_id: q.id,
            answer_text: ans.answerText || null,
            selected_option: ans.selectedOption ?? null,
          },
          { onConflict: 'user_id,question_id' }
        )
      }
    }

    // Mark lesson complete
    await supabase.from('lesson_completions').insert({ user_id: user.id, lesson_id: lessonId })
    setIsDone(true)
    setCompleting(false)

    // Navigate back to stage
    const stageNum = moduleInfo?.stage ?? 1
    setTimeout(() => navigate(`/discipleship/stage/${stageNum}`), 300)
  }

  const stageNum = moduleInfo?.stage ?? 1

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <div className="w-9 h-9 rounded-xl bg-warm-3/40 animate-pulse" />
          <div className="h-4 bg-warm-3/40 rounded w-40 animate-pulse" />
        </div>
        <SkeletonLoader />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-dark-muted italic">Lektion nicht gefunden.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-gradient-to-b from-warm-4/70 to-transparent">
        <button
          onClick={() => navigate(`/discipleship/stage/${stageNum}`)}
          className="w-9 h-9 rounded-xl bg-white/70 border border-warm-3/30 flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-dark" />
        </button>
        <div className="min-w-0">
          <p className="text-xs text-dark-light truncate">
            {moduleInfo?.title || 'Modul'} · {lesson.title}
          </p>
        </div>
        {isDone && (
          <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-warm-1/10 flex-shrink-0">
            <Check size={12} className="text-warm-1" strokeWidth={3} />
            <span className="text-[10px] font-bold text-warm-1">Abgeschlossen</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-10 space-y-6">
        {/* Video */}
        <VideoPlaceholder videoUrl={lesson.video_url} />

        {/* Title + content */}
        <div>
          <h1 className="font-serif text-2xl font-bold text-dark mb-3 leading-tight">{lesson.title}</h1>
          {lesson.content_text ? (
            <p className="text-sm text-dark-muted leading-relaxed">{lesson.content_text}</p>
          ) : (
            <p className="text-sm text-dark-light italic leading-relaxed">
              Inhalt wird vorbereitet…
            </p>
          )}
        </div>

        {/* Bible verse placeholder */}
        <div className="border-l-4 border-accent/40 pl-4 py-1">
          <p className="text-sm text-dark-muted italic leading-relaxed">
            Bibelstelle folgt in Kürze.
          </p>
          <p className="text-xs text-accent font-semibold mt-1">Bibelreferenz</p>
        </div>

        {/* Questions */}
        {questions.length > 0 && (
          <div className="bg-white/70 rounded-2xl p-5 border border-warm-3/30 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-warm-1" />
              <h3 className="font-semibold text-dark text-sm">Abschlussfragen</h3>
            </div>
            {questions.map((q, i) => (
              <div key={q.id}>
                {i > 0 && <div className="border-t border-warm-3/30 pt-4" />}
                <QuestionItem
                  question={q}
                  answer={answers[q.id]}
                  onChange={upd => setAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id] || {}), ...upd } }))}
                />
                {!isDone && !isAnswerSufficient(q) && (answers[q.id]) && (
                  <p className="text-[10px] text-dark-light mt-1.5">
                    {q.type === 'multiple_choice' ? 'Bitte wähle eine Option.' : 'Mindestens 20 Zeichen benötigt.'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Complete button */}
        <button
          onClick={handleComplete}
          disabled={!canComplete || completing}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${
            isDone
              ? 'bg-warm-1/10 text-warm-1 cursor-default'
              : canComplete
              ? 'bg-warm-1 text-white shadow-lg active:scale-[0.99]'
              : 'bg-warm-3/40 text-dark-light cursor-not-allowed'
          }`}
        >
          {isDone
            ? '✓ Lektion abgeschlossen'
            : completing
            ? '…'
            : questions.length > 0 && !allAnswered
            ? 'Beantworte die Fragen zum Abschließen'
            : 'Lektion abschließen'}
        </button>
      </div>
    </div>
  )
}
