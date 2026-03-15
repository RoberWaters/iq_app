import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Rect, Line, Text, Circle } from 'react-konva';
import GraduatedCylinder from './GraduatedCylinder';
import PourAnimation from './PourAnimation';

/**
 * Interactive bottle-to-graduated-cylinder measurement canvas.
 *
 * The bottle tilts (pivoting at its base) so its lip aligns with
 * the graduated cylinder's pour spout. Uses PourAnimation for the
 * stream — same pattern as AssemblyBench step 2.
 */
export default function BottleBench({
  width = 500,
  height = 480,
  currentVolume = 0,
  maxVolume = 25,
  isFilling = false,
  liquidColor = '#DCE8F5',
  sampleName = 'Agua\nDestilada',
}) {
  // ── Tilt + animation loop ────────────────────────────────────────────
  const [tiltProgress, setTiltProgress] = useState(0);
  const [animTime, setAnimTime] = useState(0);
  const tiltRef = useRef(0);
  const rafRef = useRef(null);
  const directionRef = useRef('idle'); // 'up', 'down', 'idle'

  useEffect(() => {
    let lastTs = null;
    let running = true;

    const RAMP_UP_MS = 800;   // time to go from bench to pouring position
    const RAMP_DOWN_MS = 700; // time to return from pouring position to bench

    const target = isFilling ? 1 : 0;
    directionRef.current = isFilling ? 'up' : 'down';

    const frame = (ts) => {
      if (!running) return;
      const dt = lastTs !== null ? Math.min(ts - lastTs, 50) : 0;
      lastTs = ts;

      const current = tiltRef.current;
      const dir = directionRef.current;

      if (dir === 'up' && current < 1) {
        tiltRef.current = Math.min(1, current + dt / RAMP_UP_MS);
      } else if (dir === 'down' && current > 0) {
        tiltRef.current = Math.max(0, current - dt / RAMP_DOWN_MS);
      }

      // Apply easeInOut for smooth acceleration/deceleration
      const t = tiltRef.current;
      const eased = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      setTiltProgress(eased);
      setAnimTime(ts * 0.001);

      // Keep animating while not at rest
      if ((dir === 'up' && tiltRef.current < 1) || (dir === 'down' && tiltRef.current > 0)) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
      }
    };

    // Only start a new loop if not already running toward the right target
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tiltRef.current !== target) {
      rafRef.current = requestAnimationFrame(frame);
    } else if (isFilling) {
      // Already at 1, keep updating animTime for pour stream
      const pourFrame = (ts) => {
        if (!running) return;
        setAnimTime(ts * 0.001);
        rafRef.current = requestAnimationFrame(pourFrame);
      };
      rafRef.current = requestAnimationFrame(pourFrame);
    }

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isFilling]);

  // ── Layout ──────────────────────────────────────────────────────────────
  const benchY = height - 20;

  // Graduated cylinder (right side, sits on bench)
  const cylTubeW = 36;
  const cylTubeH = 240;
  const cylBaseH = 10;
  const cylX = 320;
  const cylY = benchY - cylTubeH - cylBaseH;

  // Cylinder spout position (top edge)
  const cylSpoutY = cylY;

  // ── Bottle geometry ─────────────────────────────────────────────────────
  const bottleBodyW = 50;
  const bottleBodyH = 130;
  const bottleNeckW = 18;
  const bottleNeckH = 34;
  const bottleCapH = 10;
  const bottleTotalH = bottleBodyH + bottleNeckH + bottleCapH;

  // Upright position: bottle stands on bench to the left
  const bottleStandX = 120;
  const bottleBaseY = benchY - 4;
  const bottleBodyTop = bottleBaseY - bottleBodyH;
  const bottleNeckTop = bottleBodyTop - bottleNeckH;

  // Tilt: pivot at base, rotate CW. Same pattern as AssemblyBench.
  // The bottle lifts and slides right so its lip lands at the cylinder spout.
  const tiltDeg = tiltProgress * 50;
  const tiltRad = tiltDeg * Math.PI / 180;

  // Target: bottle spout must end up just left of cylinder spout (cylX, cylY)
  // spoutX = pivotX + H·sin(θ) → pivotX = targetX - H·sin(θ)
  // spoutY = pivotY - H·cos(θ) → pivotY = targetY + H·cos(θ)
  const targetSpoutX = cylX - cylTubeW / 2 - 5; // just left of cylinder spout
  const targetSpoutY = cylSpoutY;
  const targetPivotX = targetSpoutX - bottleTotalH * Math.sin(tiltRad);
  const targetPivotY = targetSpoutY + bottleTotalH * Math.cos(tiltRad);

  // Interpolate pivot from standing position to target position
  const bottlePivotX = bottleStandX + tiltProgress * (targetPivotX - bottleStandX);
  const bottlePivotY = bottleBaseY + tiltProgress * (targetPivotY - bottleBaseY);

  // Bottle lip in world coords (should match target when tiltProgress=1)
  const bottleSpoutX = bottlePivotX + bottleTotalH * Math.sin(tiltRad);
  const bottleSpoutY = bottlePivotY - bottleTotalH * Math.cos(tiltRad);

  // Bottle liquid fill (doesn't visibly deplete — big bottle)
  const bottleLiquidTop = bottleBodyTop + 16;
  const bottleLiquidH = bottleBaseY - bottleLiquidTop - 4;

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Bench surface */}
        <Rect
          x={0} y={benchY} width={width} height={20}
          fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]}
        />

        {/* ── BOTTLE (upright, hidden while tilting) ────────────────────── */}
        <Group opacity={tiltProgress > 0.01 ? 0 : 1}>
          {/* Body */}
          <Rect
            x={bottleStandX - bottleBodyW / 2}
            y={bottleBodyTop}
            width={bottleBodyW}
            height={bottleBodyH}
            fill="#F0F4F8"
            stroke="#94A3B8"
            strokeWidth={1.2}
            cornerRadius={[2, 2, 4, 4]}
          />

          {/* Liquid inside */}
          <Rect
            x={bottleStandX - bottleBodyW / 2 + 3}
            y={bottleLiquidTop}
            width={bottleBodyW - 6}
            height={bottleLiquidH}
            fill={liquidColor}
            opacity={0.55}
            cornerRadius={[0, 0, 3, 3]}
          />

          {/* Liquid meniscus */}
          <Line
            points={[
              bottleStandX - bottleBodyW / 2 + 3, bottleLiquidTop,
              bottleStandX + bottleBodyW / 2 - 3, bottleLiquidTop,
            ]}
            stroke="#8EAAB8" strokeWidth={0.8} opacity={0.4}
          />

          {/* Glass highlights */}
          <Rect
            x={bottleStandX - bottleBodyW / 2 + 5}
            y={bottleBodyTop + 10}
            width={4} height={bottleBodyH - 20}
            fill="white" opacity={0.3} cornerRadius={2}
          />
          <Rect
            x={bottleStandX + bottleBodyW / 2 - 10}
            y={bottleBodyTop + 15}
            width={2} height={bottleBodyH - 30}
            fill="white" opacity={0.15} cornerRadius={1}
          />

          {/* Label */}
          <Rect
            x={bottleStandX - 22}
            y={bottleBodyTop + bottleBodyH * 0.28}
            width={44} height={38}
            fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={0.5} cornerRadius={2}
          />
          <Text
            x={bottleStandX - 22}
            y={bottleBodyTop + bottleBodyH * 0.28 + 6}
            width={44}
            text={sampleName}
            fontSize={8} fill="#334155"
            fontFamily="IBM Plex Sans" align="center" lineHeight={1.3}
          />

          {/* Neck (trapezoid) */}
          <Line
            points={[
              bottleStandX - bottleBodyW / 2, bottleBodyTop,
              bottleStandX - bottleNeckW / 2, bottleNeckTop,
              bottleStandX + bottleNeckW / 2, bottleNeckTop,
              bottleStandX + bottleBodyW / 2, bottleBodyTop,
            ]}
            closed fill="#F0F4F8" stroke="#94A3B8" strokeWidth={1.2}
          />

          {/* Liquid in neck */}
          <Rect
            x={bottleStandX - bottleNeckW / 2 + 2}
            y={bottleNeckTop + 4}
            width={bottleNeckW - 4} height={bottleNeckH - 4}
            fill={liquidColor} opacity={0.4}
          />

          {/* Neck rim */}
          <Rect
            x={bottleStandX - bottleNeckW / 2 - 1}
            y={bottleNeckTop - 3}
            width={bottleNeckW + 2} height={5}
            fill="#E2E8F0" stroke="#94A3B8" strokeWidth={0.8} cornerRadius={2}
          />

          {/* Cap */}
          <Rect
            x={bottleStandX - bottleNeckW / 2 - 2}
            y={bottleNeckTop - bottleCapH - 3}
            width={bottleNeckW + 4} height={bottleCapH}
            fill="#1E40AF" stroke="#1E3A8A" strokeWidth={1}
            cornerRadius={[3, 3, 0, 0]}
          />
          <Rect
            x={bottleStandX - bottleNeckW / 2}
            y={bottleNeckTop - bottleCapH - 1}
            width={bottleNeckW} height={3}
            fill="white" opacity={0.2} cornerRadius={1}
          />
        </Group>

        {/* ── BOTTLE (tilting, visible only while pouring) ──────────────── */}
        <Group
          x={bottlePivotX}
          y={bottlePivotY}
          rotation={tiltDeg}
          opacity={tiltProgress > 0.01 ? 1 : 0}
        >
          {/* Body — rendered at local coords where base is at (0,0) */}
          <Rect
            x={-bottleBodyW / 2}
            y={-bottleBodyH}
            width={bottleBodyW}
            height={bottleBodyH}
            fill="#F0F4F8"
            stroke="#94A3B8"
            strokeWidth={1.2}
            cornerRadius={[2, 2, 4, 4]}
          />

          {/* Liquid inside */}
          <Rect
            x={-bottleBodyW / 2 + 3}
            y={-bottleBodyH + 16}
            width={bottleBodyW - 6}
            height={bottleLiquidH}
            fill={liquidColor}
            opacity={0.55}
            cornerRadius={[0, 0, 3, 3]}
          />

          {/* Glass highlights */}
          <Rect
            x={-bottleBodyW / 2 + 5}
            y={-bottleBodyH + 10}
            width={4} height={bottleBodyH - 20}
            fill="white" opacity={0.3} cornerRadius={2}
          />

          {/* Label */}
          <Rect
            x={-22}
            y={-bottleBodyH + bottleBodyH * 0.28}
            width={44} height={38}
            fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={0.5} cornerRadius={2}
          />
          <Text
            x={-22}
            y={-bottleBodyH + bottleBodyH * 0.28 + 6}
            width={44}
            text={sampleName}
            fontSize={8} fill="#334155"
            fontFamily="IBM Plex Sans" align="center" lineHeight={1.3}
          />

          {/* Neck (trapezoid) */}
          <Line
            points={[
              -bottleBodyW / 2, -bottleBodyH,
              -bottleNeckW / 2, -bottleBodyH - bottleNeckH,
              bottleNeckW / 2, -bottleBodyH - bottleNeckH,
              bottleBodyW / 2, -bottleBodyH,
            ]}
            closed fill="#F0F4F8" stroke="#94A3B8" strokeWidth={1.2}
          />

          {/* Liquid in neck */}
          <Rect
            x={-bottleNeckW / 2 + 2}
            y={-bottleBodyH - bottleNeckH + 4}
            width={bottleNeckW - 4} height={bottleNeckH - 4}
            fill={liquidColor} opacity={0.4}
          />

          {/* Neck rim */}
          <Rect
            x={-bottleNeckW / 2 - 1}
            y={-bottleTotalH + bottleCapH - 2}
            width={bottleNeckW + 2} height={5}
            fill="#E2E8F0" stroke="#94A3B8" strokeWidth={0.8} cornerRadius={2}
          />
        </Group>

        {/* Cap sitting on bench when pouring */}
        <Rect
          x={bottleStandX + bottleBodyW / 2 + 10}
          y={benchY - 12}
          width={bottleNeckW + 4} height={bottleCapH}
          fill="#1E40AF" stroke="#1E3A8A" strokeWidth={1}
          cornerRadius={[3, 3, 0, 0]}
          opacity={tiltProgress > 0.01 ? 0.9 : 0}
        />

        {/* ── POUR STREAM (PourAnimation — same as AssemblyBench) ──────── */}
        <PourAnimation
          fromX={bottleSpoutX}
          fromY={bottleSpoutY}
          toX={cylX}
          toY={cylSpoutY + 5}
          isPouring={tiltProgress > 0.55 && isFilling}
          color={liquidColor}
        />

        {/* ── GRADUATED CYLINDER (sits on bench) ──────────────────────── */}
        <GraduatedCylinder
          x={cylX}
          y={cylY}
          capacity={maxVolume}
          currentVolume={currentVolume}
          liquidColor={liquidColor}
          isFlowing={isFilling}
          animTime={animTime}
          tubeWidth={cylTubeW}
          tubeHeight={cylTubeH}
          baseWidth={50}
        />

        {/* Labels */}
        <Text
          x={cylX - 50} y={cylY - 18}
          text={`Probeta ${maxVolume} mL`}
          fontSize={11} fill="#64748B"
          fontFamily="IBM Plex Sans" width={100} align="center"
        />
        <Text
          x={bottleStandX - 45} y={benchY + 2}
          text={sampleName.replace('\n', ' ')}
          fontSize={11} fill="#64748B"
          fontFamily="IBM Plex Sans" width={90} align="center"
        />
      </Layer>
    </Stage>
  );
}
