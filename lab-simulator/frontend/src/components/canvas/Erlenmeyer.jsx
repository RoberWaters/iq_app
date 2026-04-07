import { Group, Line, Rect, Ellipse, Text } from 'react-konva';
import LiquidFill from './LiquidFill';

/**
 * Erlenmeyer flask — realistic borosilicate look with graduations.
 *
 * Outline geometry (linear conical body) is preserved so that LiquidFill,
 * FoilCover, and IndicatorDiffusion remain in sync.
 */
export default function Erlenmeyer({
  x,
  y,
  liquidColor,
  fillLevel = 0.4,
  isStirring = false,
  stirSpeed = 3,
  capacity = 250,
  showGraduations = true,
}) {
  const bodyWidth = 140;
  const bodyHeight = 120;
  const neckWidth = 30;
  const neckHeight = 40;

  const halfBody = bodyWidth / 2;
  const halfNeck = neckWidth / 2;

  const neckBaseY = y + neckHeight;
  const bottomY = y + neckHeight + bodyHeight;

  // Smooth shoulder fillet between neck and body (small radius — does not
  // intrude into the linear-conical region used by LiquidFill).
  const shoulderR = 6;
  const shoulderSteps = 6;
  const leftShoulder = [];
  const rightShoulderRev = [];
  for (let i = 0; i <= shoulderSteps; i++) {
    const t = i / shoulderSteps;
    const ang = (Math.PI / 2) * t;
    const dx = (1 - Math.cos(ang)) * shoulderR;
    const sy = neckBaseY - shoulderR + Math.sin(ang) * shoulderR;
    leftShoulder.push(x - halfNeck - dx, sy);
  }
  for (let i = shoulderSteps; i >= 0; i--) {
    const t = i / shoulderSteps;
    const ang = (Math.PI / 2) * t;
    const dx = (1 - Math.cos(ang)) * shoulderR;
    const sy = neckBaseY - shoulderR + Math.sin(ang) * shoulderR;
    rightShoulderRev.push(x + halfNeck + dx, sy);
  }

  const glassOutline = [
    x - halfNeck, y + 2,
    x - halfNeck, neckBaseY - shoulderR,
    ...leftShoulder,
    x - halfBody, bottomY - 4,
    x - halfBody + 4, bottomY,
    x + halfBody - 4, bottomY,
    x + halfBody, bottomY - 4,
    ...rightShoulderRev,
    x + halfNeck, neckBaseY - shoulderR,
    x + halfNeck, y + 2,
  ];

  // Graduation marks: every (capacity / 5) mL up the body
  const gradCount = 4; // 4 minor + capacity
  const gradMarks = [];
  for (let i = 1; i <= gradCount; i++) {
    const frac = i / 5; // 0.2, 0.4, 0.6, 0.8 of body capacity
    const gy = bottomY - frac * bodyHeight;
    // width of body at this y (linear conical)
    const bodyT = (gy - neckBaseY) / bodyHeight;
    const w = halfNeck + (halfBody - halfNeck) * bodyT;
    const tickLen = i % 2 === 0 ? 6 : 4;
    // Tick straddles the inner wall so it reads as a graduation engraved on the glass
    gradMarks.push(
      <Line
        key={`tick-${i}`}
        points={[x + w - tickLen, gy, x + w + 1, gy]}
        stroke="#5A6F82"
        strokeWidth={i % 2 === 0 ? 1 : 0.6}
      />
    );
    if (i % 2 === 0) {
      const ml = Math.round((capacity * frac) / 10) * 10;
      gradMarks.push(
        <Text
          key={`lbl-${i}`}
          x={x + w + 4}
          y={gy - 4}
          text={`${ml}`}
          fontSize={9}
          fill="#475569"
          fontFamily="IBM Plex Mono"
        />
      );
    }
  }

  return (
    <Group>
      {/* Base shadow ellipse */}
      <Ellipse
        x={x}
        y={bottomY + 3}
        radiusX={halfBody - 2}
        radiusY={3}
        fill="black"
        opacity={0.12}
      />

      {/* Glass body fill (very pale tint behind liquid) */}
      <Line
        points={glassOutline}
        closed
        fill="#EAF4FB"
        opacity={0.55}
      />

      {/* Outer outline */}
      <Line
        points={glassOutline}
        stroke="#7C8B9E"
        strokeWidth={2}
        closed
        lineJoin="round"
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
        isStirring={isStirring}
        stirSpeed={stirSpeed}
      />

      {/* Graduations (right side, inside the glass) */}
      {showGraduations && gradMarks}

      {/* Left curved highlight (main reflection) */}
      <Line
        points={[
          x - halfNeck + 4, y + 6,
          x - halfNeck + 3, neckBaseY,
          x - halfBody + 14, bottomY - 18,
          x - halfBody + 22, bottomY - 8,
        ]}
        stroke="white"
        strokeWidth={3}
        opacity={0.45}
        lineCap="round"
        lineJoin="round"
        tension={0.4}
      />

      {/* Secondary thin highlight */}
      <Line
        points={[
          x - halfBody + 6, bottomY - 40,
          x - halfBody + 9, bottomY - 14,
        ]}
        stroke="white"
        strokeWidth={1.2}
        opacity={0.35}
        lineCap="round"
      />

      {/* Right edge subtle highlight */}
      <Line
        points={[
          x + halfNeck - 3, neckBaseY + 4,
          x + halfBody - 6, bottomY - 12,
        ]}
        stroke="white"
        strokeWidth={1}
        opacity={0.18}
        lineCap="round"
      />

      {/* Mouth rim (thicker, with cap line) */}
      <Rect
        x={x - halfNeck - 4}
        y={y - 1}
        width={neckWidth + 8}
        height={4}
        fill="#B8C2D1"
        stroke="#7C8B9E"
        strokeWidth={1}
        cornerRadius={2}
      />
      <Line
        points={[x - halfNeck - 2, y + 1, x + halfNeck + 2, y + 1]}
        stroke="white"
        strokeWidth={1}
        opacity={0.5}
        lineCap="round"
      />
    </Group>
  );
}
