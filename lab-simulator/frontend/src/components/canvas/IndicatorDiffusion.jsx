import { useRef, useEffect, useState } from 'react';
import { Group, Circle, Line } from 'react-konva';

/**
 * Renders indicator dye diffusing inside an Erlenmeyer flask liquid
 * with realistic slow drifting/pulsing animation.
 *
 * Simulates the real-life effect of adding indicator drops without stirring:
 * colored plumes sink from the surface and spread through the upper/middle
 * portion of the liquid, drifting gently with convection currents.
 *
 * react-konva rules:
 *   - Always rendered, opacity-controlled (never conditional)
 *   - Animation uses requestAnimationFrame, cleaned up on unmount
 */
export default function IndicatorDiffusion({
  x,               // Flask center X
  y,               // Flask top Y (erlenmeyerY)
  neckHeight = 40,
  bodyHeight = 120,
  bodyWidth = 140,
  fillLevel = 0.44,
  color = '#D07070',
  opacity = 0,
}) {
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const [t, setT] = useState(0);

  // Animate when visible
  useEffect(() => {
    if (opacity <= 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startTimeRef.current = null;
      return;
    }

    if (!startTimeRef.current) startTimeRef.current = performance.now();

    const tick = (now) => {
      const elapsed = (now - startTimeRef.current) / 1000; // seconds
      setT(elapsed); // eslint-disable-line react-hooks/set-state-in-effect
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [opacity > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalHeight = neckHeight + bodyHeight;
  const liquidTopOffset = totalHeight * (1 - fillLevel);
  const liquidSurfaceY = y + liquidTopOffset;
  const flaskBottomY = y + totalHeight;
  const liquidDepth = flaskBottomY - liquidSurfaceY;

  const halfBody = bodyWidth / 2;
  const halfNeck = 15;
  const getHalfWidthAtY = (absY) => {
    const yOff = absY - y;
    if (yOff <= neckHeight) return halfNeck;
    const bodyProgress = (yOff - neckHeight) / bodyHeight;
    return halfNeck + (halfBody - halfNeck) * bodyProgress;
  };

  // Slow organic oscillations — different frequencies per plume for natural feel
  const drift1X = Math.sin(t * 0.7) * 3 + Math.sin(t * 1.3) * 1.5;
  const drift1Y = Math.sin(t * 0.5 + 1) * 2 + Math.cos(t * 0.9) * 1;
  const drift2X = Math.sin(t * 0.6 + 2) * 4 + Math.cos(t * 1.1) * 2;
  const drift2Y = Math.sin(t * 0.4 + 0.5) * 3 + Math.sin(t * 0.8 + 3) * 1.5;
  const drift3X = Math.cos(t * 0.5 + 1) * 5 + Math.sin(t * 0.9 + 2) * 2;
  const drift3Y = Math.sin(t * 0.3 + 2) * 2 + Math.cos(t * 0.7) * 1.5;

  // Pulsing radii — gentle size breathing
  const pulse1 = 1 + Math.sin(t * 0.8) * 0.12;
  const pulse2 = 1 + Math.sin(t * 0.6 + 1.5) * 0.15;
  const pulse3 = 1 + Math.sin(t * 0.5 + 3) * 0.10;

  // Opacity breathing — subtle flicker
  const opaBreathe1 = 0.65 + Math.sin(t * 0.9 + 0.5) * 0.1;
  const opaBreathe2 = 0.75 + Math.sin(t * 0.7 + 2) * 0.1;
  const opaBreathe3 = 0.45 + Math.sin(t * 0.6 + 1) * 0.1;

  // Base plume positions
  const plumeTopY = liquidSurfaceY + liquidDepth * 0.08;
  const plumeMidY = liquidSurfaceY + liquidDepth * 0.32;
  const plumeBottomY = liquidSurfaceY + liquidDepth * 0.55;

  // Animated positions
  const p1x = x + drift1X;
  const p1y = plumeTopY + drift1Y;
  const p2x = x + drift2X;
  const p2y = plumeMidY + drift2Y;
  const p3x = x + drift3X;
  const p3y = plumeBottomY + drift3Y;

  // Width constraints at each depth (using animated Y)
  const w1 = getHalfWidthAtY(p1y) * 0.3 * pulse1;
  const w2 = getHalfWidthAtY(p2y) * 0.45 * pulse2;
  const w3 = getHalfWidthAtY(p3y) * 0.35 * pulse3;

  // Streak control points drift independently for organic tendrils
  const streakMidX = x + Math.sin(t * 0.55 + 1) * 4;
  const streakMidY = plumeMidY + Math.cos(t * 0.45) * 3;

  return (
    <Group opacity={opacity} listening={false}>
      {/* Main central plume — mid-depth, largest */}
      <Circle
        x={p2x}
        y={p2y}
        radius={w2}
        fillRadialGradientStartPoint={{ x: 0, y: -liquidDepth * 0.12 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={w2}
        fillRadialGradientColorStops={[0, color, 0.45, color, 1, 'rgba(0,0,0,0)']}
        opacity={opaBreathe1}
      />

      {/* Upper wisp — near surface, concentrated */}
      <Circle
        x={p1x}
        y={p1y}
        radius={w1}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={w1}
        fillRadialGradientColorStops={[0, color, 0.55, color, 1, 'rgba(0,0,0,0)']}
        opacity={opaBreathe2}
      />

      {/* Lower wisp — deeper, more diffused */}
      <Circle
        x={p3x}
        y={p3y}
        radius={w3}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={w3}
        fillRadialGradientColorStops={[0, color, 0.3, color, 1, 'rgba(0,0,0,0)']}
        opacity={opaBreathe3}
      />

      {/* Thin descending streak — dye sinking tendril */}
      <Line
        points={[p1x, p1y, streakMidX - 1, streakMidY - 5, streakMidX + 2, streakMidY + 5, p3x, p3y]}
        stroke={color}
        strokeWidth={2.5}
        opacity={0.25 + Math.sin(t * 0.6) * 0.08}
        lineCap="round"
        lineJoin="round"
        tension={0.5}
      />

      {/* Secondary streak — offset for organic look */}
      <Line
        points={[p1x - 4, p1y + 4, streakMidX + 3, streakMidY, p3x + 2, p3y - 8]}
        stroke={color}
        strokeWidth={1.8}
        opacity={0.18 + Math.sin(t * 0.5 + 2) * 0.06}
        lineCap="round"
        lineJoin="round"
        tension={0.4}
      />
    </Group>
  );
}
