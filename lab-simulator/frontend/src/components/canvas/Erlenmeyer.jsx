import { Group, Line, Rect } from 'react-konva';
import LiquidFill from './LiquidFill';

export default function Erlenmeyer({ x, y, liquidColor, fillLevel = 0.4 }) {
  const bodyWidth = 140;
  const bodyHeight = 120;
  const neckWidth = 30;
  const neckHeight = 40;

  // Flask outline points (left side, bottom, right side, neck)
  const halfBody = bodyWidth / 2;
  const halfNeck = neckWidth / 2;

  const outlinePoints = [
    x - halfNeck, y,                      // top-left of neck
    x - halfNeck, y + neckHeight,          // bottom-left of neck
    x - halfBody, y + neckHeight + bodyHeight, // bottom-left of body
    x + halfBody, y + neckHeight + bodyHeight, // bottom-right of body
    x + halfNeck, y + neckHeight,          // bottom-right of neck
    x + halfNeck, y,                       // top-right of neck
  ];

  // Liquid shape (fills bottom part of flask)
  const liquidTop = y + neckHeight + bodyHeight * (1 - fillLevel);
  const liquidProgress = fillLevel;
  const liquidWidthAtTop = neckWidth + (bodyWidth - neckWidth) * Math.min(1, (liquidTop - y - neckHeight) / bodyHeight > 0 ? 1 - (liquidTop - y - neckHeight) / bodyHeight : 1);
  const halfLiquid = Math.min(halfBody, halfNeck + (halfBody - halfNeck) * Math.min(1, (y + neckHeight + bodyHeight - liquidTop) / bodyHeight));

  return (
    <Group>
      {/* Flask body outline */}
      <Line
        points={outlinePoints}
        stroke="#94A3B8"
        strokeWidth={2}
        closed={false}
        lineCap="round"
        lineJoin="round"
      />

      {/* Bottom line */}
      <Line
        points={[x - halfBody, y + neckHeight + bodyHeight, x + halfBody, y + neckHeight + bodyHeight]}
        stroke="#94A3B8"
        strokeWidth={2}
        lineCap="round"
      />

      {/* Liquid fill */}
      <LiquidFill
        x={x}
        y={y}
        bodyWidth={bodyWidth}
        bodyHeight={bodyHeight}
        neckWidth={neckWidth}
        neckHeight={neckHeight}
        fillLevel={fillLevel}
        color={liquidColor}
      />

      {/* Glass highlight (reflection) */}
      <Rect
        x={x - halfBody + 8}
        y={y + neckHeight + 10}
        width={4}
        height={bodyHeight - 20}
        fill="white"
        opacity={0.3}
        cornerRadius={2}
      />

      {/* Mouth rim */}
      <Line
        points={[x - halfNeck - 3, y, x + halfNeck + 3, y]}
        stroke="#94A3B8"
        strokeWidth={3}
        lineCap="round"
      />
    </Group>
  );
}
