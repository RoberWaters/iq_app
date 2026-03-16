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
  const [pendingAdvance, setPendingAdvance] = useState(false); // step done, waiting for user to click "Continuar"

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

  // Helper: instead of auto-advancing, set pendingAdvance so user clicks "Continuar"
  const markPending = useCallback((nextIndex) => {
    if (nextIndex >= totalSteps) {
      setCompleted(true);
    } else {
      setPendingAdvance(true);
    }
  }, [totalSteps]);

  // User clicks "Continuar" to actually advance to the next step
  const confirmAdvance = useCallback(() => {
    if (!pendingAdvance) return;
    setPendingAdvance(false);
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= totalSteps) {
      setCompleted(true);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  }, [pendingAdvance, currentStepIndex, totalSteps]);

  const executeStep = useCallback(() => {
    if (isAnimating || currentStepIndex >= totalSteps) return;

    const step = assemblySteps[currentStepIndex];
    if (!step) return;

    // add_indicator is handled by addDrop/finishDrops — skip if called directly
    if (step.action === 'add_indicator') return;

    const visualAfter = step.visualAfter;

    // measure_with_bottle: visual pour already handled by BottleBench canvas.
    // Just apply the final state and wait for user to click "Continuar".
    if (step.action === 'measure_with_bottle') {
      applyVisualAfter(visualAfter);
      markPending(currentStepIndex + 1);
      return;
    }
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
        markPending(currentStepIndex + 1);
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

    // After animation, wait for user to click "Continuar"
    const advanceDelay = duration + 100;
    animTimeout.current = setTimeout(() => {
      markPending(currentStepIndex + 1);
    }, advanceDelay);
  }, [isAnimating, currentStepIndex, totalSteps, assemblySteps, flaskState.fillLevel, applyVisualAfter, animateFillTo, markPending]);

  // Complete the reflux step: apply visualAfter, stop refluxing, wait for "Continuar".
  const completeReflux = useCallback(() => {
    if (!refluxing) return;

    const step = assemblySteps[currentStepIndex];
    if (!step) return;

    applyVisualAfter(step.visualAfter);
    setRefluxing(false);
    setIsAnimating(false);

    markPending(currentStepIndex + 1);
  }, [refluxing, currentStepIndex, assemblySteps, applyVisualAfter, markPending]);

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

  // Finish the drop step: apply visualAfter and wait for "Continuar".
  const finishDrops = useCallback(() => {
    if (isDropping || !isDropStep || dropCount < 1) return;

    const step = assemblySteps[currentStepIndex];
    if (!step) return;

    applyVisualAfter(step.visualAfter);
    setDropCount(0);

    markPending(currentStepIndex + 1);
  }, [isDropping, isDropStep, dropCount, currentStepIndex, assemblySteps, applyVisualAfter, markPending]);

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
    setPendingAdvance(false);
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
    // Step advancement control
    pendingAdvance,
    confirmAdvance,
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
