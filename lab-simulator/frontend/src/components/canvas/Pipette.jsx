import { Group, Rect, Line } from 'react-konva';

export default function Pipette({ x, y, capacity = 10 }) {
  return (
    <Group>
      {/* Pipette body */}
      <Rect x={x - 3} y={y} width={6} height={120} fill="#E8F4FD" stroke="#94A3B8" strokeWidth={1} cornerRadius={[3, 3, 0, 0]} />
      {/* Bulb */}
      <Rect x={x - 8} y={y + 40} width={16} height={30} fill="#E8F4FD" stroke="#94A3B8" strokeWidth={1} cornerRadius={8} />
      {/* Tip */}
      <Line points={[x - 2, y + 120, x + 2, y + 120, x, y + 130]} fill="#94A3B8" closed />
    </Group>
  );
}
