import { Group, Rect, Line, Text, Circle } from 'react-konva';

export default function Burette({ x, y, volumeAdded, maxVolume = 50, liquidColor = '#C8D8E8' }) {
  const tubeWidth = 24;
  const tubeHeight = 260;
  const tubeTop = y + 15;
  const liquidFraction = Math.max(0, Math.min(1, (maxVolume - volumeAdded) / maxVolume));
  const liquidHeight = liquidFraction * tubeHeight;
  const hasLiquid = liquidFraction > 0;

  // Liquid geometry
  const liquidTopY = tubeTop + (tubeHeight - liquidHeight);
  const liquidBottomY = tubeTop + tubeHeight;
  const liquidLeftX = x - tubeWidth / 2 + 2;
  const liquidRightX = x + tubeWidth / 2 - 2;
  const liquidW = liquidRightX - liquidLeftX;

  // Meniscus curve points (concave — edges higher, center lower)
  const meniscusDepth = 2;
  const meniscusSegs = 8;
  const meniscusPts = [];
  for (let i = 0; i <= meniscusSegs; i++) {
    const t = i / meniscusSegs;
    const px = liquidLeftX + t * liquidW;
    const curve = meniscusDepth * 4 * t * (1 - t);
    meniscusPts.push(px, liquidTopY + curve);
  }

  // Build liquid polygon with meniscus top surface
  const liquidPts = [...meniscusPts];
  liquidPts.push(liquidRightX, liquidBottomY);
  liquidPts.push(liquidLeftX, liquidBottomY);

  // Graduation marks (top-down: 0 at top, maxVolume at bottom — standard burette)
  const graduations = [];
  for (let i = 0; i <= maxVolume; i++) {
    const yPos = tubeTop + (i / maxVolume) * tubeHeight;
    const isMajor = i % 10 === 0;
    const isMid = i % 5 === 0;
    const lineLen = isMajor ? 12 : isMid ? 8 : 4;

    graduations.push(
      <Line
        key={`grad-${i}`}
        points={[x + tubeWidth / 2, yPos, x + tubeWidth / 2 + lineLen, yPos]}
        stroke="#94A3B8"
        strokeWidth={isMajor ? 1.5 : 0.5}
      />
    );

    if (isMajor) {
      graduations.push(
        <Text
          key={`label-${i}`}
          x={x + tubeWidth / 2 + 14}
          y={yPos - 5}
          text={String(i)}
          fontSize={9}
          fill="#64748B"
          fontFamily="IBM Plex Mono"
        />
      );
    }
  }

  return (
    <Group>
      {/* Stand rod */}
      <Rect x={x - 60} y={y} width={4} height={tubeHeight + 60} fill="#94A3B8" cornerRadius={2} />
      <Rect x={x - 80} y={y + tubeHeight + 50} width={80} height={6} fill="#94A3B8" cornerRadius={2} />

      {/* Clamp */}
      <Rect x={x - 58} y={y + 40} width={60} height={6} fill="#94A3B8" cornerRadius={2} />

      {/* Tube body (empty glass) */}
      <Rect
        x={x - tubeWidth / 2}
        y={tubeTop - 5}
        width={tubeWidth}
        height={tubeHeight + 10}
        fill="#E8F4FD"
        stroke="#94A3B8"
        strokeWidth={1}
        cornerRadius={[4, 4, 0, 0]}
      />

      {/* Liquid with concave meniscus */}
      <Line
        points={liquidPts}
        closed
        fill={liquidColor}
        opacity={hasLiquid ? 0.7 : 0}
      />

      {/* Meniscus edge line (visible surface boundary) */}
      <Line
        points={meniscusPts}
        stroke="#8FA8B8"
        strokeWidth={0.8}
        opacity={hasLiquid ? 0.6 : 0}
        lineCap="round"
      />

      {/* Refraction highlight inside liquid (left) */}
      <Rect
        x={liquidLeftX + 1}
        y={liquidTopY + meniscusDepth + 2}
        width={3}
        height={Math.max(0, liquidHeight - meniscusDepth - 4)}
        fill="white"
        opacity={hasLiquid ? 0.2 : 0}
        cornerRadius={1}
      />

      {/* Glass highlight (empty portion — left) */}
      <Rect
        x={x - tubeWidth / 2 + 3}
        y={tubeTop}
        width={2}
        height={Math.max(0, tubeHeight - liquidHeight - 5)}
        fill="white"
        opacity={0.35}
        cornerRadius={1}
      />

      {/* Level marker dashed line */}
      <Line
        points={[
          x - tubeWidth / 2 - 6, liquidTopY,
          x + tubeWidth / 2 + 6, liquidTopY,
        ]}
        stroke="#2563EB"
        strokeWidth={1}
        dash={[3, 2]}
        opacity={hasLiquid ? 0.8 : 0}
      />

      {/* Current reading label */}
      <Text
        x={x - tubeWidth / 2 - 38}
        y={liquidTopY - 5}
        text={volumeAdded.toFixed(1)}
        fontSize={9}
        fill="#2563EB"
        fontFamily="IBM Plex Mono"
        fontStyle="bold"
        opacity={hasLiquid ? 0.9 : 0}
      />

      {/* Graduations */}
      {graduations}

      {/* Stopcock body */}
      <Line
        points={[x - 8, y + tubeHeight + 20, x + 8, y + tubeHeight + 20, x, y + tubeHeight + 30]}
        fill="#64748B"
        closed
      />

      {/* Stopcock handle */}
      <Rect
        x={x + 8}
        y={y + tubeHeight + 18}
        width={14}
        height={5}
        fill="#94A3B8"
        cornerRadius={2}
      />

      {/* Tip / nozzle */}
      <Rect
        x={x - 2}
        y={y + tubeHeight + 20}
        width={4}
        height={16}
        fill="#94A3B8"
        cornerRadius={[0, 0, 2, 2]}
      />

      {/* Top cap */}
      <Rect
        x={x - tubeWidth / 2 - 2}
        y={tubeTop - 8}
        width={tubeWidth + 4}
        height={6}
        fill="#CBD5E1"
        cornerRadius={3}
      />
    </Group>
  );
}
