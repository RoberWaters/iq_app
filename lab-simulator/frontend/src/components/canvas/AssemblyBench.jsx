import { useState, useCallback } from 'react';
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

  // Buffer beaker approximate center
  const beakerCenterX = leftX;
  const beakerCenterY = 205;

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

            {/* GraduatedCylinder — draggable in step 2 */}
            <Group
              x={0} y={0}
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

            {/* Hint text — always rendered to keep child indices stable */}
            <Text
              x={leftX + 40} y={benchY - 55}
              text="Arrastra la probeta al Erlenmeyer \u2192"
              fontSize={12} fill="#3B82F6"
              opacity={currentStep === 2 && !isAnimating ? 0.8 : 0}
              fontFamily="IBM Plex Sans" width={180}
            />

            {/* Pour animation */}
            <PourAnimation
              fromX={leftX - 10} fromY={50}
              toX={rightX} toY={erlenmeyerY + 5}
              isPouring={isAnimating && currentStep === 2}
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

            {/* Buffer beaker — draggable */}
            <Group
              x={0} y={0}
              draggable={!isAnimating}
              {...(!isAnimating
                ? makeDragHandlers(beakerCenterX, beakerCenterY, onPourBuffer)
                : {})}
            >
              <Rect
                x={leftX - 20} y={180}
                width={40} height={50}
                fill="#E8F4FD" stroke="#94A3B8" strokeWidth={1.5}
                cornerRadius={[0, 0, 4, 4]}
              />
              {/* Buffer liquid inside beaker */}
              <Rect
                x={leftX - 18} y={195}
                width={36} height={33}
                fill="#F0F0F0" opacity={0.6}
                cornerRadius={[0, 0, 3, 3]}
              />
              <Text
                x={leftX - 40} y={benchY - 25}
                text="Tampón pH 10" fontSize={10} fill="#64748B"
                fontFamily="IBM Plex Sans" width={80} align="center"
              />
            </Group>

            {/* Hint text — always rendered to keep child indices stable */}
            <Text
              x={leftX + 40} y={benchY - 55}
              text="Arrastra el tampón al Erlenmeyer \u2192"
              fontSize={12} fill="#3B82F6"
              opacity={!isAnimating ? 0.8 : 0}
              fontFamily="IBM Plex Sans" width={200}
            />

            {/* Pour animation */}
            <PourAnimation
              fromX={leftX} fromY={180}
              toX={rightX} toY={erlenmeyerY + 5}
              isPouring={isAnimating} color="#E0E0E0"
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
              text="Haz clic en el frasco para agregar gotas \u2193"
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
