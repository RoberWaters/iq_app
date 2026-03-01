import { Group, Line, Rect } from 'react-konva';

/**
 * Aluminum foil cover over a flask neck.
 * Always rendered — visibility controlled via opacity (react-konva rule).
 *
 * Props:
 *   x          — center X of the flask neck
 *   y          — Y position of the flask mouth
 *   neckWidth  — width of the flask neck opening
 *   visible    — controls opacity
 */
export default function FoilCover({ x, y, neckWidth = 30, visible = true }) {
  const halfNeck = neckWidth / 2;
  const foilWidth = neckWidth + 24;
  const halfFoil = foilWidth / 2;
  const foilHeight = 14;

  // Crinkled top edge — jagged line across the foil top
  const crinklePoints = [];
  const segments = 8;
  for (let i = 0; i <= segments; i++) {
    const px = x - halfFoil + (foilWidth / segments) * i;
    const py = y - foilHeight + (i % 2 === 0 ? 0 : -3);
    crinklePoints.push(px, py);
  }

  // Side drape points (foil hanging over sides)
  const leftDrape = [
    x - halfFoil, y - foilHeight,
    x - halfFoil - 4, y - 2,
    x - halfFoil + 2, y + 4,
  ];
  const rightDrape = [
    x + halfFoil, y - foilHeight,
    x + halfFoil + 4, y - 2,
    x + halfFoil - 2, y + 4,
  ];

  return (
    <Group opacity={visible ? 1 : 0}>
      {/* Main foil body */}
      <Rect
        x={x - halfFoil}
        y={y - foilHeight}
        width={foilWidth}
        height={foilHeight + 4}
        fill="#C0C0C0"
        opacity={0.85}
        cornerRadius={[2, 2, 0, 0]}
      />

      {/* Highlight streak */}
      <Rect
        x={x - halfFoil + 4}
        y={y - foilHeight + 2}
        width={foilWidth - 8}
        height={3}
        fill="#D8D8D8"
        opacity={0.6}
        cornerRadius={1}
      />

      {/* Crinkled top edge */}
      <Line
        points={crinklePoints}
        stroke="#A0A0A0"
        strokeWidth={1.5}
        lineCap="round"
        lineJoin="round"
      />

      {/* Left drape */}
      <Line
        points={leftDrape}
        stroke="#A0A0A0"
        strokeWidth={1}
        lineCap="round"
      />

      {/* Right drape */}
      <Line
        points={rightDrape}
        stroke="#A0A0A0"
        strokeWidth={1}
        lineCap="round"
      />
    </Group>
  );
}
