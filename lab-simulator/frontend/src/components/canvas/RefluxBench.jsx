import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Line, Circle, Text } from 'react-konva';
import Erlenmeyer from './Erlenmeyer';
import PourAnimation from './PourAnimation';
import DropAnimation from './DropAnimation';

/**
 * Canvas for Practice 2 reflux assembly.
 *
 * Enhanced visuals:
 * - Condenser installation: animated descent with clamp and water line connection.
 * - Reflux: Bunsen burner flame, liquid bubbles, vapor rising into condenser,
 *   condensate dripping back, water flow particles in condenser jacket.
 *
 * react-konva rules:
 *   - No conditional rendering inside Layer — opacity toggle only.
 *   - All decorative elements always rendered.
 *   - setState deferred via setTimeout(fn, 0) inside Konva handlers.
 *   - getStage() wrapped in try-catch.
 */

const SNAP_DISTANCE = 110;

function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch { /* ignore */ }
}

function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function sub(p, start, end) { return Math.max(0, Math.min(1, (p - start) / (end - start))); }

// Per-step vessel configs for P2 assembly
const STEP_CONFIGS = [
  // Step 0: Fat sample — small dish
  {
    vesselType: 'dish',
    label: 'Grasa pesada',
    pourColor: '#FFFDE0',
    tiltAngle: 100,
    vesselH: 60,
    baseX: 120,
    baseY: 320,
    hint: 'Arrastra la grasa al matraz →',
  },
  // Step 1: KOH bottle
  {
    vesselType: 'bottle',
    label: 'KOH 0.50 M — 25 mL',
    pourColor: '#F4F8F4',
    tiltAngle: 100,
    vesselH: 88,
    baseX: 120,
    baseY: 290,
    hint: 'Arrastra el frasco de KOH al matraz →',
  },
  // Steps 2–4: no vessel (button-only)
  { vesselType: 'none', label: '', pourColor: null, tiltAngle: 0, vesselH: 0, baseX: 0, baseY: 0, hint: '' },
  { vesselType: 'none', label: '', pourColor: null, tiltAngle: 0, vesselH: 0, baseX: 0, baseY: 0, hint: '' },
  { vesselType: 'none', label: '', pourColor: null, tiltAngle: 0, vesselH: 0, baseX: 0, baseY: 0, hint: '' },
  // Step 5: Phenolphthalein dropper (clickable)
  {
    vesselType: 'dropper',
    label: 'Fenolftaleína',
    pourColor: '#E91E8C',
    tiltAngle: 100,
    vesselH: 88,
    baseX: 120,
    baseY: 280,
    hint: 'Haz clic sobre el gotero para agregar gotas',
  },
];

// Seed-based pseudo-random for deterministic particles
function seededRand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default function RefluxBench({
  width = 500,
  height = 480,
  flaskState = {},
  isAnimating = false,
  currentAction = '',
  currentStepIndex = 0,
  completed = false,
  onExecuteStep,
  isDropStep = false,
  isDropping = false,
  onAddDrop,
  dropColor = '#E91E8C',
  refluxProgress = 0,
}) {
  const {
    fillLevel = 0,
    containerColor = '#DCE8F5',
    condenserOn = false,
  } = flaskState;

  // ── Master animation clock (RAF-driven) ──────────────────────────────────
  const [animTime, setAnimTime] = useState(0);
  const masterRaf = useRef(null);

  const isRefluxing = currentAction === 'reflux' && isAnimating;
  const isInstallingCondenser = currentAction === 'attach_condenser' && isAnimating;
  const needsAnimation = isRefluxing || isInstallingCondenser;

  useEffect(() => {
    if (!needsAnimation) {
      if (masterRaf.current) cancelAnimationFrame(masterRaf.current);
      masterRaf.current = null;
      return;
    }
    let running = true;
    const tick = (ts) => {
      if (!running) return;
      setAnimTime(ts * 0.001);
      masterRaf.current = requestAnimationFrame(tick);
    };
    masterRaf.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (masterRaf.current) cancelAnimationFrame(masterRaf.current);
    };
  }, [needsAnimation]);

  // ── Condenser installation animation (0→1 over 1000ms) ──────────────────
  const [condenserInstallProgress, setCondenserInstallProgress] = useState(0);
  const condenserInstallRaf = useRef(null);

  useEffect(() => {
    if (!isInstallingCondenser) {
      if (condenserInstallRaf.current) cancelAnimationFrame(condenserInstallRaf.current);
      condenserInstallRaf.current = null;
      return;
    }
    let startTime = null;
    let running = true;
    const animate = (ts) => {
      if (!running) return;
      if (!startTime) startTime = ts;
      const p = Math.min(1, (ts - startTime) / 1000);
      setCondenserInstallProgress(p);
      if (p < 1) {
        condenserInstallRaf.current = requestAnimationFrame(animate);
      } else {
        condenserInstallRaf.current = null;
      }
    };
    condenserInstallRaf.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (condenserInstallRaf.current) cancelAnimationFrame(condenserInstallRaf.current);
    };
  }, [isInstallingCondenser]);

  // Layout
  const benchY = height - 24;
  const flaskX = width / 2;
  const flaskY = height * 0.52;
  const flaskCY = flaskY + 80;

  // Condenser geometry
  const condenserX = flaskX;
  const condenserTopY = flaskY - 195;
  const condenserBottomY = flaskY - 50;
  const condenserH = condenserBottomY - condenserTopY;

  // Show condenser: either permanently on, or during installation animation
  const showCondenser = condenserOn || isInstallingCondenser;
  const installEase = easeInOut(condenserInstallProgress);

  // During installation: condenser slides down from above
  const condenserOffsetY = isInstallingCondenser
    ? -120 * (1 - installEase)
    : 0;
  const condenserAlpha = isInstallingCondenser
    ? Math.min(1, condenserInstallProgress * 2)
    : (condenserOn ? 1 : 0);

  // Water line connection appears in second half of installation
  const waterLineAlpha = isInstallingCondenser
    ? Math.max(0, (condenserInstallProgress - 0.5) * 2)
    : (condenserOn ? 1 : 0);

  // ── Reflux animation parameters ─────────────────────────────────────────
  const t = animTime;

  // Bubbles: 6 persistent bubbles at staggered phases
  const NUM_BUBBLES = 6;
  const bubbles = Array.from({ length: NUM_BUBBLES }, (_, i) => {
    const speed = 0.8 + seededRand(i * 3) * 0.6;
    const phase = ((t * speed + i / NUM_BUBBLES) % 1);
    const xOff = (seededRand(i * 7 + 1) - 0.5) * 40;
    const baseY = flaskY + 120;
    const riseH = 80;
    return {
      x: flaskX + xOff,
      y: baseY - phase * riseH,
      r: 2.5 + seededRand(i * 5) * 2.5,
      opacity: isRefluxing ? 0.4 * refluxIntensity * Math.sin(phase * Math.PI) : 0,
    };
  });

  // Vapor wisps: 5 wisps rising from flask mouth into condenser
  const NUM_VAPORS = 5;
  const vapors = Array.from({ length: NUM_VAPORS }, (_, i) => {
    const speed = 0.5 + seededRand(i * 11) * 0.4;
    const phase = ((t * speed + i / NUM_VAPORS) % 1);
    const xWobble = Math.sin(t * 2.5 + i * 1.3) * 4;
    const startY = flaskY + 5;
    const endY = condenserBottomY + condenserOffsetY + 10;
    return {
      x: flaskX + xWobble,
      y: startY + (endY - startY) * phase,
      r: 3 + phase * 2,
      opacity: isRefluxing ? 0.2 * (1 - phase) : 0,
    };
  });

  // Condensate drops: drip back from condenser bottom into flask
  const NUM_CONDENSATE = 3;
  const condensate = Array.from({ length: NUM_CONDENSATE }, (_, i) => {
    const speed = 0.7 + seededRand(i * 17) * 0.3;
    const phase = ((t * speed + i / NUM_CONDENSATE) % 1);
    const startY = condenserBottomY + condenserOffsetY + 5;
    const endY = flaskY + 8;
    const xOff = (seededRand(i * 23) - 0.5) * 6;
    return {
      x: flaskX + xOff,
      y: startY + (endY - startY) * phase,
      opacity: isRefluxing ? 0.5 * Math.sin(phase * Math.PI) : 0,
    };
  });

  // Water flow particles inside condenser jacket
  const NUM_WATER_PARTICLES = 8;
  const waterParticles = Array.from({ length: NUM_WATER_PARTICLES }, (_, i) => {
    const speed = 0.6 + seededRand(i * 31) * 0.4;
    // Water flows downward (inlet at top, outlet at bottom)
    const phase = ((t * speed + i / NUM_WATER_PARTICLES) % 1);
    const side = i % 2 === 0 ? -1 : 1;
    const xOff = side * (8 + seededRand(i * 37) * 3);
    const topY = condenserTopY + condenserOffsetY + 8;
    const botY = condenserBottomY + condenserOffsetY - 8;
    return {
      x: condenserX + xOff,
      y: topY + (botY - topY) * phase,
      opacity: (isRefluxing || condenserOn) ? 0.35 * (1 - Math.abs(phase - 0.5) * 2) : 0,
    };
  });

  // Bunsen burner flame
  const flameFlicker = isRefluxing ? Math.sin(t * 8) * 0.08 + Math.sin(t * 13) * 0.04 : 0;
  const burnerBaseY = flaskY + 148;
  const burnerX = flaskX;

  // Liquid surface wobble during reflux — intensity grows with refluxProgress
  const refluxIntensity = isRefluxing ? 0.5 + refluxProgress * 0.5 : 0;
  const liquidWobble = isRefluxing ? Math.sin(t * 3) * 0.008 * refluxIntensity : 0;

  // Status label
  let statusText = '';
  if (isRefluxing) statusText = 'Reflujo en curso...';
  else if (currentAction === 'cool' && isAnimating) statusText = 'Enfriando...';
  else if (isInstallingCondenser) statusText = 'Instalando condensador...';
  else if (currentAction === 'add_indicator' && isAnimating) statusText = 'Añadiendo indicador...';
  else if (currentAction === 'weigh_and_transfer' && isAnimating) statusText = 'Transfiriendo...';
  else if (currentAction === 'add_reagent' && isAnimating) statusText = 'Agregando KOH...';

  // ── Step config ──────────────────────────────────────────────────────────
  const stepCfg = STEP_CONFIGS[Math.min(currentStepIndex, STEP_CONFIGS.length - 1)] || STEP_CONFIGS[2];

  // ── Pour animation ───────────────────────────────────────────────────────
  const [pourAnimProgress, setPourAnimProgress] = useState(0);
  const pourRafRef = useRef(null);

  const isPourAction =
    currentAction === 'weigh_and_transfer' ||
    currentAction === 'add_reagent';

  useEffect(() => {
    if (!(isAnimating && isPourAction)) {
      setPourAnimProgress(0);
      if (pourRafRef.current) cancelAnimationFrame(pourRafRef.current);
      pourRafRef.current = null;
      return;
    }

    const duration = 2500;
    let startTime = null;
    let running = true;

    const frame = (ts) => {
      if (!running) return;
      if (!startTime) startTime = ts;
      const raw = Math.min(1, (ts - startTime) / duration);
      setPourAnimProgress(raw);
      if (raw < 1) {
        pourRafRef.current = requestAnimationFrame(frame);
      } else {
        pourRafRef.current = null;
      }
    };

    if (pourRafRef.current) cancelAnimationFrame(pourRafRef.current);
    pourRafRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (pourRafRef.current) cancelAnimationFrame(pourRafRef.current);
    };
  }, [isAnimating, isPourAction]);

  // ── Drag proximity state ──────────────────────────────────────────────────
  const [nearTarget, setNearTarget] = useState(false);

  const isDragStep = !completed && !isAnimating && !isDropStep &&
    stepCfg.vesselType !== 'none' && stepCfg.vesselType !== 'dropper';

  const vesselCX = stepCfg.baseX;
  const vesselCY = stepCfg.baseY - stepCfg.vesselH * 0.5;

  const checkProximity = useCallback((groupPos) => {
    const ax = vesselCX + groupPos.x;
    const ay = vesselCY + groupPos.y;
    return Math.hypot(ax - flaskX, ay - flaskCY) < SNAP_DISTANCE;
  }, [vesselCX, vesselCY, flaskX, flaskCY]);

  const dragHandlers = isDragStep ? {
    draggable: true,
    onDragMove: (e) => {
      setNearTarget(checkProximity(e.target.position()));
    },
    onDragEnd: (e) => {
      const near = checkProximity(e.target.position());
      e.target.position({ x: 0, y: 0 });
      e.target.getLayer()?.batchDraw();
      setNearTarget(false);
      if (near && onExecuteStep) setTimeout(onExecuteStep, 0);
    },
    onMouseEnter: (e) => setCursor(e, 'grab'),
    onMouseLeave: (e) => setCursor(e, 'default'),
    onDragStart: (e) => setCursor(e, 'grabbing'),
  } : {};

  // Click handlers for drop mode (add_indicator step)
  const dropClickHandlers = (isDropStep && !completed && !isDropping) ? {
    onClick: () => {
      if (onAddDrop) setTimeout(onAddDrop, 0);
    },
    onMouseEnter: (e) => setCursor(e, 'pointer'),
    onMouseLeave: (e) => setCursor(e, 'default'),
  } : {};

  // ── Compute vessel position / rotation from pour animation ───────────────
  let vesselX = stepCfg.baseX;
  let vesselY = stepCfg.baseY;
  let vesselRotation = 0;
  let liquidAlpha = 0.62;

  if (isAnimating && isPourAction) {
    const p = pourAnimProgress;
    const slideIn   = easeInOut(sub(p, 0.00, 0.18));
    const tiltUp    = easeInOut(sub(p, 0.18, 0.32));
    const tiltDown  = easeInOut(sub(p, 0.72, 0.84));
    const slideBack = easeInOut(sub(p, 0.84, 1.00));

    const moveFrac = slideIn * (1 - slideBack);
    const tiltFrac = tiltUp * (1 - tiltDown);

    const maxTiltRad = stepCfg.tiltAngle * Math.PI / 180;
    const spoutGoalX = flaskX - 25;
    const targetX = spoutGoalX - stepCfg.vesselH * Math.sin(maxTiltRad);
    const targetY = stepCfg.baseY - 8;

    vesselX = stepCfg.baseX + (targetX - stepCfg.baseX) * moveFrac;
    vesselY = stepCfg.baseY + (targetY - stepCfg.baseY) * moveFrac;
    vesselRotation = stepCfg.tiltAngle * tiltFrac;
    liquidAlpha = Math.max(0.18, 0.62 - tiltFrac * 0.38);
  }

  // Spout position after tilt (for PourAnimation)
  const tiltRad = vesselRotation * Math.PI / 180;
  const spoutX = vesselX + stepCfg.vesselH * Math.sin(tiltRad);
  const spoutY = vesselY - stepCfg.vesselH * Math.cos(tiltRad);

  const isPouringStream = isPourAction && isAnimating &&
    pourAnimProgress > 0.34 && pourAnimProgress < 0.70;

  // Whether a vessel should be visible
  const showVessel = stepCfg.vesselType !== 'none';
  const hint = stepCfg.hint || '';

  // Effective fill level with wobble during reflux
  const effectiveFill = fillLevel + liquidWobble;

  return (
    <Stage width={width} height={height}>
      <Layer>

        {/* Bench surface */}
        <Rect x={0} y={benchY} width={width} height={24} fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]} />

        {/* ════════════════════════════════════════════════════════════════
            Bunsen Burner (always rendered, opacity-toggled)
        ════════════════════════════════════════════════════════════════ */}
        <Group opacity={isRefluxing || (currentAction === 'reflux') ? 1 : 0}>
          {/* Burner base */}
          <Rect
            x={burnerX - 22} y={burnerBaseY}
            width={44} height={8}
            fill="#606060" stroke="#404040" strokeWidth={1}
            cornerRadius={2}
          />
          {/* Burner tube */}
          <Rect
            x={burnerX - 6} y={burnerBaseY - 55}
            width={12} height={55}
            fill="#707070" stroke="#505050" strokeWidth={1}
          />
          {/* Air intake holes */}
          <Circle x={burnerX - 3} y={burnerBaseY - 18} radius={2} fill="#404040" opacity={0.6} />
          <Circle x={burnerX + 3} y={burnerBaseY - 18} radius={2} fill="#404040" opacity={0.6} />
          {/* Gas inlet tube (side) */}
          <Rect
            x={burnerX + 6} y={burnerBaseY - 10}
            width={22} height={5}
            fill="#707070" stroke="#505050" strokeWidth={0.8}
            cornerRadius={1}
          />

          {/* ── Flame ─────────────────────────────────────────────────── */}
          {/* Outer flame (blue/orange edges) */}
          <Line
            points={[
              burnerX, burnerBaseY - 55 - 50 - flameFlicker * 120,
              burnerX - 14 - flameFlicker * 20, burnerBaseY - 55 - 8,
              burnerX + 14 + flameFlicker * 20, burnerBaseY - 55 - 8,
            ]}
            closed fill="#3B82F6"
            opacity={isRefluxing ? 0.35 + flameFlicker * 0.5 : 0}
          />
          {/* Inner flame (hot blue) */}
          <Line
            points={[
              burnerX, burnerBaseY - 55 - 38 - flameFlicker * 80,
              burnerX - 7 - flameFlicker * 10, burnerBaseY - 55 - 6,
              burnerX + 7 + flameFlicker * 10, burnerBaseY - 55 - 6,
            ]}
            closed fill="#60A5FA"
            opacity={isRefluxing ? 0.55 + flameFlicker * 0.3 : 0}
          />
          {/* Inner cone (lightest) */}
          <Line
            points={[
              burnerX, burnerBaseY - 55 - 22 - flameFlicker * 40,
              burnerX - 3, burnerBaseY - 55 - 4,
              burnerX + 3, burnerBaseY - 55 - 4,
            ]}
            closed fill="#93C5FD"
            opacity={isRefluxing ? 0.65 : 0}
          />
        </Group>

        {/* ── Bubbles inside liquid during reflux ───────────────────────── */}
        {bubbles.map((b, i) => (
          <Circle
            key={`bubble-${i}`}
            x={b.x} y={b.y} radius={b.r}
            stroke={containerColor === '#DCE8F5' ? '#B0C4DE' : containerColor}
            strokeWidth={0.8}
            fill="rgba(255,255,255,0.15)"
            opacity={b.opacity}
          />
        ))}

        {/* ── Flask ─────────────────────────────────────────────────────── */}
        <Erlenmeyer
          x={flaskX}
          y={flaskY}
          liquidColor={containerColor}
          fillLevel={effectiveFill}
        />

        {/* ── Vapor wisps from flask mouth into condenser ──────────────── */}
        {vapors.map((v, i) => (
          <Circle
            key={`vapor-${i}`}
            x={v.x} y={v.y} radius={v.r}
            fill="white"
            opacity={v.opacity}
          />
        ))}

        {/* ════════════════════════════════════════════════════════════════
            Condenser (Allihn-style)
            — Detailed: outer jacket, inner tube with bulb shapes,
              rubber stoppers, water flow, clamp.
            — Always rendered, opacity-toggled.
        ════════════════════════════════════════════════════════════════ */}
        <Group
          y={condenserOffsetY}
          opacity={showCondenser ? condenserAlpha : 0}
        >
          {/* Outer glass jacket */}
          <Rect
            x={condenserX - 16}
            y={condenserTopY}
            width={32}
            height={condenserH}
            fill="#D6EAF8"
            stroke="#7BA8C8"
            strokeWidth={1.5}
            cornerRadius={6}
            opacity={0.75}
          />

          {/* Inner tube */}
          <Rect
            x={condenserX - 5}
            y={condenserTopY + 6}
            width={10}
            height={condenserH - 12}
            fill="#EBF5FB"
            stroke="#A9CCE3"
            strokeWidth={1}
            cornerRadius={3}
            opacity={0.9}
          />

          {/* Allihn bulb shapes (3 bulges in the inner tube) */}
          <Circle x={condenserX} y={condenserTopY + condenserH * 0.25} radius={9}
            fill="#E0F0FA" stroke="#A9CCE3" strokeWidth={0.8} opacity={0.7} />
          <Circle x={condenserX} y={condenserTopY + condenserH * 0.50} radius={9}
            fill="#E0F0FA" stroke="#A9CCE3" strokeWidth={0.8} opacity={0.7} />
          <Circle x={condenserX} y={condenserTopY + condenserH * 0.75} radius={9}
            fill="#E0F0FA" stroke="#A9CCE3" strokeWidth={0.8} opacity={0.7} />

          {/* Glass highlight (reflection stripe) */}
          <Rect
            x={condenserX - 14}
            y={condenserTopY + 6}
            width={3}
            height={condenserH - 12}
            fill="white"
            opacity={0.2}
            cornerRadius={1}
          />

          {/* Rubber stopper at bottom (connects to flask neck) */}
          <Rect
            x={condenserX - 10}
            y={condenserBottomY - 2}
            width={20}
            height={10}
            fill="#2D2D2D"
            cornerRadius={2}
            opacity={0.8}
          />

          {/* Rubber stopper at top */}
          <Rect
            x={condenserX - 10}
            y={condenserTopY - 6}
            width={20}
            height={10}
            fill="#2D2D2D"
            cornerRadius={2}
            opacity={0.8}
          />

          {/* ── Lab clamp (holds condenser to stand) ───────────────────── */}
          {/* Clamp ring */}
          <Circle
            x={condenserX + 22}
            y={condenserTopY + condenserH * 0.35}
            radius={6}
            fill="#A0A0A0"
            stroke="#707070"
            strokeWidth={1.2}
          />
          {/* Clamp arm to right */}
          <Rect
            x={condenserX + 28}
            y={condenserTopY + condenserH * 0.35 - 3}
            width={30}
            height={6}
            fill="#909090"
            stroke="#707070"
            strokeWidth={0.8}
            cornerRadius={1}
          />
          {/* Stand rod (vertical) */}
          <Rect
            x={condenserX + 56}
            y={condenserTopY - 20}
            width={5}
            height={condenserH + 80}
            fill="#808080"
            stroke="#606060"
            strokeWidth={0.8}
            cornerRadius={1}
          />
          {/* Stand base */}
          <Rect
            x={condenserX + 40}
            y={benchY - 4}
            width={36}
            height={4}
            fill="#707070"
            cornerRadius={1}
          />

          {/* ── Water inlet / outlet with rubber tubes ─────────────────── */}
          {/* Inlet tube (top-left, water enters) */}
          <Line
            points={[
              condenserX - 16, condenserTopY + 25,
              condenserX - 35, condenserTopY + 25,
              condenserX - 35, condenserTopY + 5,
            ]}
            stroke="#5DADE2"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            opacity={waterLineAlpha * 0.85}
          />
          {/* Outlet tube (bottom-right, water exits) */}
          <Line
            points={[
              condenserX + 16, condenserBottomY - 25,
              condenserX + 35, condenserBottomY - 25,
              condenserX + 35, condenserBottomY - 5,
            ]}
            stroke="#5DADE2"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            opacity={waterLineAlpha * 0.85}
          />

          {/* Inlet label */}
          <Text
            x={condenserX - 62} y={condenserTopY + 2}
            text="H₂O ↓"
            fontSize={8} fill="#2E86C1"
            fontFamily="IBM Plex Mono"
            opacity={waterLineAlpha * 0.8}
          />
          {/* Outlet label */}
          <Text
            x={condenserX + 28} y={condenserBottomY - 8}
            text="H₂O ↑"
            fontSize={8} fill="#2E86C1"
            fontFamily="IBM Plex Mono"
            opacity={waterLineAlpha * 0.8}
          />

          {/* Water flow particles inside jacket */}
          {waterParticles.map((wp, i) => (
            <Circle
              key={`water-${i}`}
              x={wp.x} y={wp.y + condenserOffsetY * -1}
              radius={1.8}
              fill="#5DADE2"
              opacity={wp.opacity}
            />
          ))}

          {/* Condenser label */}
          <Text
            x={condenserX - 75}
            y={condenserTopY + condenserH * 0.5 - 5}
            text="Condensador\nde Allihn"
            fontSize={8.5} fill="#5D6D7E"
            fontFamily="IBM Plex Sans"
            opacity={0.7}
            lineHeight={1.3}
          />
        </Group>

        {/* ── Condensate drops (drip from condenser back into flask) ────── */}
        {condensate.map((c, i) => (
          <Circle
            key={`condensate-${i}`}
            x={c.x} y={c.y}
            radius={2}
            fill="#B0C4DE"
            opacity={c.opacity}
            scaleY={1.4}
          />
        ))}

        {/* ── Blue glow ring on flask while vessel is dragged near it ───── */}
        <Circle
          x={flaskX}
          y={flaskCY}
          radius={85}
          fill="#3B82F6"
          opacity={nearTarget ? 0.12 : 0}
          listening={false}
        />

        {/* ════════════════════════════════════════════════════════════════
            Draggable / clickable vessel wrapper.
            All vessel sub-Groups always rendered, opacity-toggled.
        ════════════════════════════════════════════════════════════════ */}
        <Group
          x={0}
          y={0}
          opacity={completed || !showVessel ? 0 : 1}
          listening={!completed && showVessel}
          {...dragHandlers}
          {...dropClickHandlers}
        >
          {/* Inner group: animated position + rotation */}
          <Group
            x={vesselX}
            y={vesselY}
            rotation={vesselRotation}
          >

            {/* ─── Step 0: Fat sample dish (draggable) ─────────────────── */}
            <Group
              opacity={currentStepIndex === 0 ? 1 : 0}
              listening={currentStepIndex === 0}
            >
              {/* Weighing dish / watch glass — shallow oval */}
              <Line
                points={[-24, 0, -20, -12, 0, -16, 20, -12, 24, 0]}
                closed fill="#F0F0F0" stroke="#A0A8B0" strokeWidth={1.2}
              />
              {/* Fat sample (yellowish blob inside dish) */}
              <Line
                points={[-14, -2, -10, -12, 0, -14, 10, -12, 14, -2]}
                closed fill="#F5E6A0" opacity={liquidAlpha + 0.2}
              />
              {/* Fat surface highlight */}
              <Line
                points={[-6, -8, 0, -12, 6, -8]}
                stroke="#FFFDE0" strokeWidth={1.5} opacity={0.5}
                lineCap="round"
              />
              {/* Label */}
              <Text x={-20} y={6} text="Grasa" fontSize={8}
                fill="#78350F" fontFamily="IBM Plex Mono" width={40} align="center" />
              {/* Hit area */}
              <Rect x={-28} y={-20} width={56} height={35}
                fill="rgba(0,0,0,0.001)" />
            </Group>

            {/* ─── Step 1: KOH reagent bottle (draggable) ──────────────── */}
            <Group
              opacity={currentStepIndex === 1 ? 1 : 0}
              listening={currentStepIndex === 1}
            >
              {/* Body */}
              <Rect x={-14} y={-88} width={28} height={58}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
                cornerRadius={[2, 2, 4, 4]} />
              {/* Liquid (colorless KOH) */}
              <Rect x={-12} y={-63} width={24} height={34}
                fill="#F4F8F4" opacity={liquidAlpha}
                cornerRadius={[0, 0, 3, 3]} />
              {/* Glass highlight */}
              <Rect x={-11} y={-86} width={2.5} height={54}
                fill="white" opacity={0.22} cornerRadius={1} />
              {/* Label stripe */}
              <Rect x={-12} y={-78} width={24} height={16}
                fill="#E0F2FE" opacity={0.8} />
              <Text x={-11} y={-76} text="KOH" fontSize={8}
                fill="#1D4ED8" fontFamily="IBM Plex Mono" width={22} align="center" />
              {/* Neck */}
              <Rect x={-5} y={-32} width={10} height={21}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1} />
              {/* Metal cap */}
              <Rect x={-7} y={-33} width={14} height={8}
                fill="#A0A8B0" stroke="#808890" strokeWidth={1}
                cornerRadius={2} />
              {/* Hit area */}
              <Rect x={-18} y={-95} width={36} height={95}
                fill="rgba(0,0,0,0.001)" />
            </Group>

            {/* ─── Step 5: Phenolphthalein dropper (clickable) ─────────── */}
            <Group
              opacity={currentStepIndex === 5 ? 1 : 0}
              listening={currentStepIndex === 5}
            >
              {/* Dropper bottle body */}
              <Rect x={-11} y={-88} width={22} height={54}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
                cornerRadius={[2, 2, 4, 4]} />
              {/* Pink liquid — phenolphthalein */}
              <Rect x={-9} y={-62} width={18} height={28}
                fill="#E91E8C" opacity={liquidAlpha + 0.1}
                cornerRadius={[0, 0, 3, 3]} />
              {/* Glass highlight */}
              <Rect x={-9} y={-85} width={2} height={50}
                fill="white" opacity={0.22} cornerRadius={1} />
              {/* Label */}
              <Rect x={-9} y={-75} width={18} height={14}
                fill="#FCE4EC" opacity={0.85} />
              <Text x={-9} y={-73} text="PhPh" fontSize={6.5}
                fill="#880E4F" fontFamily="IBM Plex Mono" width={18} align="center" />
              {/* Neck */}
              <Rect x={-4} y={-36} width={8} height={22}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1} />
              {/* Rubber dropper bulb (red) */}
              <Rect x={-5.5} y={-37} width={11} height={11}
                fill="#E05050" stroke="#C03030" strokeWidth={1}
                cornerRadius={5} />
              {/* Fine dropper tip */}
              <Rect x={-1.5} y={-14} width={3} height={14}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={0.8} />
              {/* Hit area */}
              <Rect x={-14} y={-95} width={28} height={95}
                fill="rgba(0,0,0,0.001)" />
            </Group>

          </Group>
        </Group>

        {/* ── Pour animation: spout → flask mouth ───────────────────────── */}
        <PourAnimation
          fromX={spoutX}
          fromY={spoutY}
          toX={flaskX}
          toY={flaskY + 6}
          isPouring={isPouringStream}
          color={stepCfg.pourColor || '#C0D0DA'}
        />

        {/* ── Drop animation: dropper tip → flask mouth (drop mode) ────── */}
        <DropAnimation
          x={flaskX}
          startY={stepCfg.baseY}
          endY={flaskY + 6}
          isDropping={isDropStep && isDropping}
          color={dropColor}
        />

        {/* ── Status text ───────────────────────────────────────────────── */}
        <Text
          x={width / 2 - 120} y={14}
          text={statusText}
          fontSize={11}
          fill={isAnimating ? '#F59E0B' : '#64748B'}
          fontFamily="IBM Plex Sans"
          fontStyle="bold"
          width={240} align="center"
          opacity={statusText ? 1 : 0}
        />

        {/* ── Step number ────────────────────────────────────────────────── */}
        <Text
          x={12}
          y={14}
          text={`Paso ${currentStepIndex + 1}`}
          fontSize={13}
          fill="#2563EB"
          fontFamily="IBM Plex Sans"
          fontStyle="bold"
          opacity={completed ? 0 : (showVessel ? 1 : 0)}
        />

        {/* ── Vessel label ───────────────────────────────────────────────── */}
        <Text
          x={12}
          y={33}
          text={stepCfg.label || ''}
          fontSize={10.5}
          fill="#475569"
          fontFamily="IBM Plex Sans"
          width={210}
          opacity={completed ? 0 : (showVessel ? 1 : 0)}
        />

        {/* ── Drag / click hint ──────────────────────────────────────────── */}
        <Text
          x={12}
          y={54}
          text={isDropStep ? 'Haz clic sobre el gotero para agregar gotas →' : hint}
          fontSize={10.5}
          fill="#3B82F6"
          fontFamily="IBM Plex Sans"
          width={220}
          opacity={!isAnimating && !isDropping && !completed && showVessel && (!!hint || isDropStep) ? 0.85 : 0}
        />

        {/* ── Flask label ───────────────────────────────────────────────── */}
        <Text
          x={flaskX - 70} y={benchY - 20}
          text={flaskState.label || 'Matraz de saponificación'}
          fontSize={9.5} fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={140} align="center"
        />

        {/* ── "Listo para titular" indicator ──────────────────────────── */}
        <Text
          x={flaskX - 70}
          y={flaskY - 55}
          text="Listo para titular"
          fontSize={12}
          fill="#16A34A"
          fontFamily="IBM Plex Sans"
          fontStyle="bold"
          width={140}
          align="center"
          opacity={completed ? 1 : 0}
        />

      </Layer>
    </Stage>
  );
}
