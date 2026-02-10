import { Group, Rect, Line } from 'react-konva';

export default function IndicatorBottle({ x, y, color = '#CD5C5C' }) {
  return (
    <Group>
      {/* Bottle body */}
      <Rect
        x={x - 12}
        y={y + 20}
        width={24}
        height={35}
        fill={color}
        opacity={0.8}
        stroke="#94A3B8"
        strokeWidth={1}
        cornerRadius={[0, 0, 4, 4]}
      />
      {/* Neck */}
      <Rect
        x={x - 5}
        y={y + 8}
        width={10}
        height={14}
        fill="#E8F4FD"
        stroke="#94A3B8"
        strokeWidth={1}
      />
      {/* Dropper tip */}
      <Line
        points={[x - 3, y + 8, x, y, x + 3, y + 8]}
        stroke="#64748B"
        strokeWidth={1.5}
        closed
        fill="#94A3B8"
      />
    </Group>
  );
}
