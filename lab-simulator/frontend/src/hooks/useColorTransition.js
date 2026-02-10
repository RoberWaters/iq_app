import { useMemo } from 'react';
import { getColorAtProgress } from '../utils/colorInterpolation';

/**
 * Hook that returns the interpolated color for a given progress and transitions array
 * @param {Array} colorTransitions - Array of {progress, color}
 * @param {number} progress - Current titration progress (0 to >1)
 * @returns {string} Hex color
 */
export default function useColorTransition(colorTransitions, progress) {
  const color = useMemo(() => {
    return getColorAtProgress(colorTransitions, progress);
  }, [colorTransitions, progress]);

  return color;
}
