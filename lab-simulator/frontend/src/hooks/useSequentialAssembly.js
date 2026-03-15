import { useState, useCallback, useRef } from 'react';

/**
 * Hook that manages sequential assembly for practices with step-by-step
 * click-to-add assembly (e.g., Practice 4 Volhard, Practice 3 Mohr).
 *
 * Unlike useAssembly (P5's interactive sliders/drags), this hook walks through
 * an ordered list of steps where each step is executed with a button click
 * and may trigger a pour/add animation.
 *
 * `add_indicator` steps use a multi-click drop mode: each click adds one drop
 * with a brief animation. The student presses "Listo" to finish and advance.
 *
 * @param {Array} assemblySteps - Ordered assembly step configs
 * @param {Object|null} initialFlaskState - Optional initial flask visual state
 *   (e.g., when sample was transferred in S3 before assembly begins)
 */

const DEFAULT_FLASK = {
  fillLevel: 0,
  containerColor: '#DCE8F5',
  label: '',
  precipitate: null,
  foilCovered: false,
  condenserOn: false,
};

function easeOutQuad(t) {
  return t * (2 - t);
}

export default function useSequentialAssembly(assemblySteps = [], initialFlaskState = null) {
  const startFlask = initialFlaskState
    ? { ...DEFAULT_FLASK, ...initialFlaskState }
    : DEFAULT_FLASK;
  const startFlaskRef = useRef(startFlask);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Drop mode state for add_indicator steps
  const [dropCount, setDropCount] = useState(0);
  const [isDropping, setIsDropping] = useState(false); // brief per-drop animation flag

  // Reflux timer state
  const [refluxing, setRefluxing] = useState(false);

  // Flask visual state — evolves step by step from visualAfter configs
  const [flaskState, setFlaskState] = useState(startFlask);

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
      condenserOn: visualAfter.condenserOn ?? prev.condenserOn,
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

  // Whether the current step is a drop-mode indicator step
  const isDropStep = currentStep?.action === 'add_indicator';

  const executeStep = useCallback(() => {
    if (isAnimating || currentStepIndex >= totalSteps) return;

    const step = assemblySteps[currentStepIndex];
    if (!step) return;

    // add_indicator is handled by addDrop/finishDrops — skip if called directly
    if (step.action === 'add_indicator') return;

    // measure_with_bottle is a two-phase step: bottle measurement (UI-driven)
    // then pour animation (same as add_reagent). The UI calls executeStep()
    // only after bottle measurement is confirmed.

    const visualAfter = step.visualAfter;
    const action = step.action;

    // Instant-ish actions (no pour animation): cover, attach_condenser, cool
    const instantActions = {
      cover: 600,
      attach_condenser: 1000,
      cool: 1200,
    };
    if (action in instantActions) {
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
      }, instantActions[action]);
      return;
    }

    // Reflux: timer-driven step. Sets isAnimating + refluxing flag.
    // The reflux runs until completeReflux() is called (from the timer UI).
    if (action === 'reflux') {
      setIsAnimating(true);
      setRefluxing(true);
      return;
    }

    // For pour-type actions (measure_and_transfer, add_reagent, transfer), animate fill
    const targetFill = visualAfter?.fillLevel ?? flaskState.fillLevel;
    const duration = action === 'measure_and_transfer' ? 2500 : 2500;

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

  // Complete the reflux step: apply visualAfter, stop refluxing, advance.
  const completeReflux = useCallback(() => {
    if (!refluxing) return;

    const step = assemblySteps[currentStepIndex];
    if (!step) return;

    applyVisualAfter(step.visualAfter);
    setRefluxing(false);
    setIsAnimating(false);

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= totalSteps) {
      setCompleted(true);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  }, [refluxing, currentStepIndex, totalSteps, assemblySteps, applyVisualAfter]);

  // Add a single drop (for add_indicator steps).
  // Triggers a brief isDropping flag (400 ms) used by the canvas for the drop animation.
  const addDrop = useCallback(() => {
    if (isAnimating || isDropping || !isDropStep) return;

    setIsDropping(true);
    setDropCount(prev => prev + 1);

    // Brief animation window — canvas shows droplet falling
    animTimeout.current = setTimeout(() => {
      setIsDropping(false);
    }, 400);
  }, [isAnimating, isDropping, isDropStep]);

  // Finish the drop step: apply visualAfter and advance to next step.
  const finishDrops = useCallback(() => {
    if (isDropping || !isDropStep || dropCount < 1) return;

    const step = assemblySteps[currentStepIndex];
    if (!step) return;

    applyVisualAfter(step.visualAfter);
    setDropCount(0);

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= totalSteps) {
      setCompleted(true);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  }, [isDropping, isDropStep, dropCount, currentStepIndex, totalSteps, assemblySteps, applyVisualAfter]);

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
    setDropCount(0);
    setIsDropping(false);
    setRefluxing(false);
    setFlaskState(startFlaskRef.current);
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
    // Drop mode (add_indicator steps)
    isDropStep,
    dropCount,
    isDropping,
    addDrop,
    finishDrops,
    // Reflux timer
    refluxing,
    completeReflux,
  };
}
