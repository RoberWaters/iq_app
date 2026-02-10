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

  // Max fill in erlenmeyer: measured water + buffer + negligible indicator
  // Normalize to 0–1 scale based on ~250 mL max
  const maxFill = 0.65;

  const pourWater = useCallback(() => {
    if (isAnimating || currentSubStep !== 2) return;
    setIsAnimating(true);

    animTimeout.current = setTimeout(() => {
      setCylinderLevel(0);
      // Fill proportional to measured value relative to erlenmeyer capacity
      const fill = (measuredValue / maxCapacity) * maxFill;
      setErlenmeyerFill(fill);
      setErlenmeyerColor('#F8F8FF');
      setIsAnimating(false);
      setCurrentSubStep(3);
    }, 2000);
  }, [isAnimating, currentSubStep, measuredValue, maxCapacity]);

  const pourBuffer = useCallback((amount) => {
    if (isAnimating || currentSubStep !== 3) return;
    setBufferAmount(amount);
    setIsAnimating(true);

    animTimeout.current = setTimeout(() => {
      // Slightly increase fill level
      setErlenmeyerFill(prev => Math.min(maxFill, prev + (amount / maxCapacity) * maxFill * 0.3));
      setErlenmeyerColor('#F0F0F0');
      setIsAnimating(false);
      setCurrentSubStep(4);
    }, 1500);
  }, [isAnimating, currentSubStep, maxCapacity]);

  const addIndicatorDrop = useCallback(() => {
    if (isAnimating || currentSubStep !== 4) return;
    setIsAnimating(true);

    const newCount = dropCount + 1;

    animTimeout.current = setTimeout(() => {
      setDropCount(newCount);
      // Interpolate from transparent white to reddish based on drops (5 = full reddish)
      const t = Math.min(1, newCount / 5);
      const newColor = interpolateColorHSL('#F0F0F0', '#CD5C5C', t);
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
    if (animTimeout.current) {
      clearTimeout(animTimeout.current);
    }
  }, []);

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
  };
}
