import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getStudy } from '../lib/weg'
import { useWegProgress } from '../hooks/useWegProgress'
import StudyPlayer from '../components/weg/StudyPlayer'

// Eine Bibelstudie als Vollbild-Ablauf (Route /weg/:studyId, siehe
// isFullScreenRoute in App.jsx). Höhe 100 % statt 100dvh: der App-Container
// trägt oben schon die Safe-Area (CLAUDE.md), unten bleibt Platz für die Nav.
export default function WegStudyView() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const study = getStudy(studyId)
  const { progress, update } = useWegProgress()

  if (!study) return <Navigate to="/weg" replace />
  const saved = progress[study.id] || {}

  return (
    <div style={{ height: '100%', paddingBottom: 'var(--bottom-nav-h, 64px)', backgroundColor: 'var(--color-bg)' }}>
      <StudyPlayer
        study={study}
        saved={saved}
        patch={(p) => update(study.id, p)}
        onExit={() => navigate('/weg')}
        onFinish={() => { update(study.id, { done: true }); navigate('/weg') }}
      />
    </div>
  )
}
