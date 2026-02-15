import { Group, Rect, Line, Text } from 'react-konva';

export default function GraduatedCylinder({ x, y, capacity = 250, currentVolume = 0, liquidColor = '#93C5FD' }) {
  const tubeWidth = 40;
  const tubeHeight = 280;
  const baseWidth = 60;
  const baseHeight = 10;
  const fillFraction = Math.min(1, Math.max(0, currentVolume / capacity));
  const liquidHeight = fillFraction * tubeHeight;
  const hasLiquid = currentVolume > 0;

  // Meniscus geometry (concave — edges higher, center lower)
  const meniscusDepth = 3;
  const liquidTopY = y + tubeHeight - liquidHeight;
  const liquidBottomY = y + tubeHeight;
  const leftX = x - tubeWidth / 2 + 2;
  const rightX = x + tubeWidth / 2 - 2;
  const liquidW = rightX - leftX;

  // Build liquid polygon with concave meniscus top surface
  const segments = 8;
  const liquidPoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = leftX + t * liquidW;
    // Parabolic curve: 0 at edges, meniscusDepth at center
    const py = liquidTopY + meniscusDepth * 4 * t * (1 - t);
    liquidPoints.push(px, py);
  }
  liquidPoints.push(rightX, liquidBottomY);
  liquidPoints.push(leftX, liquidBottomY);

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
        x={x - tubeWidth / 2}
        y={y}
        width={tubeWidth}
        height={tubeHeight}
        fill="#E8F4FD"
        stroke="#94A3B8"
        strokeWidth={1.5}
        cornerRadius={[4, 4, 0, 0]}
      />

      {/* Liquid with concave meniscus */}
      <Line
        points={liquidPoints}
        closed
        fill={liquidColor}
        opacity={hasLiquid ? 0.55 : 0}
      />

      {/* Liquid refraction highlight (lighter strip on left) */}
      <Rect
        x={leftX}
        y={liquidTopY + meniscusDepth}
        width={6}
        height={Math.max(0, liquidHeight - meniscusDepth)}
        fill="#BFDBFE"
        opacity={hasLiquid ? 0.3 : 0}
        cornerRadius={[0, 0, 2, 2]}
      />

      {/* Graduations */}
      {graduations}

      {/* Base */}
      <Rect
        x={x - baseWidth / 2}
        y={y + tubeHeight}
        width={baseWidth}
        height={baseHeight}
        fill="#CBD5E1"
        stroke="#94A3B8"
        strokeWidth={1}
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
        x={x - tubeWidth / 2 + 4}
        y={y + 10}
        width={3}
        height={tubeHeight - 20}
        fill="white"
        opacity={0.35}
        cornerRadius={2}
      />

      {/* Glass highlight (right, subtle) */}
      <Rect
        x={x + tubeWidth / 2 - 8}
        y={y + 15}
        width={2}
        height={tubeHeight - 30}
        fill="white"
        opacity={0.15}
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
