import { useState, useCallback, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle } from 'react-konva';
import GraduatedCylinder from './GraduatedCylinder';
import Erlenmeyer from './Erlenmeyer';
import PourAnimation from './PourAnimation';
import IndicatorBottle from './IndicatorBottle';
import DropAnimation from './DropAnimation';

const SNAP_DISTANCE = 130;

// Safe cursor helper — Konva nodes can lose stage reference during React reconciliation
function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch (_) { /* ignore */ }
}

export default function AssemblyBench({
  width = 500,
  height = 480,
  currentStep,
  isAnimating,
  erlenmeyerColor = '#F8F8FF',
  erlenmeyerFill = 0,
  cylinderVolume = 0,
  maxCylinderVolume = 250,
  bufferBeakerVolume = 0,
  dropColor = '#CD5C5C',
  // Interactive callbacks
  onPourWater,
  onPourBuffer,
  onAddDrop,
}) {
  const [nearTarget, setNearTarget] = useState(false);
  const [tiltProgress, setTiltProgress] = useState(0);
  const tiltRef = useRef(0);
  const tiltRafRef = useRef(null);

  // Tilt-in animation: runs when isAnimating on a pour step.
  // Ramps tiltProgress 0 → 1 in ~400 ms; resets instantly when animation ends.
  useEffect(() => {
    const shouldTilt = isAnimating && (currentStep === 2 || currentStep === 3);

    if (!shouldTilt) {
      if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
      tiltRef.current = 0;
      setTiltProgress(0);
      return;
    }

    tiltRef.current = 0;
    let lastTs = null;
    let running = true;

    const frame = (ts) => {
      if (!running) return;
      const dt = lastTs !== null ? Math.min(ts - lastTs, 50) : 0;
      lastTs = ts;
      tiltRef.current = Math.min(1, tiltRef.current + dt / 400);
      setTiltProgress(tiltRef.current);
      if (tiltRef.current < 1) {
        tiltRafRef.current = requestAnimationFrame(frame);
      } else {
        tiltRafRef.current = null;
      }
    };

    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    tiltRafRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    };
  }, [isAnimating, currentStep]);

  const benchY = height - 20;

  // Layout positions
  const leftX = 140;
  const rightX = 360;
  const erlenmeyerY = 130;

  // Erlenmeyer center for proximity checks (varies by step)
  const erlCenterX = (currentStep === 4 || currentStep > 4) ? width / 2 : rightX;
  const erlCenterY = (currentStep === 4 || currentStep > 4) ? erlenmeyerY + 120 : erlenmeyerY + 80;

  // Check proximity of dragged source to Erlenmeyer
  const checkProximity = useCallback((groupPos, sourceX, sourceY) => {
    const apparentX = sourceX + groupPos.x;
    const apparentY = sourceY + groupPos.y;
    return Math.hypot(apparentX - erlCenterX, apparentY - erlCenterY) < SNAP_DISTANCE;
  }, [erlCenterX, erlCenterY]);

  // Drag handlers for source items
  const makeDragHandlers = useCallback((sourceX, sourceY, action) => ({
    onDragMove: (e) => {
      const gp = e.target.position();
      setNearTarget(checkProximity(gp, sourceX, sourceY));
    },
    onDragEnd: (e) => {
      const gp = e.target.position();
      const near = checkProximity(gp, sourceX, sourceY);
      // Snap back
      e.target.position({ x: 0, y: 0 });
      e.target.getLayer()?.batchDraw();
      setNearTarget(false);
      if (near && action) action();
    },
    onMouseEnter: (e) => setCursor(e, 'grab'),
    onMouseLeave: (e) => setCursor(e, 'default'),
    onDragStart: (e) => setCursor(e, 'grabbing'),
  }), [checkProximity]);

  // Cylinder approximate center for proximity
  const cylCenterX = leftX;
  const cylCenterY = 190;

  // Buffer cylinder (10 mL probeta) approximate center
  const beakerCenterX = 105;
  const beakerCenterY = 130;  // y(50) + tubeHeight(160)/2

  // ── Tilt geometry ────────────────────────────────────────────────────────
  // Cylinders slide toward the Erlenmeyer (body left edge = x 290) while rotating CW.
  // spoutX = baseX + H·sin(θ),  spoutY = baseY - H·cos(θ)
  // Translation is kept small so the cylinder body never crosses x=290.

  const LARGE_TUBE_H = 280;
  const largeBaseX   = leftX + tiltProgress * 15;             // 140 → 155
  const largeBaseY   = 50 + LARGE_TUBE_H - tiltProgress * 8;  // 330 → 322
  const largeTiltDeg = tiltProgress * 40;
  const largeTiltRad = largeTiltDeg * Math.PI / 180;
  const largeSpoutX  = largeBaseX + LARGE_TUBE_H * Math.sin(largeTiltRad);
  const largeSpoutY  = largeBaseY - LARGE_TUBE_H * Math.cos(largeTiltRad);

  // Small cylinder (step 3): slides 85 px right while rotating CW up to 55°.
  const SMALL_TUBE_H = 160;
  const SMALL_BASE_Y = 50 + SMALL_TUBE_H; // 210
  const smallBaseX   = 105 + tiltProgress * 85;  // 105 → 190
  const smallTiltDeg = tiltProgress * 55;
  const smallTiltRad = smallTiltDeg * Math.PI / 180;
  const smallSpoutX  = smallBaseX + SMALL_TUBE_H * Math.sin(smallTiltRad);
  const smallSpoutY  = SMALL_BASE_Y  - SMALL_TUBE_H * Math.cos(smallTiltRad);

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Bench surface */}
        <Rect
          x={0} y={benchY} width={width} height={20}
          fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]}
        />

        {/* ===== STEPS 1-2: Cylinder + Erlenmeyer ===== */}
        {(currentStep === 1 || currentStep === 2) && (
          <>
            {/* Erlenmeyer glow when item is near — always rendered for stable indices */}
            <Circle
              x={rightX} y={erlenmeyerY + 80}
              radius={85} fill="#3B82F6"
              opacity={nearTarget && currentStep === 2 ? 0.1 : 0}
            />

            {/* Erlenmeyer (target — always visible) */}
            <Erlenmeyer
              x={rightX} y={erlenmeyerY}
              liquidColor={erlenmeyerColor} fillLevel={erlenmeyerFill}
            />
            <Text
              x={rightX - 45} y={benchY - 25}
              text="Erlenmeyer" fontSize={11} fill="#64748B"
              fontFamily="IBM Plex Sans" width={90} align="center"
            />

            {/* GraduatedCylinder — draggable, hidden while pouring */}
            <Group
              x={0} y={0}
              opacity={isAnimating ? 0 : 1}
              draggable={currentStep === 2 && !isAnimating}
              {...(currentStep === 2 && !isAnimating
                ? makeDragHandlers(cylCenterX, cylCenterY, onPourWater)
                : {})}
            >
              <GraduatedCylinder
                x={leftX} y={50}
                capacity={maxCylinderVolume}
                currentVolume={cylinderVolume}
              />
              <Text
                x={leftX - 30} y={benchY - 25}
                text="Probeta" fontSize={11} fill="#64748B"
                fontFamily="IBM Plex Sans" width={60} align="center"
              />
            </Group>

            {/* Tilting cylinder — pivots at its base, visible only while animating */}
            <Group
              x={largeBaseX}
              y={largeBaseY}
              rotation={largeTiltDeg}
              opacity={isAnimating ? 1 : 0}
              listening={isAnimating}
            >
              <GraduatedCylinder
                x={0} y={-LARGE_TUBE_H}
                capacity={maxCylinderVolume}
                currentVolume={cylinderVolume}
                showGraduations={false}
              />
            </Group>

            {/* Hint text — always rendered to keep child indices stable */}
            <Text
              x={leftX + 40} y={benchY - 55}
              text="Arrastra la probeta al Erlenmeyer →"
              fontSize={12} fill="#3B82F6"
              opacity={currentStep === 2 && !isAnimating ? 0.8 : 0}
              fontFamily="IBM Plex Sans" width={180}
            />

            {/* Pour stream from tilted spout — starts once tilt is past 60 % */}
            <PourAnimation
              fromX={largeSpoutX} fromY={largeSpoutY}
              toX={rightX} toY={erlenmeyerY + 5}
              isPouring={tiltProgress > 0.55 && isAnimating && currentStep === 2}
              color="#C0D0DA"
            />
          </>
        )}

        {/* ===== STEP 3: Buffer beaker + Erlenmeyer ===== */}
        {currentStep === 3 && (
          <>
            {/* Erlenmeyer glow — always rendered for stable indices */}
            <Circle
              x={rightX} y={erlenmeyerY + 80}
              radius={85} fill="#3B82F6"
              opacity={nearTarget ? 0.1 : 0}
            />

            {/* Erlenmeyer (target) */}
            <Erlenmeyer
              x={rightX} y={erlenmeyerY}
              liquidColor={erlenmeyerColor} fillLevel={erlenmeyerFill}
            />
            <Text
              x={rightX - 45} y={benchY - 25}
              text="Erlenmeyer" fontSize={11} fill="#64748B"
              fontFamily="IBM Plex Sans" width={90} align="center"
            />

            {/* Buffer — probeta 10 mL, draggable, hidden while pouring */}
            <Group
              x={0} y={0}
              opacity={isAnimating ? 0 : 1}
              draggable={!isAnimating}
              {...(!isAnimating
                ? makeDragHandlers(beakerCenterX, beakerCenterY, onPourBuffer)
                : {})}
            >
              <GraduatedCylinder
                x={105} y={50}
                capacity={10}
                currentVolume={Math.min(bufferBeakerVolume, 10)}
                tubeWidth={20} tubeHeight={160} baseWidth={32}
              />
              <Text
                x={65} y={benchY - 25}
                text="Tampón pH 10" fontSize={10} fill="#64748B"
                fontFamily="IBM Plex Sans" width={80} align="center"
              />
            </Group>

            {/* Tilting small cylinder — translates + pivots at base */}
            <Group
              x={smallBaseX}
              y={SMALL_BASE_Y}
              rotation={smallTiltDeg}
              opacity={isAnimating ? 1 : 0}
              listening={isAnimating}
            >
              <GraduatedCylinder
                x={0} y={-SMALL_TUBE_H}
                capacity={10}
                currentVolume={Math.min(bufferBeakerVolume, 10)}
                tubeWidth={20} tubeHeight={160} baseWidth={32}
                showGraduations={false}
              />
            </Group>

            {/* Hint text — always rendered to keep child indices stable */}
            <Text
              x={leftX + 40} y={benchY - 55}
              text="Arrastra la probeta al Erlenmeyer →"
              fontSize={12} fill="#3B82F6"
              opacity={!isAnimating ? 0.8 : 0}
              fontFamily="IBM Plex Sans" width={200}
            />

            {/* Pour stream from tilted spout — starts once tilt is past 60 % */}
            <PourAnimation
              fromX={smallSpoutX} fromY={smallSpoutY}
              toX={rightX} toY={erlenmeyerY + 5}
              isPouring={tiltProgress > 0.55 && isAnimating}
              color="#C0D0DA"
            />
          </>
        )}

        {/* ===== STEP 4: Indicator bottle + Erlenmeyer ===== */}
        {currentStep === 4 && (
          <>
            {/* Erlenmeyer */}
            <Erlenmeyer
              x={width / 2} y={erlenmeyerY + 40}
              liquidColor={erlenmeyerColor} fillLevel={erlenmeyerFill}
            />
            <Text
              x={width / 2 - 45} y={benchY - 25}
              text="Erlenmeyer" fontSize={11} fill="#64748B"
              fontFamily="IBM Plex Sans" width={90} align="center"
            />

            {/* Indicator bottle — clickable */}
            <IndicatorBottle x={width / 2} y={40} color={dropColor} />
            {/* Click target area over the bottle — setTimeout defers state
                change so React doesn't re-render Stage mid-Konva-event */}
            <Rect
              x={width / 2 - 22} y={35}
              width={44} height={70}
              fill="rgba(0,0,0,0.001)"
              onClick={() => { if (!isAnimating && onAddDrop) setTimeout(onAddDrop, 0); }}
              onTap={() => { if (!isAnimating && onAddDrop) setTimeout(onAddDrop, 0); }}
              onMouseEnter={(e) => setCursor(e, 'pointer')}
              onMouseLeave={(e) => setCursor(e, 'default')}
            />
            <Text
              x={width / 2 - 30} y={100}
              text="NET" fontSize={11} fill="#64748B"
              fontFamily="IBM Plex Sans" width={60} align="center"
            />

            {/* Hint text — always rendered, hidden during animation to avoid
                react-konva reconciliation issues with child index shifts */}
            <Text
              x={width / 2 - 110} y={12}
              text="Haz clic en el frasco para agregar gotas ↓"
              fontSize={12} fill="#3B82F6" opacity={isAnimating ? 0 : 0.8}
              fontFamily="IBM Plex Sans" width={220} align="center"
            />

            {/* Drop animation */}
            <DropAnimation
              x={width / 2} startY={100} endY={erlenmeyerY + 45}
              isDropping={isAnimating} color={dropColor}
            />
          </>
        )}

        {/* ===== SUMMARY (step > 4) ===== */}
        {currentStep > 4 && (
          <>
            <Erlenmeyer
              x={width / 2} y={erlenmeyerY}
              liquidColor={erlenmeyerColor} fillLevel={erlenmeyerFill}
            />
            <Text
              x={width / 2 - 60} y={benchY - 25}
              text="Listo para titular" fontSize={12} fill="#16A34A"
              fontFamily="IBM Plex Sans" fontStyle="bold"
              width={120} align="center"
            />
          </>
        )}
      </Layer>
    </Stage>
  );
}
