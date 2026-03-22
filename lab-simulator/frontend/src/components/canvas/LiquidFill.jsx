import { useEffect, useRef, useCallback } from 'react';
import { Line } from 'react-konva';
import Konva from 'konva';

/**
 * Liquid fill polygon for the Erlenmeyer flask.
 *
 * When `isStirring` is true the top surface animates with a vortex + wave.
 * When stirring stops the wave dampens gradually (~1.5 s) instead of
 * snapping to flat — simulating a liquid settling.
 *
 * react-konva rules:
 *   - Always rendered, opacity-toggled
 *   - Konva.Animation destroyed on cleanup
 */

const TOP_STEPS = 20;
const SIDE_STEPS = 8;
const RAMP_UP_SPEED = 2.5;   // intensity 0→1 in ~0.4 s
const DECAY_SPEED = 1.2;     // intensity 1→0 in ~1.5 s (exponential)

export default function LiquidFill({
  x, y, bodyWidth, bodyHeight, neckWidth, neckHeight,
  fillLevel, color, isStirring = false, stirSpeed = 3,
}) {
  const lineRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);
  const intensityRef = useRef(0); // 0 = calm, 1 = full stirring

  const halfBody = bodyWidth / 2;
  const halfNeck = neckWidth / 2;
  const totalHeight = neckHeight + bodyHeight;
  const liquidTop = totalHeight * (1 - fillLevel);

  const getWidthAtY = useCallback((yPos) => {
    if (yPos <= neckHeight) return halfNeck;
    const bodyProgress = (yPos - neckHeight) / bodyHeight;
    return halfNeck + (halfBody - halfNeck) * bodyProgress;
  }, [neckHeight, bodyHeight, halfNeck, halfBody]);

  const topWidth = getWidthAtY(liquidTop);
  const bottomY = y + totalHeight;

  const buildPoints = useCallback((waveOffsets) => {
    const points = [];
    for (let i = 0; i <= TOP_STEPS; i++) {
      const t = i / TOP_STEPS;
      const px = (x - topWidth + 3) + t * (topWidth * 2 - 6);
      const waveDy = waveOffsets ? waveOffsets[i] : 0;
      points.push(px, y + liquidTop + waveDy);
    }
    for (let i = 0; i <= SIDE_STEPS; i++) {
      const t = i / SIDE_STEPS;
      const currentY = liquidTop + (totalHeight - liquidTop) * t;
      const w = getWidthAtY(currentY);
      points.push(x + w - 2, y + currentY);
    }
    points.push(x + halfBody - 2, bottomY - 2);
    points.push(x - halfBody + 2, bottomY - 2);
    for (let i = SIDE_STEPS; i >= 0; i--) {
      const t = i / SIDE_STEPS;
      const currentY = liquidTop + (totalHeight - liquidTop) * t;
      const w = getWidthAtY(currentY);
      points.push(x - w + 2, y + currentY);
    }
    return points;
  }, [x, y, topWidth, liquidTop, totalHeight, halfBody, bottomY, getWidthAtY]);

  // Single animation that handles both ramp-up and decay
  useEffect(() => {
    if (!lineRef.current) return;

    // If not stirring AND already calm, nothing to do
    if (!isStirring && intensityRef.current < 0.001) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      return;
    }

    // Already running — the isStirring flag change will be picked up by the anim loop
    if (animRef.current) return;

    const anim = new Konva.Animation((frame) => {
      const dt = Math.min(frame.timeDiff / 1000, 0.05);

      // Ramp intensity up or decay it down
      if (isStirring) {
        intensityRef.current = Math.min(1, intensityRef.current + dt * RAMP_UP_SPEED);
      } else {
        intensityRef.current *= Math.exp(-DECAY_SPEED * dt);
        if (intensityRef.current < 0.005) {
          intensityRef.current = 0;
        }
      }

      const intensity = intensityRef.current;

      if (intensity < 0.001) {
        // Fully calm — stop animation and reset
        const node = lineRef.current;
        if (node) node.points(buildPoints(null));
        anim.stop();
        animRef.current = null;
        return;
      }

      // Advance wave angle (keep rotating even during decay for natural look)
      angleRef.current += stirSpeed * Math.PI * 0.8 * dt * intensity;
      const angle = angleRef.current;

      const waveOffsets = [];
      for (let i = 0; i <= TOP_STEPS; i++) {
        const t = i / TOP_STEPS;
        const centerDist = Math.abs(t - 0.5) * 2;
        const vortexDip = (1 - centerDist * centerDist) * (5 + stirSpeed * 1.5) * intensity;
        const wobble = Math.sin(angle * 2 + t * Math.PI * 4) * (1.5 + stirSpeed * 0.3) * intensity;
        waveOffsets.push(vortexDip + wobble * (1 - centerDist * 0.5));
      }

      const node = lineRef.current;
      if (node) node.points(buildPoints(waveOffsets));
    }, lineRef.current.getLayer());

    anim.start();
    animRef.current = anim;

    return () => {
      anim.stop();
      animRef.current = null;
    };
  }, [isStirring, stirSpeed, buildPoints]);

  return (
    <Line
      ref={lineRef}
      points={buildPoints(null)}
      fill={color}
      opacity={fillLevel > 0 ? 0.75 : 0}
      closed
    />
  );
}
