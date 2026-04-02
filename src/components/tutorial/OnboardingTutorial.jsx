import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import { useAuth } from '../../hooks/useAuth';

const TOUR_STEPS = [
  {
    target: 'body',
    placement: 'center',
    title: 'Willkommen bei OIKOS 👋',
    content: 'Lass uns einen kurzen interaktiven Rundgang durch die App machen!',
    disableBeacon: true,
  },
  {
    target: '.tour-nav-map',
    placement: 'top',
    title: 'Deine interaktive Karte',
    content: 'Hier siehst du dein Netzwerk. Du bist im Zentrum!',
    disableBeacon: true,
  },
  {
    target: '.tour-map-add',
    placement: 'bottom',
    title: 'Personen hinzufügen',
    content: 'Mit diesem Button kannst du Menschen ergänzen, die dir am Herzen liegen.',
    disableBeacon: true,
  },
  {
    target: '.tour-nav-prayer',
    placement: 'top',
    title: 'Gebete & Anliegen',
    content: 'Lass uns mal in den Gebetsbereich schauen. Klicke auf Weiter, um die Ansicht zu wechseln.',
    disableBeacon: true,
  },
  {
    target: '.tour-prayer-add',
    placement: 'bottom',
    title: 'Neues Gebet',
    content: 'Hier erstellst du ein neues Gebet. Du entscheidest immer, ob es privat bleibt oder geteilt wird.',
    disableBeacon: true,
  },
  {
    target: '.tour-nav-friends',
    placement: 'top',
    title: 'Gemeinschaft',
    content: 'Finde hier Glaubensgeschwister, gründe Gruppen und vernetze dich.',
    disableBeacon: true,
  },
  {
    target: '.tour-nav-notifications',
    placement: 'top',
    title: 'Aktivitäten',
    content: 'Hier bleibst du auf dem Laufenden über sofortige Benachrichtigungen.',
    disableBeacon: true,
  },
  {
    target: '.tour-nav-profile',
    placement: 'top',
    title: 'Dein Profil',
    content: 'Passe deine Einstellungen an oder starte das Tutorial jederzeit neu. Viel Spaß!',
    disableBeacon: true,
  }
];

export default function OnboardingTutorial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    const storageKey = `oikos_tutorial_seen_${user.id}`;
    const hasSeen = localStorage.getItem(storageKey);
    // Start automatically if the user has never seen it
    if (!hasSeen) {
      setTimeout(() => {
        setRun(true);
      }, 800);
    }
  }, [user]);

  useEffect(() => {
    const handleShow = () => {
      setStepIndex(0);
      setRun(true);
      // Ensure we start on the root map page
      if (location.pathname !== '/') {
        navigate('/');
      }
    };
    window.addEventListener('show-tutorial', handleShow);
    return () => window.removeEventListener('show-tutorial', handleShow);
  }, [navigate, location.pathname]);

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      localStorage.setItem(`oikos_tutorial_seen_${user.id}`, 'true');
    } else if (type === 'step:after' || type === 'error:target_not_found') {
      const isNext = action === 'next';
      let nextIndex = index + (isNext ? 1 : -1);

      // Pre-navigation handling
      if (index === 2 && action === 'next') {
        // Going from Map (Step 3) to Prayer (Step 4)
        navigate('/prayer');
        setTimeout(() => setStepIndex(nextIndex), 200);
        return;
      }
      
      if (index === 3 && action === 'prev') {
        // Going from Prayer (Step 4) back to Map (Step 3)
        navigate('/');
        setTimeout(() => setStepIndex(nextIndex), 200);
        return;
      }

      setStepIndex(nextIndex);
    }
  };

  if (!user) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      hideCloseButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#ffffff',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(58, 46, 36, 0.7)',
          primaryColor: '#D38C40',    
          textColor: '#3A2E24',
          zIndex: 1000,
        },
        tooltipContainer: {
          textAlign: 'left',
          fontFamily: 'Lora, serif',
        },
        tooltipTitle: {
          fontWeight: 700,
          fontSize: '18px',
          margin: '0 0 10px 0',
        },
        buttonNext: {
          borderRadius: 8,
          fontFamily: 'Lora, serif',
          fontWeight: 600,
        },
        buttonBack: {
          marginRight: 8,
          fontFamily: 'Lora, serif',
          color: '#8C7461',
        },
        buttonSkip: {
          fontFamily: 'Lora, serif',
          color: '#8C7461',
        }
      }}
      locale={{
        back: 'Zurück',
        close: 'Schließen',
        last: 'Fertig',
        next: 'Weiter',
        skip: 'Überspringen',
      }}
    />
  );
}
