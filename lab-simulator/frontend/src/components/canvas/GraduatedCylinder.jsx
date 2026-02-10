import { Group, Rect, Line, Text } from 'react-konva';

export default function GraduatedCylinder({ x, y, capacity = 250, currentVolume = 0, liquidColor = '#93C5FD' }) {
  const tubeWidth = 40;
  const tubeHeight = 280;
  const baseWidth = 60;
  const baseHeight = 8;
  const fillFraction = Math.min(1, Math.max(0, currentVolume / capacity));
  const liquidHeight = fillFraction * tubeHeight;

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
      {/* Tube body (glass) */}
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

      {/* Liquid inside */}
      {currentVolume > 0 && (
        <Rect
          x={x - tubeWidth / 2 + 2}
          y={y + tubeHeight - liquidHeight}
          width={tubeWidth - 4}
          height={liquidHeight}
          fill={liquidColor}
          opacity={0.55}
          cornerRadius={[0, 0, 2, 2]}
        />
      )}

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

      {/* Pour spout (small lip at top) */}
      <Line
        points={[
          x - tubeWidth / 2 - 4, y,
          x - tubeWidth / 2, y,
        ]}
        stroke="#94A3B8"
        strokeWidth={2}
        lineCap="round"
      />

      {/* Glass highlight */}
      <Rect
        x={x - tubeWidth / 2 + 4}
        y={y + 10}
        width={3}
        height={tubeHeight - 20}
        fill="white"
        opacity={0.3}
        cornerRadius={2}
      />

      {/* Level marker line */}
      {currentVolume > 0 && (
        <Line
          points={[
            x - tubeWidth / 2 - 6, y + tubeHeight - liquidHeight,
            x + tubeWidth / 2 + 6, y + tubeHeight - liquidHeight,
          ]}
          stroke="#2563EB"
          strokeWidth={1}
          dash={[4, 3]}
        />
      )}
    </Group>
  );
}
