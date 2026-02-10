import { Group, Rect, Line } from 'react-konva';

export default function Beaker({ x, y, width = 80, height = 100, liquidColor, fillLevel = 0 }) {
  const liquidHeight = height * fillLevel;

  return (
    <Group>
      {/* Body */}
      <Rect x={x - width / 2} y={y} width={width} height={height} fill="#E8F4FD" stroke="#94A3B8" strokeWidth={1.5} cornerRadius={[0, 0, 4, 4]} />
      {/* Liquid */}
      {fillLevel > 0 && (
        <Rect
          x={x - width / 2 + 2}
          y={y + height - liquidHeight}
          width={width - 4}
          height={liquidHeight - 2}
          fill={liquidColor || '#B0D4F1'}
          opacity={0.7}
          cornerRadius={[0, 0, 3, 3]}
        />
      )}
      {/* Spout */}
      <Line points={[x - width / 2, y, x - width / 2 - 8, y - 6]} stroke="#94A3B8" strokeWidth={1.5} />
    </Group>
  );
}
