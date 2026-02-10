import { Circle, Group } from 'react-konva';

export default function PrecipitateEffect({ x, y, width, height, color = '#FFD700', density = 20 }) {
  const particles = [];
  for (let i = 0; i < density; i++) {
    particles.push({
      cx: x - width / 2 + Math.random() * width,
      cy: y + height * 0.6 + Math.random() * height * 0.4,
      r: 1 + Math.random() * 2,
    });
  }

  return (
    <Group>
      {particles.map((p, i) => (
        <Circle key={i} x={p.cx} y={p.cy} radius={p.r} fill={color} opacity={0.6} />
      ))}
    </Group>
  );
}
