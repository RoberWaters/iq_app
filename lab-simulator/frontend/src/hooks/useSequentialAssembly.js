import { useState, useCallback, useRef } from 'react';

/**
 * Hook that manages sequential assembly for practices with step-by-step
 * click-to-add assembly (e.g., Practice 4 Volhard).
 *
 * Unlike useAssembly (P5's interactive sliders/drags), this hook walks through
 * an ordered list of steps where each step is executed with a button click
 * and may trigger a pour/add animation.
 */

function easeOutQuad(t) {
  return t * (2 - t);
}

export default function useSequentialAssembly(assemblySteps = []) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Flask visual state — evolves step by step from visualAfter configs
  const [flaskState, setFlaskState] = useState({
    fillLevel: 0,
    containerColor: '#F8F8FF',
    label: '',
    precipitate: null,
    foilCovered: false,
  });

  const animTimeout = useRef(null);
  const rafRef = useRef(null);

  const currentStep = assemblySteps[currentStepIndex] || null;
  const totalSteps = assemblySteps.length;

  const applyVisualAfter = useCallback((visualAfter) => {
    if (!visualAfter) return;
    setFlaskState(prev => ({
      ...prev,
      fillLevel: visualAfter.fillLevel ?? prev.fillLevel,
      containerColor: visualAfter.containerColor ?? prev.containerColor,
      label: visualAfter.label ?? prev.label,
      precipitate: visualAfter.precipitate !== undefined ? visualAfter.precipitate : prev.precipitate,
      foilCovered: visualAfter.foilCovered ?? prev.foilCovered,
    }));
  }, []);

  // Animate fill level transition
  const animateFillTo = useCallback((targetFill, targetColor, visualAfter, duration = 1500) => {
    setIsAnimating(true);
    const startFill = flaskState.fillLevel;
    let startTime = null;

    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const progress = easeOutQuad(rawProgress);

      setFlaskState(prev => ({
        ...prev,
        fillLevel: startFill + (targetFill - startFill) * progress,
      }));

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        applyVisualAfter(visualAfter);
        setIsAnimating(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [flaskState.fillLevel, applyVisualAfter]);

  const executeStep = useCallback(() => {
    if (isAnimating || currentStepIndex >= totalSteps) return;

    const step = assemblySteps[currentStepIndex];
    if (!step) return;

    const visualAfter = step.visualAfter;
    const action = step.action;

    // For "cover" action, apply instantly (no pour animation)
    if (action === 'cover') {
      setIsAnimating(true);
      animTimeout.current = setTimeout(() => {
        applyVisualAfter(visualAfter);
        setIsAnimating(false);
        const nextIndex = currentStepIndex + 1;
        if (nextIndex >= totalSteps) {
          setCompleted(true);
        } else {
          setCurrentStepIndex(nextIndex);
        }
      }, 600);
      return;
    }

    // For add_indicator (liquid indicator like alumbre férrico), short animation
    if (action === 'add_indicator') {
      setIsAnimating(true);
      animTimeout.current = setTimeout(() => {
        applyVisualAfter(visualAfter);
        setIsAnimating(false);
        const nextIndex = currentStepIndex + 1;
        if (nextIndex >= totalSteps) {
          setCompleted(true);
        } else {
          setCurrentStepIndex(nextIndex);
        }
      }, 800);
      return;
    }

    // For pour-type actions (measure_and_transfer, add_reagent, transfer), animate fill
    const targetFill = visualAfter?.fillLevel ?? flaskState.fillLevel;
    const duration = action === 'measure_and_transfer' ? 2000 : 1500;

    animateFillTo(targetFill, visualAfter?.containerColor, visualAfter, duration);

    // After animation, advance step
    const advanceDelay = duration + 100;
    animTimeout.current = setTimeout(() => {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex >= totalSteps) {
        setCompleted(true);
      } else {
        setCurrentStepIndex(nextIndex);
      }
    }, advanceDelay);
  }, [isAnimating, currentStepIndex, totalSteps, assemblySteps, flaskState.fillLevel, applyVisualAfter, animateFillTo]);

  const cleanup = useCallback(() => {
    if (animTimeout.current) clearTimeout(animTimeout.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = useCallback(() => {
    if (animTimeout.current) clearTimeout(animTimeout.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    animTimeout.current = null;
    rafRef.current = null;
    setCurrentStepIndex(0);
    setIsAnimating(false);
    setCompleted(false);
    setFlaskState({
      fillLevel: 0,
      containerColor: '#F8F8FF',
      label: '',
      precipitate: null,
      foilCovered: false,
    });
  }, []);

  return {
    currentStepIndex,
    currentStep,
    totalSteps,
    isAnimating,
    completed,
    flaskState,
    executeStep,
    cleanup,
    reset,
  };
}
