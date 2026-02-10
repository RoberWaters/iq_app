import { Group, Rect, Line, Text } from 'react-konva';

export default function Burette({ x, y, volumeAdded, maxVolume = 50, liquidColor = '#F0F0F0' }) {
  const tubeWidth = 24;
  const tubeHeight = 260;
  const liquidHeight = ((maxVolume - volumeAdded) / maxVolume) * tubeHeight;

  // Graduation marks
  const graduations = [];
  for (let i = 0; i <= maxVolume; i++) {
    const yPos = y + 15 + (i / maxVolume) * tubeHeight;
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

      {/* Tube body (glass) */}
      <Rect
        x={x - tubeWidth / 2}
        y={y + 10}
        width={tubeWidth}
        height={tubeHeight + 10}
        fill="#E8F4FD"
        stroke="#94A3B8"
        strokeWidth={1}
        cornerRadius={[4, 4, 0, 0]}
      />

      {/* Liquid inside */}
      <Rect
        x={x - tubeWidth / 2 + 2}
        y={y + 10 + (tubeHeight - liquidHeight)}
        width={tubeWidth - 4}
        height={liquidHeight + 8}
        fill={liquidColor}
        opacity={0.6}
        cornerRadius={[0, 0, 2, 2]}
      />

      {/* Graduations */}
      {graduations}

      {/* Stopcock (triangle) */}
      <Line
        points={[x - 8, y + tubeHeight + 20, x + 8, y + tubeHeight + 20, x, y + tubeHeight + 30]}
        fill="#64748B"
        closed
      />

      {/* Tip */}
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
        y={y + 6}
        width={tubeWidth + 4}
        height={6}
        fill="#CBD5E1"
        cornerRadius={3}
      />
    </Group>
  );
}
