import { useState, useCallback, useRef } from 'react';
import { interpolateColorHSL } from '../utils/colorInterpolation';

/**
 * Hook that manages the S4 assembly sub-step state machine.
 *
 * Sub-steps:
 *   1 — Confirm water measured (view only)
 *   2 — Pour water from cylinder to erlenmeyer
 *   3 — Add buffer solution (slider + pour)
 *   4 — Add indicator drops one by one
 */

function easeOutQuad(t) {
  return t * (2 - t);
}

export default function useAssembly(measuredValue = 100, maxCapacity = 250) {
  const [currentSubStep, setCurrentSubStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [erlenmeyerFill, setErlenmeyerFill] = useState(0);
  const [erlenmeyerColor, setErlenmeyerColor] = useState('#F8F8FF');
  const [cylinderLevel, setCylinderLevel] = useState(measuredValue);
  const [bufferAmount, setBufferAmount] = useState(10);
  const [dropCount, setDropCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  const animTimeout = useRef(null);
  const rafRef = useRef(null);
  // Mirror erlenmeyerFill in a ref so RAF callbacks can read current value
  const erlFillRef = useRef(0);

  // Max fill in erlenmeyer: measured water + buffer + negligible indicator
  // Normalize to 0–1 scale based on ~250 mL max
  const maxFill = 0.65;

  // Helper to set fill and keep ref in sync
  const updateFill = useCallback((val) => {
    erlFillRef.current = val;
    setErlenmeyerFill(val);
  }, []);

  const pourWater = useCallback(() => {
    if (isAnimating || currentSubStep !== 2) return;
    setIsAnimating(true);

    const targetFill = (measuredValue / maxCapacity) * maxFill;
    const startCylinder = measuredValue;
    const duration = 2500; // 2.5 seconds
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
        setErlenmeyerColor('#F8F8FF');
        setIsAnimating(false);
        setCurrentSubStep(3);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [isAnimating, currentSubStep, measuredValue, maxCapacity, updateFill]);

  const pourBuffer = useCallback((amount) => {
    if (isAnimating || currentSubStep !== 3) return;
    setBufferAmount(amount);
    setIsAnimating(true);

    const startFill = erlFillRef.current;
    const addedFill = (amount / maxCapacity) * maxFill * 0.3;
    const targetFill = Math.min(maxFill, startFill + addedFill);
    const duration = 1800; // 1.8 seconds
    let startTime = null;

    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const progress = easeOutQuad(rawProgress);

      updateFill(startFill + (targetFill - startFill) * progress);

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        updateFill(targetFill);
        setErlenmeyerColor('#F0F0F0');
        setIsAnimating(false);
        setCurrentSubStep(4);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [isAnimating, currentSubStep, maxCapacity, updateFill]);

  const addIndicatorDrop = useCallback(() => {
    if (isAnimating || currentSubStep !== 4) return;
    setIsAnimating(true);

    const newCount = dropCount + 1;

    animTimeout.current = setTimeout(() => {
      setDropCount(newCount);
      // Interpolate from near-white to pale red (max at 10 drops)
      const t = Math.min(1, newCount / 10);
      const newColor = interpolateColorHSL('#F0F0F0', '#D07070', t);
      setErlenmeyerColor(newColor);
      setIsAnimating(false);
    }, 500);
  }, [isAnimating, currentSubStep, dropCount]);

  const confirmStep1 = useCallback(() => {
    if (currentSubStep === 1) {
      setCurrentSubStep(2);
    }
  }, [currentSubStep]);

  const finishAssembly = useCallback(() => {
    if (currentSubStep === 4 && dropCount >= 1) {
      setCompleted(true);
    }
  }, [currentSubStep, dropCount]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (animTimeout.current) clearTimeout(animTimeout.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = useCallback(() => {
    if (animTimeout.current) clearTimeout(animTimeout.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    animTimeout.current = null;
    rafRef.current = null;
    erlFillRef.current = 0;
    setCurrentSubStep(1);
    setIsAnimating(false);
    setErlenmeyerFill(0);
    setErlenmeyerColor('#F8F8FF');
    setCylinderLevel(measuredValue);
    setBufferAmount(10);
    setDropCount(0);
    setCompleted(false);
  }, [measuredValue]);

  return {
    currentSubStep,
    isAnimating,
    erlenmeyerFill,
    erlenmeyerColor,
    cylinderLevel,
    bufferAmount,
    setBufferAmount,
    dropCount,
    completed,
    confirmStep1,
    pourWater,
    pourBuffer,
    addIndicatorDrop,
    finishAssembly,
    cleanup,
    reset,
  };
}
