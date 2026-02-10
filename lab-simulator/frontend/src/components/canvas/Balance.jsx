import { Group, Rect, Text, Line } from 'react-konva';

export default function Balance({ x, y, value, unit = 'g' }) {
  return (
    <Group>
      {/* Base */}
      <Rect x={x - 60} y={y + 30} width={120} height={8} fill="#CBD5E1" cornerRadius={2} />
      {/* Platform */}
      <Rect x={x - 50} y={y} width={100} height={6} fill="#E2E8F0" cornerRadius={2} />
      {/* Support */}
      <Rect x={x - 3} y={y + 6} width={6} height={24} fill="#94A3B8" />
      {/* Display */}
      <Rect x={x - 35} y={y + 40} width={70} height={25} fill="#1E293B" cornerRadius={3} />
      <Text
        x={x - 30}
        y={y + 46}
        text={value != null ? `${value} ${unit}` : '0.00 g'}
        fontSize={11}
        fill="#4ADE80"
        fontFamily="IBM Plex Mono"
        width={60}
        align="center"
      />
    </Group>
  );
}
