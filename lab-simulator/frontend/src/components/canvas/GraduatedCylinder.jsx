import { Group, Rect, Line, Text, Circle } from 'react-konva';

export default function GraduatedCylinder({
  x, y, capacity = 250, currentVolume = 0,
  liquidColor, isFlowing = false, animTime = 0,
}) {
  const tubeWidth = 40;
  const tubeHeight = 280;
  const baseWidth = 60;
  const baseHeight = 10;
  const fillFraction = Math.min(1, Math.max(0, currentVolume / capacity));
  const liquidHeight = fillFraction * tubeHeight;
  const hasLiquid = currentVolume > 0;

  // Color: if custom liquidColor is passed, use it (for colored solutions);
  // otherwise use realistic near-transparent water
  const waterColor = liquidColor || '#D0DDE6';
  const waterOpacity = liquidColor ? 0.55 : 0.30;

  // Meniscus geometry
  const meniscusDepth = 3;
  const liquidTopY = y + tubeHeight - liquidHeight;
  const liquidBottomY = y + tubeHeight;
  const leftX = x - tubeWidth / 2 + 2;
  const rightX = x + tubeWidth / 2 - 2;
  const liquidW = rightX - leftX;

  // Build liquid polygon with animated meniscus (wave when flowing)
  const segments = 12;
  const liquidPoints = [];
  const meniscusLinePts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = leftX + t * liquidW;
    // Concave meniscus: edges higher, center lower
    const meniscusCurve = meniscusDepth * 4 * t * (1 - t);
    // Flowing disturbance: sine wave overlay on surface
    const wave = isFlowing
      ? Math.sin(animTime * 7 + t * Math.PI * 3) * 1.3
      : 0;
    const py = liquidTopY + meniscusCurve + wave;
    liquidPoints.push(px, py);
    meniscusLinePts.push(px, py);
  }
  liquidPoints.push(rightX, liquidBottomY);
  liquidPoints.push(leftX, liquidBottomY);

  // Rising bubbles (3 — always rendered, opacity-controlled)
  const bubbles = [0, 1, 2].map(i => {
    const phase = (animTime * 1.2 + i * 0.85) % 2.5;
    const frac = phase / 2.5; // 0..1 lifecycle
    const bx = leftX + 5 + i * (liquidW * 0.33) + Math.sin(animTime * 2.5 + i * 2.1) * 2;
    const by = liquidBottomY - 5 - frac * Math.max(0, liquidHeight - 15);
    const r = 1.0 + Math.sin(frac * Math.PI) * 0.7;
    const visible = isFlowing && hasLiquid && by > liquidTopY + 5 && liquidHeight > 25;
    return {
      x: bx, y: by, r,
      opacity: visible ? 0.22 * Math.sin(frac * Math.PI) : 0,
    };
  });

  // Graduation marks (bottom-up: 0 at bottom, capacity at top)
  const graduations = [];
  const majorStep = capacity <= 100 ? 10 : 50;
  const minorStep = capacity <= 100 ? 5 : 10;
  const tickStep = capacity <= 100 ? 1 : 5;

  for (let v = 0; v <= capacity; v += tickStep) {
    const yPos = y + tubeHeight - (v / capacity) * tubeHeight;
    const isMajor = v % majorStep === 0;
    const isMid = v % minorStep === 0;
    const lineLen = isMajor ? 14 : isMid ? 9 : 4;

    graduations.push(
      <Line
        key={`grad-${v}`}
        points={[x + tubeWidth / 2, yPos, x + tubeWidth / 2 + lineLen, yPos]}
        stroke="#94A3B8"
        strokeWidth={isMajor ? 1.5 : 0.5}
      />
    );

    if (isMajor) {
      graduations.push(
        <Text
          key={`label-${v}`}
          x={x + tubeWidth / 2 + 16}
          y={yPos - 5}
          text={String(v)}
          fontSize={9}
          fill="#64748B"
          fontFamily="IBM Plex Mono"
        />
      );
    }
  }

  return (
    <Group>
      {/* Glass tube body */}
      <Rect
        x={x - tubeWidth / 2} y={y}
        width={tubeWidth} height={tubeHeight}
        fill="#E8F4FD"
        stroke="#94A3B8" strokeWidth={1.5}
        cornerRadius={[4, 4, 0, 0]}
      />

      {/* Liquid with concave meniscus */}
      <Line
        points={liquidPoints}
        closed
        fill={waterColor}
        opacity={hasLiquid ? waterOpacity : 0}
      />

      {/* Meniscus edge line (visible surface boundary) */}
      <Line
        points={meniscusLinePts}
        stroke="#8FA8B8"
        strokeWidth={0.8}
        opacity={hasLiquid ? 0.45 : 0}
        lineCap="round"
      />

      {/* Refraction highlight (left — white light bending through water + glass) */}
      <Rect
        x={leftX + 1}
        y={liquidTopY + meniscusDepth + 2}
        width={5}
        height={Math.max(0, liquidHeight - meniscusDepth - 4)}
        fill="white"
        opacity={hasLiquid ? 0.16 : 0}
        cornerRadius={2}
      />

      {/* Refraction highlight (center — subtle caustic stripe) */}
      <Rect
        x={x - 1}
        y={liquidTopY + meniscusDepth + 8}
        width={3}
        height={Math.max(0, liquidHeight - meniscusDepth - 16)}
        fill="white"
        opacity={hasLiquid ? 0.07 : 0}
        cornerRadius={1}
      />

      {/* Rising bubbles */}
      {bubbles.map((b, i) => (
        <Circle
          key={`bubble-${i}`}
          x={b.x} y={b.y} radius={b.r}
          stroke="white" strokeWidth={0.5}
          opacity={b.opacity}
        />
      ))}

      {/* Graduations */}
      {graduations}

      {/* Base */}
      <Rect
        x={x - baseWidth / 2} y={y + tubeHeight}
        width={baseWidth} height={baseHeight}
        fill="#CBD5E1"
        stroke="#94A3B8" strokeWidth={1}
        cornerRadius={[0, 0, 4, 4]}
      />

      {/* Rim at top of tube */}
      <Line
        points={[x - tubeWidth / 2, y, x + tubeWidth / 2, y]}
        stroke="#94A3B8"
        strokeWidth={2.5}
      />

      {/* Pour spout lip */}
      <Line
        points={[x - tubeWidth / 2 - 5, y, x - tubeWidth / 2, y]}
        stroke="#94A3B8"
        strokeWidth={2}
        lineCap="round"
      />

      {/* Glass highlight (left) */}
      <Rect
        x={x - tubeWidth / 2 + 4} y={y + 10}
        width={3} height={tubeHeight - 20}
        fill="white" opacity={0.35}
        cornerRadius={2}
      />

      {/* Glass highlight (right, subtle) */}
      <Rect
        x={x + tubeWidth / 2 - 8} y={y + 15}
        width={2} height={tubeHeight - 30}
        fill="white" opacity={0.15}
        cornerRadius={2}
      />

      {/* Level marker dashed line */}
      <Line
        points={[
          x - tubeWidth / 2 - 8, liquidTopY,
          x + tubeWidth / 2 + 8, liquidTopY,
        ]}
        stroke="#2563EB"
        strokeWidth={1}
        dash={[4, 3]}
        opacity={hasLiquid ? 1 : 0}
      />
    </Group>
  );
}
