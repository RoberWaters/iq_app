import { Line } from 'react-konva';

export default function LiquidFill({
  x, y, bodyWidth, bodyHeight, neckWidth, neckHeight,
  fillLevel, color,
}) {
  if (fillLevel <= 0) return null;

  const halfBody = bodyWidth / 2;
  const halfNeck = neckWidth / 2;
  const totalHeight = neckHeight + bodyHeight;
  const liquidTop = totalHeight * (1 - fillLevel);

  // Calculate the width of the flask at the liquid surface
  const getWidthAtY = (yPos) => {
    if (yPos <= neckHeight) {
      return halfNeck;
    }
    const bodyProgress = (yPos - neckHeight) / bodyHeight;
    return halfNeck + (halfBody - halfNeck) * bodyProgress;
  };

  const topWidth = getWidthAtY(liquidTop);
  const bottomY = y + totalHeight;

  // Build liquid polygon
  const points = [];

  // Top surface (with slight meniscus curve approximation)
  points.push(x - topWidth + 3, y + liquidTop);
  points.push(x + topWidth - 3, y + liquidTop);

  // Right side down to bottom
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const currentY = liquidTop + (totalHeight - liquidTop) * t;
    const w = getWidthAtY(currentY);
    points.push(x + w - 2, y + currentY);
  }

  // Bottom
  points.push(x + halfBody - 2, bottomY - 2);
  points.push(x - halfBody + 2, bottomY - 2);

  // Left side back up
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const currentY = liquidTop + (totalHeight - liquidTop) * t;
    const w = getWidthAtY(currentY);
    points.push(x - w + 2, y + currentY);
  }

  return (
    <Line
      points={points}
      fill={color}
      opacity={0.75}
      closed
    />
  );
}
