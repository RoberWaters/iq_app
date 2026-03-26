import { useState, useCallback, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle } from 'react-konva';
import GraduatedCylinder from './GraduatedCylinder';
import Erlenmeyer from './Erlenmeyer';
import PourAnimation from './PourAnimation';
import IndicatorBottle from './IndicatorBottle';
import DropAnimation from './DropAnimation';
import MagneticStirrer from './MagneticStirrer';
import StirBar from './StirBar';
import StirringEffect from './StirringEffect';
import IndicatorDiffusion from './IndicatorDiffusion';

const SNAP_DISTANCE = 160;

// Safe cursor helper — Konva nodes can lose stage reference during React reconciliation
function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch (_e) { /* ignore */ }
}

export default function AssemblyBench({
  width = 500,
  height = 550,
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
  // Stirrer state (for step 4)
  stirrerOn = false,
  stirBarInFlask = false,
  stirrerSpeed = 3,
  onToggleStirrer,
  onPlaceBar,
  onRemoveBar,
  onSpeedUp,
  onSpeedDown,
  // Spot color for localized indicator effect
  spotColor = null,
  spotOpacity = 0,
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

  // Layout positions — instruments sit on the bench surface
  const leftX = 120;
  const rightX = 400;
  const neckHeight = 40;
  const bodyHeight = 120;
  const bodyWidth = 140;

  // Erlenmeyer: 40px neck + 120px body = 160px total
  const erlenmeyerY = benchY - 160;

  // Step 4 uses a separate layout: flask sits on the stirrer, positioned
  // from the bottom up so everything fits in the canvas.
  // Stirrer (56px) + 2px gap + flask (160px) + bottle space above
  const STIRRER_TOTAL_H = 56; // topH(24) + panelH(32)
  const step4StirrerY = height - 20 - STIRRER_TOTAL_H;
  const step4ErlenmeyerY = step4StirrerY - 2 - bodyHeight - neckHeight;
  const step4FlaskBottomY = step4ErlenmeyerY + neckHeight + bodyHeight;

  // Stir bar rest position (on stirrer ceramic, left of flask)
  const stirBarRestX = width / 2 - 105;
  const stirBarRestY = step4StirrerY + 12;

  // Erlenmeyer center for proximity checks (varies by step)
  const erlCenterX = (currentStep === 4 || currentStep > 4) ? width / 2 : rightX;
  // Use step4 Y for step 4, else normal
  const activeErlY = (currentStep === 4 || currentStep > 4) ? step4ErlenmeyerY : erlenmeyerY;
  const erlCenterY = activeErlY + 80;

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

  // GraduatedCylinder (250 mL): tubeHeight=280 + baseHeight=10 = 290
  const largeCylY = benchY - 290;
  // Cylinder approximate center for proximity
  const cylCenterX = leftX;
  const cylCenterY = largeCylY + 140;

  // Buffer cylinder (10 mL probeta): tubeHeight=160 + baseHeight=10 = 170
  const smallCylX = 105;
  const smallCylY = benchY - 170;
  const beakerCenterX = smallCylX;
  const beakerCenterY = smallCylY + 80;

  // ── Tilt geometry ────────────────────────────────────────────────────────
  const LARGE_TUBE_H = 280;
  const largeTiltDeg = 100;
  const largeTiltRad = largeTiltDeg * Math.PI / 180;
  const largeSpoutGoalX = rightX - 20;
  const largeSpoutGoalY = erlenmeyerY - 10;
  const largeTargetBaseX = largeSpoutGoalX - LARGE_TUBE_H * Math.sin(largeTiltRad);
  const largeTargetBaseY = largeSpoutGoalY + LARGE_TUBE_H * Math.cos(largeTiltRad);
  const largeBaseX   = leftX + tiltProgress * (largeTargetBaseX - leftX);
  const largeBaseY   = benchY + tiltProgress * (largeTargetBaseY - benchY);
  const largeTiltAng = tiltProgress * largeTiltDeg;
  const largeTiltR   = largeTiltAng * Math.PI / 180;
  const largeSpoutX  = largeBaseX + LARGE_TUBE_H * Math.sin(largeTiltR);
  const largeSpoutY  = largeBaseY - LARGE_TUBE_H * Math.cos(largeTiltR);

  const SMALL_TUBE_H = 160;
  const smallTiltDeg = 100;
  const smallTiltRad = smallTiltDeg * Math.PI / 180;
  const smallSpoutGoalX = rightX - 15;
  const smallSpoutGoalY = erlenmeyerY - 10;
  const smallTargetBaseX = smallSpoutGoalX - SMALL_TUBE_H * Math.sin(smallTiltRad);
  const smallTargetBaseY = smallSpoutGoalY + SMALL_TUBE_H * Math.cos(smallTiltRad);
  const smallBaseX   = smallCylX + tiltProgress * (smallTargetBaseX - smallCylX);
  const smallBaseY   = benchY + tiltProgress * (smallTargetBaseY - benchY);
  const smallTiltAng = tiltProgress * smallTiltDeg;
  const smallTiltR   = smallTiltAng * Math.PI / 180;
  const smallSpoutX  = smallBaseX + SMALL_TUBE_H * Math.sin(smallTiltR);
  const smallSpoutY  = smallBaseY - SMALL_TUBE_H * Math.cos(smallTiltR);

  const isStirring = stirrerOn && stirBarInFlask;

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
                x={leftX} y={largeCylY}
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
              rotation={largeTiltAng}
              opacity={isAnimating ? 1 : 0}
              listening={isAnimating}
            >
              <GraduatedCylinder
                x={0} y={-LARGE_TUBE_H}
                capacity={maxCylinderVolume}
                currentVolume={cylinderVolume}
                showGraduations={true}
              />
            </Group>

            {/* Hint text — always rendered to keep child indices stable */}
            <Text
              x={leftX + 40} y={erlenmeyerY - 20}
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
                x={smallCylX} y={smallCylY}
                capacity={10}
                currentVolume={Math.min(bufferBeakerVolume, 10)}
                tubeWidth={20} tubeHeight={160} baseWidth={32}
              />
              <Text
                x={smallCylX - 40} y={benchY - 25}
                text="Tampón pH 10" fontSize={10} fill="#64748B"
                fontFamily="IBM Plex Sans" width={80} align="center"
              />
            </Group>

            {/* Tilting small cylinder — translates + pivots at base */}
            <Group
              x={smallBaseX}
              y={smallBaseY}
              rotation={smallTiltAng}
              opacity={isAnimating ? 1 : 0}
              listening={isAnimating}
            >
              <GraduatedCylinder
                x={0} y={-SMALL_TUBE_H}
                capacity={10}
                currentVolume={Math.min(bufferBeakerVolume, 10)}
                tubeWidth={20} tubeHeight={160} baseWidth={32}
                showGraduations={true}
              />
            </Group>

            {/* Hint text — always rendered to keep child indices stable */}
            <Text
              x={leftX + 40} y={erlenmeyerY - 20}
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

        {/* ===== STEP 4: Indicator bottle + Erlenmeyer + Magnetic Stirrer ===== */}
        {currentStep === 4 && (
          <>
            {/* Magnetic stirrer plate (behind/below flask) */}
            <MagneticStirrer
              x={width / 2}
              y={step4StirrerY}
              isOn={stirrerOn}
              speed={stirrerSpeed}
              stirBarInFlask={stirBarInFlask}
              onToggle={onToggleStirrer}
              onSpeedUp={onSpeedUp}
              onSpeedDown={onSpeedDown}
            />

            {/* Erlenmeyer — on the stirrer */}
            <Erlenmeyer
              x={width / 2} y={step4ErlenmeyerY}
              liquidColor={erlenmeyerColor} fillLevel={erlenmeyerFill}
              isStirring={isStirring}
              stirSpeed={stirrerSpeed}
            />

            {/* Indicator dye diffusing inside liquid — visible when stirrer OFF */}
            <IndicatorDiffusion
              x={width / 2}
              y={step4ErlenmeyerY}
              neckHeight={neckHeight}
              bodyHeight={bodyHeight}
              bodyWidth={bodyWidth}
              fillLevel={erlenmeyerFill}
              color={spotColor || 'rgba(0,0,0,0)'}
              opacity={spotOpacity}
            />

            {/* Stirring effect (swirl lines + particles) */}
            <StirringEffect
              x={width / 2}
              y={step4ErlenmeyerY}
              bodyWidth={bodyWidth}
              bodyHeight={bodyHeight}
              neckHeight={neckHeight}
              fillLevel={erlenmeyerFill}
              isStirring={isStirring}
              speed={stirrerSpeed}
              liquidColor={erlenmeyerColor}
            />

            {/* Stir bar (draggable in/out of flask) */}
            <StirBar
              flaskCenterX={width / 2}
              flaskMouthY={step4ErlenmeyerY}
              flaskNeckHeight={neckHeight}
              flaskBodyHeight={bodyHeight}
              restX={stirBarRestX}
              restY={stirBarRestY}
              isInFlask={stirBarInFlask}
              stirrerOn={stirrerOn}
              speed={stirrerSpeed}
              onPlaceInFlask={onPlaceBar}
              onRemoveFromFlask={onRemoveBar}
            />

            {/* Indicator bottle — held above the flask */}
            <IndicatorBottle x={width / 2} y={step4ErlenmeyerY - 100} color={dropColor} />
            {/* Click target area over the bottle */}
            <Rect
              x={width / 2 - 22} y={step4ErlenmeyerY - 105}
              width={44} height={70}
              fill="rgba(0,0,0,0.001)"
              onClick={() => { if (!isAnimating && onAddDrop) setTimeout(onAddDrop, 0); }}
              onTap={() => { if (!isAnimating && onAddDrop) setTimeout(onAddDrop, 0); }}
              onMouseEnter={(e) => setCursor(e, 'pointer')}
              onMouseLeave={(e) => setCursor(e, 'default')}
            />
            <Text
              x={width / 2 - 30} y={step4ErlenmeyerY - 45}
              text="NET" fontSize={11} fill="#64748B"
              fontFamily="IBM Plex Sans" width={60} align="center"
            />

            {/* Hint text — always rendered */}
            <Text
              x={width / 2 - 110} y={step4ErlenmeyerY - 130}
              text="Haz clic en el frasco para agregar gotas ↓"
              fontSize={12} fill="#3B82F6" opacity={isAnimating ? 0 : 0.8}
              fontFamily="IBM Plex Sans" width={220} align="center"
            />

            {/* Drop animation — from bottle tip down to flask mouth */}
            <DropAnimation
              x={width / 2} startY={step4ErlenmeyerY - 50} endY={step4ErlenmeyerY + 5}
              isDropping={isAnimating} color={dropColor}
            />
          </>
        )}

        {/* ===== SUMMARY (step > 4) ===== */}
        {currentStep > 4 && (
          <>
            <Erlenmeyer
              x={width / 2} y={step4ErlenmeyerY}
              liquidColor={erlenmeyerColor} fillLevel={erlenmeyerFill}
            />
            <Text
              x={width / 2 - 60} y={step4FlaskBottomY + 10}
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
