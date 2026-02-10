import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../store/useSimulatorStore';
import * as api from '../api/client';

/**
 * Hook for controlling practice flow (navigation between stages)
 */
export default function usePracticeFlow() {
  const navigate = useNavigate();
  const {
    practiceId, sessionId, currentStage,
    setCurrentStage, setSessionId,
  } = useSimulatorStore();

  const goToStage = useCallback(async (stage) => {
    setCurrentStage(stage);
    if (sessionId) {
      try {
        await api.updateStage(sessionId, stage);
      } catch (e) {
        console.error('Failed to update stage:', e);
      }
    }
    navigate(`/practice/${practiceId}/stage/${stage}`);
  }, [practiceId, sessionId, setCurrentStage, navigate]);

  const nextStage = useCallback(() => {
    if (currentStage < 8) {
      goToStage(currentStage + 1);
    }
  }, [currentStage, goToStage]);

  const prevStage = useCallback(() => {
    if (currentStage > 1) {
      goToStage(currentStage - 1);
    }
  }, [currentStage, goToStage]);

  const startPractice = useCallback(async (practice) => {
    try {
      const session = await api.createSession({ practice_id: practice.id });
      setSessionId(session.id);
      goToStage(2);
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }, [setSessionId, goToStage]);

  const goHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return {
    currentStage,
    goToStage,
    nextStage,
    prevStage,
    startPractice,
    goHome,
  };
}
