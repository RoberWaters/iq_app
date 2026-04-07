import { useState, useCallback, useRef } from 'react';
import { interpolateColorHSL } from '../utils/colorInterpolation';

/**
 * Hook that manages the S4 assembly sub-step state machine for P5.
 *
 * The water was measured in S3 and is in the graduated cylinder.
 * Sub-steps:
 *   1 — Pour water from cylinder to erlenmeyer
 *   2 — Add buffer solution (bottle measurement)
 *   3 — Add indicator drops one by one (with magnetic stirrer)
 */

function easeOutQuad(t) {
  return t * (2 - t);
}

export default function useAssembly(measuredValue = 100, maxCapacity = 250) {
  const [currentSubStep, setCurrentSubStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [erlenmeyerFill, setErlenmeyerFill] = useState(0);
  const [erlenmeyerColor, setErlenmeyerColor] = useState('#D6E8F5');
  const [cylinderLevel, setCylinderLevel] = useState(measuredValue);
  const [bufferAmount, setBufferAmount] = useState(10);
  const [dropCount, setDropCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);

  // Magnetic stirrer state (local to assembly, not in store)
  const [stirrerOn, setStirrerOn] = useState(false);
  const [stirBarInFlask, setStirBarInFlask] = useState(false);
  const [stirrerSpeed, setStirrerSpeed] = useState(3);

  // Two-color tracking for localized vs uniform indicator effect
  // mixedColor = what the uniform blend would be at current drop count
  // spotColor = concentrated indicator color shown at drop zone when stirrer off
  const [mixedColor, setMixedColor] = useState('#D0E0EE');
  const [spotColor, setSpotColor] = useState(null);
  const [spotOpacity, setSpotOpacity] = useState(0);

  // Progressive mixing animation (stirrer ON transition)
  const [isMixing, setIsMixing] = useState(false);
  const mixingRafRef = useRef(null);
  const mixingStartRef = useRef(null);
  const MIXING_DURATION = 2200; // ms

  const animTimeout = useRef(null);
  const rafRef = useRef(null);
  const erlFillRef = useRef(0);
  const drainRafRef = useRef(null);
  const drainDelayRef = useRef(null);
  const cylLevelRef = useRef(measuredValue);

  const maxFill = 1.0;

  const updateFill = useCallback((val) => {
    erlFillRef.current = val;
    setErlenmeyerFill(val);
  }, []);

  // Compute the mixed color for a given drop count
  const computeMixedColor = useCallback((count) => {
    if (count === 0) return '#D0E0EE';
    const t = Math.min(1, count / 10);
    return interpolateColorHSL('#D0E0EE', '#D07070', t);
  }, []);

  // Sub-step 1: Pour water from cylinder to erlenmeyer
  const pourWater = useCallback(() => {
    if (isAnimating || currentSubStep !== 1 || pendingAdvance) return;
    setIsAnimating(true);

    const targetFill = (measuredValue / maxCapacity) * maxFill;
    const startCylinder = measuredValue;
    const duration = 2500;
    let startTime = null;

    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const progress = easeOutQuad(rawProgress);

      setCylinderLevel(startCylinder * (1 - progress));
      updateFill(targetFill * progress);

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCylinderLevel(0);
        updateFill(targetFill);
        setErlenmeyerColor('#D6E8F5');
        setIsAnimating(false);
        setPendingAdvance(true);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [isAnimating, currentSubStep, pendingAdvance, measuredValue, maxCapacity, updateFill]);

  // Sub-step 1: Hold-to-drain cylinder into erlenmeyer (alternative to pourWater)
  const holdPourWater = useCallback(() => {
    if (currentSubStep !== 1 || pendingAdvance || drainRafRef.current || drainDelayRef.current) return;
    const drainRate = Math.max(8, measuredValue / 5); // mL/s
    const targetFillTotal = (measuredValue / maxCapacity) * maxFill;
    // Wait for the cylinder tilt animation to bring the spout over the flask mouth
    drainDelayRef.current = setTimeout(() => {
      drainDelayRef.current = null;
      let lastTs = null;
      const tick = (ts) => {
        if (lastTs === null) lastTs = ts;
        const dt = (ts - lastTs) / 1000;
        lastTs = ts;
        const next = Math.max(0, cylLevelRef.current - drainRate * dt);
        cylLevelRef.current = next;
        setCylinderLevel(next);
        const drained = measuredValue - next;
        const newFill = (drained / measuredValue) * targetFillTotal;
        updateFill(newFill);
        if (next <= 0) {
          drainRafRef.current = null;
          setErlenmeyerColor('#D6E8F5');
          setPendingAdvance(true);
          return;
        }
        drainRafRef.current = requestAnimationFrame(tick);
      };
      drainRafRef.current = requestAnimationFrame(tick);
    }, 650);
  }, [currentSubStep, pendingAdvance, measuredValue, maxCapacity, updateFill]);

  const stopPourWater = useCallback(() => {
    if (drainDelayRef.current) {
      clearTimeout(drainDelayRef.current);
      drainDelayRef.current = null;
    }
    if (drainRafRef.current) {
      cancelAnimationFrame(drainRafRef.current);
      drainRafRef.current = null;
    }
  }, []);

  // Confirm advance (user clicks "Continuar") — works for sub-step 1→2 and 2→3
  const confirmAdvance = useCallback(() => {
    if (!pendingAdvance) return;
    setPendingAdvance(false);
    setCurrentSubStep((prev) => prev + 1);
  }, [pendingAdvance]);

  // Sub-step 2: Update visuals after buffer drain (does NOT advance to step 3)
  const completeBuffer = useCallback((amount, targetFillLevel) => {
    if (currentSubStep !== 2) return;
    setBufferAmount(amount);
    const newFill = targetFillLevel || Math.min(maxFill, erlFillRef.current + amount / maxCapacity);
    updateFill(newFill);
    setErlenmeyerColor('#D0E0EE');
    setMixedColor('#D0E0EE');
    setPendingAdvance(true);
  }, [currentSubStep, maxCapacity, updateFill]);

  // Stirrer controls
  const toggleStirrer = useCallback(() => {
    if (!stirBarInFlask && !stirrerOn) return;

    const turningOn = !stirrerOn;
    setStirrerOn(turningOn);

    if (turningOn && dropCount > 0 && !isMixing) {
      // Animate progressive mixing: base color → mixed color over MIXING_DURATION
      const baseCol = '#D0E0EE';
      const targetCol = computeMixedColor(dropCount);
      const startSpotOpa = spotOpacity;

      setIsMixing(true);
      mixingStartRef.current = performance.now();

      const tick = (now) => {
        const elapsed = now - mixingStartRef.current;
        const t = Math.min(1, elapsed / MIXING_DURATION);
        const eased = t * (2 - t); // easeOutQuad

        setErlenmeyerColor(interpolateColorHSL(baseCol, targetCol, eased));
        setSpotOpacity(startSpotOpa * (1 - eased));

        if (t < 1) {
          mixingRafRef.current = requestAnimationFrame(tick);
        } else {
          setErlenmeyerColor(targetCol);
          setSpotOpacity(0);
          setSpotColor(null);
          setIsMixing(false);
          mixingRafRef.current = null;
        }
      };
      mixingRafRef.current = requestAnimationFrame(tick);
    } else if (!turningOn && isMixing) {
      // Turning OFF mid-mix: cancel animation, keep current state
      if (mixingRafRef.current) cancelAnimationFrame(mixingRafRef.current);
      mixingRafRef.current = null;
      setIsMixing(false);
    }
  }, [stirBarInFlask, stirrerOn, dropCount, spotOpacity, isMixing, computeMixedColor]);

  const handleSetStirBarInFlask = useCallback((inFlask) => {
    setStirBarInFlask(inFlask);
    if (!inFlask) setStirrerOn(false);
  }, []);

  const handleSetStirrerSpeed = useCallback((speed) => {
    setStirrerSpeed(Math.max(1, Math.min(5, speed)));
  }, []);

  // Sub-step 3: Add indicator drops
  const addIndicatorDrop = useCallback(() => {
    if (isAnimating || currentSubStep !== 3) return;
    setIsAnimating(true);

    const newCount = dropCount + 1;

    animTimeout.current = setTimeout(() => {
      setDropCount(newCount);
      const mixed = computeMixedColor(newCount);
      setMixedColor(mixed);

      const isStirring = stirrerOn && stirBarInFlask;
      if (isStirring) {
        // Stirrer ON: uniform color change
        setErlenmeyerColor(mixed);
        setSpotOpacity(0);
        setSpotColor(null);
      } else {
        // Stirrer OFF: base stays at buffer color, show spot
        setErlenmeyerColor('#D0E0EE');
        setSpotColor(mixed);
        setSpotOpacity(Math.min(0.8, newCount * 0.15));
      }
      setIsAnimating(false);
    }, 500);
  }, [isAnimating, currentSubStep, dropCount, stirrerOn, stirBarInFlask, computeMixedColor]);

  const finishAssembly = useCallback(() => {
    if (currentSubStep === 3 && dropCount >= 1) {
      // Ensure final color is the mixed color (as if stirred)
      const mixed = computeMixedColor(dropCount);
      setErlenmeyerColor(mixed);
      setSpotOpacity(0);
      setSpotColor(null);
      setCompleted(true);
    }
  }, [currentSubStep, dropCount, computeMixedColor]);

  const cleanup = useCallback(() => {
    if (animTimeout.current) clearTimeout(animTimeout.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (mixingRafRef.current) cancelAnimationFrame(mixingRafRef.current);
    if (drainRafRef.current) cancelAnimationFrame(drainRafRef.current);
    if (drainDelayRef.current) clearTimeout(drainDelayRef.current);
    drainRafRef.current = null;
    drainDelayRef.current = null;
  }, []);

  const reset = useCallback(() => {
    if (animTimeout.current) clearTimeout(animTimeout.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (mixingRafRef.current) cancelAnimationFrame(mixingRafRef.current);
    if (drainRafRef.current) cancelAnimationFrame(drainRafRef.current);
    animTimeout.current = null;
    rafRef.current = null;
    mixingRafRef.current = null;
    mixingStartRef.current = null;
    drainRafRef.current = null;
    erlFillRef.current = 0;
    cylLevelRef.current = measuredValue;
    setCurrentSubStep(1);
    setIsAnimating(false);
    setErlenmeyerFill(0);
    setErlenmeyerColor('#D6E8F5');
    setCylinderLevel(measuredValue);
    setBufferAmount(10);
    setDropCount(0);
    setCompleted(false);
    setPendingAdvance(false);
    setStirrerOn(false);
    setStirBarInFlask(false);
    setStirrerSpeed(3);
    setMixedColor('#D0E0EE');
    setSpotColor(null);
    setSpotOpacity(0);
    setIsMixing(false);
  }, [measuredValue]);

  return {
    currentSubStep,
    isAnimating,
    erlenmeyerFill,
    erlenmeyerColor,
    cylinderLevel,
    bufferAmount,
    dropCount,
    completed,
    pendingAdvance,
    pourWater,
    holdPourWater,
    stopPourWater,
    confirmAdvance,
    completeBuffer,
    addIndicatorDrop,
    finishAssembly,
    cleanup,
    reset,
    // Stirrer state
    stirrerOn,
    stirBarInFlask,
    stirrerSpeed,
    toggleStirrer,
    setStirBarInFlask: handleSetStirBarInFlask,
    setStirrerSpeed: handleSetStirrerSpeed,
    // Spot state
    mixedColor,
    spotColor,
    spotOpacity,
  };
}
