import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Line, Circle, Text } from 'react-konva';
import Erlenmeyer from './Erlenmeyer';
import PrecipitateEffect from './PrecipitateEffect';
import FoilCover from './FoilCover';
import PourAnimation from './PourAnimation';
import DropAnimation from './DropAnimation';
import GraduatedCylinder from './GraduatedCylinder';

/**
 * Canvas for sequential assembly (P4 Volhard and similar).
 *
 * Each step shows the appropriate vessel on the left. For pour-type steps
 * the vessel is DRAGGABLE: drop it onto the Erlenmeyer to execute the step.
 * For the indicator step the dropper bottle is CLICKABLE. The cover step
 * has no vessel and is handled by a button in the parent panel.
 *
 * A snap-back animation returns the vessel to its rest position after a
 * successful or unsuccessful drop. A blue glow ring on the Erlenmeyer
 * provides visual feedback while the vessel is dragged near it.
 *
 * react-konva rules enforced:
 *   - NEVER conditional rendering inside Layer — use opacity toggle.
 *   - All 7 vessel sub-Groups always rendered; only the active one is visible.
 *   - setCursor wraps getStage() in try-catch (can return null during reconciliation).
 *   - onExecuteStep is deferred with setTimeout(fn, 0) to avoid setState
 *     inside a Konva event handler.
 */

const SNAP_DISTANCE = 110; // px — vessel center must be this close to flask center

function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch { /* ignore */ }
}

// ─── Per-practice step configurations ─────────────────────────────────────────
// Each practice defines its own vessel visuals, hints, and layout for assembly.
const STEP_CONFIGS_BY_PRACTICE = {
  3: [
    {
      label: 'K₂CrO₄ — 3-4 gotas',
      vesselType: 'dropper',
      pourColor: '#FFD700',
      tiltAngle: 62,
      vesselH: 88,
      baseX: 310,
      baseY: 185,
      hint: 'Haz clic sobre el gotero para agregar gotas',
    },
  ],
  4: [
    {
      label: 'Agua destilada — 10 mL',
      vesselType: 'cylinder',
      pourColor: '#C8E4F4',
      tiltAngle: 40,
      vesselH: 200,
      baseX: 128,
      baseY: 350,
      hint: 'Arrastra la probeta al matraz →',
    },
    {
      label: 'HNO₃ 1:1 — 1 mL',
      vesselType: 'bottle_sm',
      pourColor: '#F4F6EC',
      tiltAngle: 62,
      vesselH: 88,
      baseX: 150,
      baseY: 252,
      hint: 'Arrastra el frasco de HNO₃ al matraz →',
    },
    {
      label: 'AgNO₃ 0.10 M — 50 mL',
      vesselType: 'beaker',
      pourColor: '#F0F0F0',
      tiltAngle: 52,
      vesselH: 110,
      baseX: 128,
      baseY: 278,
      hint: 'Arrastra el vaso de AgNO₃ al matraz →',
    },
    {
      label: 'Papel aluminio',
      vesselType: 'foil',
      pourColor: null,
      tiltAngle: 0,
      vesselH: 60,
      baseX: 150,
      baseY: 280,
      hint: 'Arrastra el papel aluminio al matraz →',
    },
    {
      label: 'Nitrobenceno — 1 mL',
      vesselType: 'bottle_sm',
      pourColor: '#F8F8C0',
      tiltAngle: 62,
      vesselH: 88,
      baseX: 150,
      baseY: 252,
      hint: 'Arrastra el frasco de nitrobenceno al matraz →',
    },
    {
      label: 'Alumbre férrico — 1 mL',
      vesselType: 'dropper',
      pourColor: '#C07808',
      tiltAngle: 62,
      vesselH: 88,
      baseX: 310,
      baseY: 185,
      hint: 'Haz clic sobre el gotero para agregar gotas',
    },
  ],
};

// Fallback config for unknown practices
const FALLBACK_STEP = {
  label: 'Reactivo',
  vesselType: 'bottle_sm',
  pourColor: '#C0D0DA',
  tiltAngle: 62,
  vesselH: 88,
  baseX: 150,
  baseY: 252,
  hint: 'Arrastra el reactivo al matraz →',
};

function easeOutQuad(t) { return t * (2 - t); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
/** Map a global progress value into a sub-range, returning 0–1 within that range. */
function sub(p, start, end) { return Math.max(0, Math.min(1, (p - start) / (end - start))); }

export default function SequentialAssemblyBench({
  width = 500,
  height = 480,
  flaskState = {},
  isAnimating = false,
  currentStepIndex = 0,
  currentAction = '',
  completed = false,
  onExecuteStep,       // callback — called when vessel reaches flask or dropper is clicked
  practiceId = 4,      // determines which step visual configs to use
  // Drop mode props (for add_indicator steps)
  isDropStep = false,
  isDropping = false,
  onAddDrop,           // callback — adds one drop
  dropColor = '#C07808',
}) {
  const benchY = height - 20;

  // Flask: neck mouth at (flaskX, flaskY); body bottom at flaskY + 160
  const flaskX = Math.round(width * 0.62);  // ≈ 310
  const flaskY = benchY - 160;              // flask sits on the bench
  const flaskCY = flaskY + 80;              // visual centre of flask body

  // ── Multi-phase pour animation (replaces simple tilt) ───────────────────────
  const [pourAnimProgress, setPourAnimProgress] = useState(0);
  const pourRafRef = useRef(null);

  // ── Foil descent animation ──────────────────────────────────────────────────
  const [foilDescend, setFoilDescend] = useState(0);
  const foilDescendRef = useRef(0);
  const foilRafRef = useRef(null);

  // ── Drag proximity state ────────────────────────────────────────────────────
  const [nearTarget, setNearTarget] = useState(false);

  const isPourAction =
    currentAction === 'add_reagent' ||
    currentAction === 'measure_and_transfer' ||
    currentAction === 'transfer' ||
    currentAction === 'add_indicator';

  const isCoverAction = currentAction === 'cover';

  // Multi-phase pour animation: slide → tilt → pour → un-tilt → slide back
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

  // Foil descent: ramps 0 → 1 over 600 ms during cover action
  useEffect(() => {
    const shouldDescend = isAnimating && isCoverAction;
    if (!shouldDescend) {
      if (foilRafRef.current) cancelAnimationFrame(foilRafRef.current);
      foilRafRef.current = null;
      foilDescendRef.current = 0;
      setFoilDescend(0);
      return;
    }

    foilDescendRef.current = 0;
    let lastTs = null;
    let running = true;

    const frame = (ts) => {
      if (!running) return;
      const dt = lastTs !== null ? Math.min(ts - lastTs, 50) : 0;
      lastTs = ts;
      const raw = Math.min(1, foilDescendRef.current + dt / 600);
      foilDescendRef.current = raw;
      setFoilDescend(easeOutQuad(raw));
      if (raw < 1) {
        foilRafRef.current = requestAnimationFrame(frame);
      } else {
        foilRafRef.current = null;
      }
    };

    if (foilRafRef.current) cancelAnimationFrame(foilRafRef.current);
    foilRafRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (foilRafRef.current) cancelAnimationFrame(foilRafRef.current);
    };
  }, [isAnimating, isCoverAction]);

  // ── Flask state ─────────────────────────────────────────────────────────────
  const fillLevel = flaskState.fillLevel || 0;
  const containerColor = flaskState.containerColor || '#DCE8F5';
  const label = flaskState.label || '';
  const precipitate = flaskState.precipitate;
  const foilCovered = flaskState.foilCovered || false;

  const precipitateLayers = precipitate
    ? [{ type: precipitate.type, color: precipitate.color, opacity: precipitate.opacity, density: 0.65 }]
    : [];

  // ── Step config (per-practice) ──────────────────────────────────────────────
  const practiceSteps = STEP_CONFIGS_BY_PRACTICE[practiceId] || [];
  const stepCfg = practiceSteps[Math.min(currentStepIndex, practiceSteps.length - 1)] || FALLBACK_STEP;

  // ── Compute vessel position / rotation from multi-phase pour animation ─────
  let vesselX = stepCfg.baseX;
  let vesselY = stepCfg.baseY;
  let vesselRotation = 0;
  let liquidAlpha = 0.62;

  if (isAnimating && isPourAction) {
    const p = pourAnimProgress;
    // Sub-phases (mirrors PipetteBench pattern):
    // 0.00–0.18  Slide vessel from rest to near flask
    // 0.18–0.32  Tilt to pour angle
    // 0.32–0.72  Pour stream visible — flask fills
    // 0.72–0.84  Un-tilt back to vertical
    // 0.84–1.00  Slide back to rest
    const slideIn   = easeInOut(sub(p, 0.00, 0.18));
    const tiltUp    = easeInOut(sub(p, 0.18, 0.32));
    const _pour     = sub(p, 0.32, 0.72);  // used implicitly via pourAnimProgress range checks
    const tiltDown  = easeInOut(sub(p, 0.72, 0.84));
    const slideBack = easeInOut(sub(p, 0.84, 1.00));

    const moveFrac = slideIn * (1 - slideBack);
    const tiltFrac = tiltUp * (1 - tiltDown);

    // Target: position so tilted spout ends up just above the flask mouth.
    // We compute targetX/targetY so that after rotating by tiltAngle,
    // the spout (at vesselH distance from the rotation center) lands
    // right above the flask opening.
    const maxTiltRad = stepCfg.tiltAngle * Math.PI / 180;
    const spoutGoalX = flaskX - 8;
    const spoutGoalY = flaskY - 15;
    const targetX = spoutGoalX - stepCfg.vesselH * Math.sin(maxTiltRad);
    const targetY = spoutGoalY + stepCfg.vesselH * Math.cos(maxTiltRad);

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

  // Foil wrap animation: fade-in at flask position (0 → 1 opacity over 600ms)
  const foilAnimOpacity = foilDescend;

  const bodyWidth = 140;
  const bodyHeight = 120;
  const neckHeight = 40;

  // ── Drag interaction ────────────────────────────────────────────────────────
  // All vessel types (pipette, cylinder, bottle, beaker, dropper, foil) are draggable
  // EXCEPT in drop mode: the dropper is clickable instead.
  const isDragStep = !completed && !isAnimating && !isDropStep &&
    stepCfg.vesselType !== 'none';

  // Vessel visual centre in canvas coords when wrapper is at (0,0)
  const vesselCX = stepCfg.baseX;
  const vesselCY = stepCfg.baseY - stepCfg.vesselH * 0.5;

  // Returns true if the dragged wrapper's offset puts the vessel near the flask
  const checkProximity = useCallback((groupPos) => {
    const ax = vesselCX + groupPos.x;
    const ay = vesselCY + groupPos.y;
    return Math.hypot(ax - flaskX, ay - flaskCY) < SNAP_DISTANCE;
  }, [vesselCX, vesselCY, flaskX, flaskCY]);

  // Drag handlers applied to the outer wrapper Group
  const dragHandlers = isDragStep ? {
    draggable: true,
    onDragMove: (e) => {
      setNearTarget(checkProximity(e.target.position()));
    },
    onDragEnd: (e) => {
      const near = checkProximity(e.target.position());
      // Always snap back to rest position
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

  const hint = stepCfg.hint || '';

  return (
    <Stage width={width} height={height}>
      <Layer>

        {/* ── Bench surface ─────────────────────────────────────────────── */}
        <Rect
          x={0} y={benchY} width={width} height={20}
          fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]}
        />

        {/* ── Flask (Erlenmeyer) ────────────────────────────────────────── */}
        <Erlenmeyer
          x={flaskX}
          y={flaskY}
          liquidColor={containerColor}
          fillLevel={fillLevel}
        />

        {/* ── Precipitate inside flask (always rendered, opacity-controlled) */}
        <PrecipitateEffect
          x={flaskX}
          y={flaskY + neckHeight}
          width={bodyWidth * 0.7}
          height={bodyHeight}
          layers={precipitateLayers}
          visible={precipitateLayers.length > 0}
        />

        {/* ── Permanent foil cover (after cover step completes) ──────────── */}
        <FoilCover
          x={flaskX}
          y={flaskY}
          neckWidth={30}
          visible={foilCovered}
        />

        {/* ── Foil wrap animation (during cover step only) ──────────────── */}
        <Group opacity={isAnimating && isCoverAction ? foilAnimOpacity : 0}>
          <FoilCover
            x={flaskX}
            y={flaskY}
            neckWidth={30}
            visible={true}
          />
        </Group>

        {/* ── Blue glow ring on Erlenmeyer while vessel is dragged near it ── */}
        {/* Always rendered, opacity-toggled */}
        <Circle
          x={flaskX}
          y={flaskCY}
          radius={85}
          fill="#3B82F6"
          opacity={nearTarget ? 0.12 : 0}
          listening={false}
        />

        {/* ════════════════════════════════════════════════════════════════
            Draggable vessel wrapper (Group at (0,0)).
            Drag handlers live here; the inner group handles rotation/position.
            The wrapper is invisible (no fill) so only the actual vessel
            primitives capture pointer events — empty canvas space does not.
            Hidden when all steps are completed.

            Per react-konva rules, ALL practice vessel blocks are ALWAYS
            rendered and toggled by opacity — never conditional rendering.
        ════════════════════════════════════════════════════════════════ */}
        <Group
          x={0}
          y={0}
          opacity={completed ? 0 : 1}
          {...dragHandlers}
          {...dropClickHandlers}
        >
          {/* Inner group: animated position + rotation */}
          <Group
            x={vesselX}
            y={vesselY}
            rotation={vesselRotation}
          >

            {/* ─── P3 Vessels (Argentometry — Mohr) ─────────────────────── */}
            {/* Single step: K₂CrO₄ dropper */}
            <Group opacity={practiceId === 3 ? 1 : 0} listening={practiceId === 3}>
              {/* Dropper bottle — K₂CrO₄ indicator (yellow) */}
              <Rect x={-11} y={-88} width={22} height={54}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
                cornerRadius={[2, 2, 4, 4]} />
              {/* Yellow liquid — K₂CrO₄ */}
              <Rect x={-9} y={-62} width={18} height={28}
                fill="#FFD700" opacity={liquidAlpha + 0.15}
                cornerRadius={[0, 0, 3, 3]} />
              {/* Glass highlight */}
              <Rect x={-9} y={-85} width={2} height={50}
                fill="white" opacity={0.22} cornerRadius={1} />
              {/* Label */}
              <Rect x={-9} y={-75} width={18} height={14}
                fill="#FEF08A" opacity={0.85} />
              <Text x={-9} y={-73} text="K₂CrO₄" fontSize={6}
                fill="#78350F" fontFamily="IBM Plex Mono" width={18} align="center" />
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
              {/* Transparent hit area */}
              <Rect x={-14} y={-95} width={28} height={95}
                fill="rgba(0,0,0,0.001)" />
            </Group>

            {/* ─── P4 Vessels (Volhard) ─────────────────────────────────── */}

            {/* ── P4 Step 0: Graduated cylinder — water 10 mL ────────── */}
            <Group opacity={practiceId === 4 && currentStepIndex === 0 ? 1 : 0} listening={practiceId === 4 && currentStepIndex === 0}>
              <GraduatedCylinder
                x={0} y={-200}
                capacity={10} currentVolume={10}
                tubeWidth={28} tubeHeight={190} baseWidth={42}
                showGraduations={true}
                isFlowing={false}
              />
            </Group>

            {/* ── P4 Step 1: Small reagent bottle — HNO₃ 1:1 ────────── */}
            <Group opacity={practiceId === 4 && currentStepIndex === 1 ? 1 : 0} listening={practiceId === 4 && currentStepIndex === 1}>
              {/* Body */}
              <Rect x={-14} y={-88} width={28} height={58}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
                cornerRadius={[2, 2, 4, 4]} />
              {/* Liquid (colorless acid) */}
              <Rect x={-12} y={-63} width={24} height={34}
                fill="#F4F6EC" opacity={liquidAlpha}
                cornerRadius={[0, 0, 3, 3]} />
              {/* Glass highlights */}
              <Rect x={-11} y={-86} width={2.5} height={54}
                fill="white" opacity={0.22} cornerRadius={1} />
              {/* Label stripe (red — corrosive reagent) */}
              <Rect x={-12} y={-76} width={24} height={15}
                fill="#FEE2E2" opacity={0.7} />
              <Text x={-11} y={-74} text="HNO₃" fontSize={7}
                fill="#DC2626" fontFamily="IBM Plex Mono" width={22} align="center" />
              {/* Neck */}
              <Rect x={-5} y={-32} width={10} height={21}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1} />
              {/* Metal cap */}
              <Rect x={-7} y={-33} width={14} height={8}
                fill="#A0A8B0" stroke="#808890" strokeWidth={1}
                cornerRadius={2} />
            </Group>

            {/* ── P4 Step 2: Beaker — AgNO₃ 0.10 M, 50 mL ──────────── */}
            <Group opacity={practiceId === 4 && currentStepIndex === 2 ? 1 : 0} listening={practiceId === 4 && currentStepIndex === 2}>
              {/* Beaker body — slight trapezoid shape */}
              <Line
                points={[-22, -110, 24, -110, 28, 0, -26, 0]}
                closed fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
              />
              {/* Liquid (colorless AgNO₃, ~70% full) */}
              <Line
                points={[-20, -74, 22, -74, 26, -2, -24, -2]}
                closed fill="#F0F0F0" opacity={liquidAlpha}
              />
              {/* Glass highlight */}
              <Rect x={-20} y={-106} width={3} height={98}
                fill="white" opacity={0.18} cornerRadius={1} />
              {/* Label on beaker */}
              <Rect x={-18} y={-95} width={38} height={16}
                fill="#EFF6FF" opacity={0.8} />
              <Text x={-18} y={-93} text="AgNO₃" fontSize={8}
                fill="#1D4ED8" fontFamily="IBM Plex Mono" width={38} align="center" />
              {/* Beaker rim */}
              <Line
                points={[-22, -110, 24, -110]}
                stroke="#8BA8B8" strokeWidth={2.5} lineCap="round"
              />
              {/* Pour lip notch */}
              <Line
                points={[-22, -110, -31, -120, -11, -110]}
                closed stroke="#8BA8B8" strokeWidth={1.5} fill="#D0D8E0"
              />
            </Group>

            {/* ── P4 Step 3: Aluminum foil sheet (DRAGGABLE) ─────────── */}
            <Group
              opacity={practiceId === 4 && currentStepIndex === 3 && !foilCovered && !(isAnimating && isCoverAction) ? 1 : 0}
              listening={practiceId === 4 && currentStepIndex === 3 && !foilCovered && !isAnimating}
            >
              {/* Foil sheet — crinkled silver rectangle */}
              <Rect x={-28} y={-55} width={56} height={50}
                fill="#C8C8C8" stroke="#A0A0A0" strokeWidth={1.2}
                cornerRadius={3} />
              {/* Foil crinkle highlights */}
              <Line
                points={[-22, -48, -16, -38, -8, -50, 0, -35, 8, -48, 16, -38, 22, -48]}
                stroke="#D8D8D8" strokeWidth={1} opacity={0.7}
              />
              <Line
                points={[-20, -28, -12, -20, -4, -30, 4, -18, 12, -28, 20, -20]}
                stroke="#B0B0B0" strokeWidth={0.8} opacity={0.5}
              />
              {/* Foil sheen */}
              <Rect x={-22} y={-52} width={14} height={42}
                fill="white" opacity={0.15} cornerRadius={1} />
              {/* Label */}
              <Text x={-26} y={-16} text="Al foil" fontSize={7.5}
                fill="#64748B" fontFamily="IBM Plex Mono" width={52} align="center" />
              {/* Hit area */}
              <Rect x={-32} y={-60} width={64} height={65}
                fill="rgba(0,0,0,0.001)" />
            </Group>

            {/* ── P4 Step 4: Small reagent bottle — nitrobenzene ─────── */}
            <Group opacity={practiceId === 4 && currentStepIndex === 4 ? 1 : 0} listening={practiceId === 4 && currentStepIndex === 4}>
              {/* Body */}
              <Rect x={-14} y={-88} width={28} height={58}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1.5}
                cornerRadius={[2, 2, 4, 4]} />
              {/* Liquid (slight yellow — nitrobenzene) */}
              <Rect x={-12} y={-63} width={24} height={34}
                fill="#F8F8C0" opacity={liquidAlpha + 0.05}
                cornerRadius={[0, 0, 3, 3]} />
              {/* Glass highlights */}
              <Rect x={-11} y={-86} width={2.5} height={54}
                fill="white" opacity={0.22} cornerRadius={1} />
              {/* Label stripe (yellow — organic reagent) */}
              <Rect x={-12} y={-76} width={24} height={15}
                fill="#FEF08A" opacity={0.75} />
              <Text x={-12} y={-74} text="NPhNO₂" fontSize={6.5}
                fill="#78350F" fontFamily="IBM Plex Mono" width={24} align="center" />
              {/* Neck */}
              <Rect x={-5} y={-32} width={10} height={21}
                fill="#E8F4FD" stroke="#8BA8B8" strokeWidth={1} />
              {/* Metal cap */}
              <Rect x={-7} y={-33} width={14} height={8}
                fill="#A0A8B0" stroke="#808890" strokeWidth={1}
                cornerRadius={2} />
            </Group>

            {/* ── P4 Step 5: Dropper bottle — alumbre férrico (DRAGGABLE) */}
            <Group
              opacity={practiceId === 4 && currentStepIndex === 5 ? 1 : 0}
              listening={practiceId === 4 && currentStepIndex === 5}
            >
              {/* Bottle body (amber/cream glass) */}
              <Rect x={-11} y={-88} width={22} height={54}
                fill="#FEF3C7" stroke="#8BA8B8" strokeWidth={1.5}
                cornerRadius={[2, 2, 4, 4]} />
              {/* Amber liquid — ferric alum solution */}
              <Rect x={-9} y={-62} width={18} height={28}
                fill="#D4900A" opacity={liquidAlpha + 0.1}
                cornerRadius={[0, 0, 3, 3]} />
              {/* Glass highlight */}
              <Rect x={-9} y={-85} width={2} height={50}
                fill="white" opacity={0.22} cornerRadius={1} />
              {/* Label */}
              <Rect x={-9} y={-75} width={18} height={14}
                fill="#FDE68A" opacity={0.85} />
              <Text x={-9} y={-74} text="Fe³⁺" fontSize={8}
                fill="#92400E" fontFamily="IBM Plex Mono" width={18} align="center" />
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
              {/* Transparent hit area — ensures clicks register anywhere on bottle */}
              <Rect x={-14} y={-95} width={28} height={95}
                fill="rgba(0,0,0,0.001)" />
            </Group>

          </Group>
        </Group>
        {/* ════════════════════════════════════════════════════════════════ */}

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

        {/* ── Flask content label (below flask) ─────────────────────────── */}
        <Text
          x={flaskX - 85}
          y={benchY - 30}
          text={label}
          fontSize={11}
          fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={170}
          align="center"
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
          opacity={completed ? 0 : 1}
        />

        {/* ── Reagent label for the current step ────────────────────────── */}
        <Text
          x={12}
          y={33}
          text={stepCfg.label || ''}
          fontSize={10.5}
          fill="#475569"
          fontFamily="IBM Plex Sans"
          width={210}
          opacity={completed ? 0 : 1}
        />

        {/* ── Drag / click hint text (always rendered, opacity-toggled) ──── */}
        <Text
          x={12}
          y={54}
          text={isDropStep ? 'Haz clic sobre el frasco para agregar gotas →' : hint}
          fontSize={10.5}
          fill="#3B82F6"
          fontFamily="IBM Plex Sans"
          width={220}
          opacity={!isAnimating && !isDropping && !completed && (!!hint || isDropStep) ? 0.85 : 0}
        />

        {/* ── "Cubriendo con aluminio..." — cover step animation hint ───── */}
        <Text
          x={flaskX - 85}
          y={flaskY - 55}
          text="Envolviendo con aluminio..."
          fontSize={10.5}
          fill="#F59E0B"
          fontFamily="IBM Plex Sans"
          width={170}
          align="center"
          opacity={isAnimating && isCoverAction ? 0.9 : 0}
        />

        {/* ── "Listo para titular" indicator (all steps done) ───────────── */}
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
