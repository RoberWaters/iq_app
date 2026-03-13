import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Line, Circle, Text } from 'react-konva';
import Erlenmeyer from './Erlenmeyer';
import PourAnimation from './PourAnimation';

/**
 * Drag-based pipette measurement canvas for fixed-volume practices (P4).
 *
 * Two-step interaction:
 * 1. Drag the pipette to the sample beaker → aspiration animation fills the pipette.
 * 2. Drag the filled pipette to the Erlenmeyer flask → pour animation transfers sample.
 *
 * Animations use multi-phase sub-progress for sequential movement:
 *   Aspirate: slide to sample → dip → fill → lift → return
 *   Drain:    slide to flask → tilt → pour → un-tilt → return
 *
 * react-konva rules:
 *   - No conditional rendering inside Layer — all nodes always rendered, opacity-toggled.
 *   - setCursor wraps getStage() in try-catch.
 *   - State changes deferred with setTimeout(fn, 0) inside Konva handlers.
 */

const SNAP_DISTANCE = 100;

function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch { /* ignore */ }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** Map a global progress value into a sub-range, returning 0–1 within that range. */
function sub(p, start, end) {
  return Math.max(0, Math.min(1, (p - start) / (end - start)));
}

export default function PipetteBench({
  width = 420,
  height = 400,
  onTransferComplete,
  onPhaseChange,
  pipetteVolume = 10,
  flaskLabel = "Matraz 50 mL",
}) {
  // Phase: 'idle' → 'aspirating' → 'loaded' → 'draining' → 'done'
  const [phase, setPhase] = useState('idle');
  const [animProgress, setAnimProgress] = useState(0);
  const [nearTarget, setNearTarget] = useState(false);
  const rafRef = useRef(null);

  // Stable callback ref (avoids re-triggering animation when prop changes)
  const onCompleteRef = useRef(onTransferComplete);
  useEffect(() => { onCompleteRef.current = onTransferComplete; }, [onTransferComplete]);

  const benchY = height - 24;

  // ── Layout positions ──────────────────────────────────────────────────────
  const sampleX = 80;
  const sampleTopY = 230;
  const sampleH = benchY - sampleTopY - 2;
  const sampleCY = sampleTopY + sampleH / 2;

  const pipRestX = Math.round(width * 0.47);  // ~197
  const pipRestY = 65;
  const PIPETTE_H = 210;
  const TIP_LOCAL_Y = 207;   // tip at local y=207 from pipette top
  const pipCY = pipRestY + PIPETTE_H * 0.5;

  const flaskX = width - 90;   // ~330
  const flaskY = 195;
  const flaskCY = flaskY + 80;

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // ── Animation driver ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'aspirating' && phase !== 'draining') return;

    const duration = phase === 'aspirating' ? 2200 : 3000;
    let startTime = null;
    let running = true;

    const frame = (ts) => {
      if (!running) return;
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const raw = Math.min(1, elapsed / duration);
      setAnimProgress(raw);  // linear — sub-phases apply their own easing
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        if (phase === 'aspirating') {
          setPhase('loaded');
          setAnimProgress(0);
        } else {
          setPhase('done');
          setTimeout(() => onCompleteRef.current?.(), 0);
        }
      }
    };

    setAnimProgress(0);
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // ── Proximity check ───────────────────────────────────────────────────────
  const checkProximity = useCallback((groupPos) => {
    const px = pipRestX + groupPos.x;
    const py = pipCY + groupPos.y;
    if (phase === 'idle') {
      return Math.hypot(px - sampleX, py - sampleCY) < SNAP_DISTANCE;
    }
    if (phase === 'loaded') {
      return Math.hypot(px - flaskX, py - flaskCY) < SNAP_DISTANCE;
    }
    return false;
  }, [phase, pipRestX, pipCY, sampleX, sampleCY, flaskX, flaskCY]);

  const isDraggable = phase === 'idle' || phase === 'loaded';

  const dragHandlers = isDraggable ? {
    draggable: true,
    onDragMove: (e) => {
      setNearTarget(checkProximity(e.target.position()));
    },
    onDragEnd: (e) => {
      const near = checkProximity(e.target.position());
      e.target.position({ x: 0, y: 0 });
      e.target.getLayer()?.batchDraw();
      setNearTarget(false);
      if (near) {
        if (phase === 'idle') setTimeout(() => setPhase('aspirating'), 0);
        else if (phase === 'loaded') setTimeout(() => setPhase('draining'), 0);
      }
    },
    onMouseEnter: (e) => setCursor(e, 'grab'),
    onMouseLeave: (e) => setCursor(e, 'default'),
    onDragStart: (e) => setCursor(e, 'grabbing'),
  } : {};

  // ══════════════════════════════════════════════════════════════════════════
  // Compute all visual state from phase + animProgress
  // ══════════════════════════════════════════════════════════════════════════

  let pipX = pipRestX;
  let pipY = pipRestY;
  let tiltAngle = 0;
  let pipetteFillFraction = 0;
  let sampleLiquidFraction = 0.7;
  let flaskFill = 0;
  let isPouring = false;

  const p = animProgress;

  if (phase === 'aspirating') {
    // ── Aspiration sub-phases ──────────────────────────────────────────────
    // 0.00–0.18  Slide to sample beaker
    // 0.18–0.28  Dip tip into liquid
    // 0.28–0.75  Liquid fills pipette
    // 0.75–0.83  Lift tip out of liquid
    // 0.83–1.00  Slide back to rest
    const slideIn   = easeInOut(sub(p, 0.00, 0.18));
    const dip       = easeInOut(sub(p, 0.18, 0.28));
    const fill      = easeInOut(sub(p, 0.28, 0.75));
    const lift      = easeInOut(sub(p, 0.75, 0.83));
    const slideBack = easeInOut(sub(p, 0.83, 1.00));

    // Movement fractions: forward ramps up, return ramps it back down
    const moveFrac = slideIn * (1 - slideBack);
    const dipFrac  = dip * (1 - lift);

    // Target: align pipette center-x with sample beaker, slightly lower
    const targetX = sampleX;
    const targetY = pipRestY + 18;
    const dipAmount = 35;  // px to dip tip into liquid

    pipX = pipRestX + (targetX - pipRestX) * moveFrac;
    pipY = pipRestY + (targetY - pipRestY) * moveFrac + dipAmount * dipFrac;

    pipetteFillFraction = fill;
    sampleLiquidFraction = 0.7 - 0.12 * fill;

  } else if (phase === 'loaded') {
    pipetteFillFraction = 1;
    sampleLiquidFraction = 0.58;

  } else if (phase === 'draining') {
    // ── Drain sub-phases (mirrors aspiration) ─────────────────────────────
    // 0.00–0.18  Slide pipette to flask (vertical, like aspiration)
    // 0.18–0.28  Lower tip into flask mouth
    // 0.28–0.75  Liquid drains by gravity — pour stream visible — flask fills
    // 0.75–0.83  Lift tip out of flask
    // 0.83–1.00  Slide back to rest
    const slideIn   = easeInOut(sub(p, 0.00, 0.18));
    const dip       = easeInOut(sub(p, 0.18, 0.28));
    const drain     = sub(p, 0.28, 0.75);               // linear drain for even flow
    const lift      = easeInOut(sub(p, 0.75, 0.83));
    const slideBack = easeInOut(sub(p, 0.83, 1.00));

    const moveFrac = slideIn * (1 - slideBack);
    const dipFrac  = dip * (1 - lift);

    // Target: align pipette center-x with flask, position so tip reaches flask mouth
    const targetX = flaskX;
    const targetY = flaskY + 10 - TIP_LOCAL_Y;  // position pipette top so tip is at flask mouth
    const dipAmount = 25;  // px to lower tip into flask neck

    pipX = pipRestX + (targetX - pipRestX) * moveFrac;
    pipY = pipRestY + (targetY - pipRestY) * moveFrac + dipAmount * dipFrac;

    pipetteFillFraction = Math.max(0, 1 - easeInOut(drain));
    sampleLiquidFraction = 0.58;
    flaskFill = easeInOut(drain) * 0.14;

    // Pour stream visible while tip is lowered and liquid is flowing
    isPouring = dipFrac > 0.8 && drain > 0.02 && drain < 0.98;

  } else if (phase === 'done') {
    sampleLiquidFraction = 0.58;
    flaskFill = 0.14;
  }
  // else: 'idle' — defaults are correct

  // ── Pour animation endpoints (tip of tilted pipette) ──────────────────────
  const tiltRad = tiltAngle * Math.PI / 180;
  const tipX = pipX + TIP_LOCAL_Y * Math.sin(tiltRad);
  const tipY = pipY + TIP_LOCAL_Y * Math.cos(tiltRad);

  // ── Glow target ───────────────────────────────────────────────────────────
  const glowX = phase === 'idle' ? sampleX : flaskX;
  const glowY = phase === 'idle' ? sampleCY : flaskCY;
  const showGlow = nearTarget && isDraggable;

  // Liquid color (saline solution — colorless, matches S4 initial flask state)
  const liquidColor = '#F8F8FF';

  // Status text
  const statusText =
    phase === 'idle' ? 'Arrastra la pipeta al frasco de muestra'
    : phase === 'aspirating' ? 'Aspirando muestra...'
    : phase === 'loaded' ? 'Arrastra la pipeta al matraz'
    : phase === 'draining' ? 'Transfiriendo al matraz...'
    : `Muestra transferida — ${pipetteVolume.toFixed(2)} mL`;

  const statusColor =
    phase === 'done' ? '#16A34A'
    : phase === 'aspirating' || phase === 'draining' ? '#F59E0B'
    : '#3B82F6';

  return (
    <Stage width={width} height={height}>
      <Layer>

        {/* Bench surface */}
        <Rect
          x={0} y={benchY} width={width} height={24}
          fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]}
        />

        {/* ── Sample beaker (left) ─────────────────────────────────────── */}
        <Group x={sampleX} y={sampleTopY}>
          {/* Beaker body — slight trapezoid */}
          <Line
            points={[-24, 0, 24, 0, 28, sampleH, -28, sampleH]}
            closed fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
          />
          {/* Liquid in beaker */}
          <Line
            points={[
              -22, sampleH * (1 - sampleLiquidFraction),
              22, sampleH * (1 - sampleLiquidFraction),
              26, sampleH - 3,
              -26, sampleH - 3,
            ]}
            closed fill={liquidColor} opacity={0.65}
          />
          {/* Glass highlight */}
          <Rect
            x={-22} y={2} width={3} height={sampleH - 6}
            fill="white" opacity={0.18} cornerRadius={1}
          />
          {/* Rim */}
          <Line
            points={[-24, 0, 24, 0]}
            stroke="#8BA8B8" strokeWidth={2.5} lineCap="round"
          />
          {/* Label */}
          <Rect x={-21} y={12} width={42} height={22}
            fill="#FFF8E0" opacity={0.85} cornerRadius={2} />
          <Text x={-21} y={14} text="Sol." fontSize={8}
            fill="#78350F" fontFamily="IBM Plex Mono" width={42} align="center" />
          <Text x={-21} y={24} text="Salina" fontSize={7}
            fill="#78350F" fontFamily="IBM Plex Mono" width={42} align="center" />
        </Group>

        <Text
          x={sampleX - 45} y={benchY - 16}
          text="Solución salina"
          fontSize={9.5} fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={90} align="center"
        />

        {/* ── Erlenmeyer flask (right) ──────────────────────────────────── */}
        <Erlenmeyer
          x={flaskX} y={flaskY}
          liquidColor={liquidColor}
          fillLevel={flaskFill}
        />
        <Text
          x={flaskX - 45} y={benchY - 16}
          text={flaskLabel}
          fontSize={9.5} fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={90} align="center"
        />

        {/* ── Blue glow ring (target proximity feedback) ────────────────── */}
        <Circle
          x={glowX} y={glowY}
          radius={70}
          fill="#3B82F6"
          opacity={showGlow ? 0.12 : 0}
          listening={false}
        />

        {/* ── Draggable pipette ─────────────────────────────────────────── */}
        <Group x={0} y={0} {...dragHandlers}>
          <Group x={pipX} y={pipY} rotation={tiltAngle}>

            {/* Upper tube (above bulge) */}
            <Rect x={-3} y={0} width={6} height={75}
              fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
              cornerRadius={[3, 3, 0, 0]} />
            {/* Liquid in upper tube — fills from bottom up */}
            <Rect
              x={-1.8} y={2 + (1 - pipetteFillFraction) * 71}
              width={3.6} height={pipetteFillFraction * 71}
              fill={liquidColor} opacity={pipetteFillFraction > 0 ? 0.6 : 0}
              cornerRadius={1}
            />

            {/* Bulge (volumetric expansion) */}
            <Rect x={-11} y={73} width={22} height={34}
              fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
              cornerRadius={11} />
            {/* Liquid in bulge */}
            <Rect x={-9} y={75} width={18} height={30}
              fill={liquidColor} opacity={pipetteFillFraction > 0 ? 0.65 : 0}
              cornerRadius={9} />

            {/* Lower tube (below bulge) */}
            <Rect x={-2.5} y={105} width={5} height={62}
              fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5} />
            {/* Liquid in lower tube */}
            <Rect x={-1.5} y={107} width={3} height={58}
              fill={liquidColor} opacity={pipetteFillFraction > 0 ? 0.55 : 0} />

            {/* Glass highlights */}
            <Rect x={-1} y={2} width={1.5} height={71}
              fill="white" opacity={0.28} cornerRadius={1} />
            <Rect x={-1} y={107} width={1.5} height={58}
              fill="white" opacity={0.20} cornerRadius={1} />

            {/* Calibration mark (10 mL line) */}
            <Line
              points={[-5, 22, 5, 22]}
              stroke="#2563EB" strokeWidth={1.5} opacity={0.8}
            />
            <Text x={7} y={17} text={String(pipetteVolume)} fontSize={8}
              fill="#2563EB" fontFamily="IBM Plex Mono" />

            {/* Capillary tip (tapered) */}
            <Line
              points={[-2.5, 167, 2.5, 167, 1.5, 183, -1.5, 183]}
              closed fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1}
            />
            {/* Sub-tip */}
            <Rect x={-1.5} y={183} width={3} height={24}
              fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={0.8} />

            {/* Rubber bulb at top */}
            <Rect x={-7} y={-22} width={14} height={24}
              fill="#E05050" stroke="#C03030" strokeWidth={1}
              cornerRadius={[7, 7, 2, 2]} />

            {/* Transparent hit area for drag */}
            <Rect x={-14} y={-24} width={28} height={235}
              fill="rgba(0,0,0,0.001)" />
          </Group>
        </Group>

        {/* ── Pour animation: tip → flask mouth ─────────────────────────── */}
        <PourAnimation
          fromX={tipX} fromY={tipY}
          toX={flaskX} toY={flaskY + 6}
          isPouring={isPouring}
          color={liquidColor}
        />

        {/* ── Status text ───────────────────────────────────────────────── */}
        <Text
          x={width / 2 - 120} y={14}
          text={statusText}
          fontSize={11} fill={statusColor}
          fontFamily="IBM Plex Sans" fontStyle="bold"
          width={240} align="center"
        />

        {/* ── Pipette label ─────────────────────────────────────────────── */}
        <Text
          x={pipRestX - 55} y={benchY - 16}
          text={`Pipeta volumétrica ${pipetteVolume} mL`}
          fontSize={9} fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={110} align="center"
        />

      </Layer>
    </Stage>
  );
}
