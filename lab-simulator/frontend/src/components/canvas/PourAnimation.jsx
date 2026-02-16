import { useState, useEffect, useRef } from 'react';
import { Group, Line, Circle } from 'react-konva';

export default function PourAnimation({ fromX, fromY, toX, toY, isPouring, color = '#C0D0DA' }) {
  const [animTime, setAnimTime] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!isPouring) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }
    const animate = (ts) => {
      setAnimTime(ts * 0.001);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isPouring]);

  // Quadratic bezier
  const bz = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

  // Control point — arc peaking above both endpoints
  const cpX = (fromX + toX) / 2;
  const cpY = Math.min(fromY, toY) - 40;

  // Build stream polygon along bezier arc
  const segs = 20;
  const startHW = 3.0; // half-width at source
  const endHW = 1.8;   // half-width at destination (thinner due to gravity)

  const leftPts = [];
  const rightPts = [];
  const hlPts = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const px = bz(t, fromX, cpX, toX);
    const py = bz(t, fromY, cpY, toY);

    // Tangent for perpendicular offset
    const t2 = Math.min(1, t + 0.01);
    const dx = bz(t2, fromX, cpX, toX) - px;
    const dy = bz(t2, fromY, cpY, toY) - py;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const hw = startHW + (endHW - startHW) * t;
    const wave = Math.sin(animTime * 8 - t * 12) * 0.5 * (0.3 + t * 0.7);

    leftPts.push(px + nx * (hw + wave), py + ny * (hw + wave));
    rightPts.push(px - nx * (hw - wave), py - ny * (hw - wave));
    hlPts.push(px + wave * 0.2, py);
  }

  // Closed polygon: left edge forward, right edge backward
  const streamPts = [...leftPts];
  for (let i = rightPts.length - 2; i >= 0; i -= 2) {
    streamPts.push(rightPts[i], rightPts[i + 1]);
  }

  // Splash droplets at destination (5, always rendered, opacity-controlled)
  const drops = [0, 1, 2, 3, 4].map(i => {
    const phase = animTime * 4.5 + i * 1.26;
    const life = (phase % 1.4) / 1.4;
    const angle = i * 1.25 + phase * 0.3;
    const dist = 3 + life * 10;
    return {
      x: toX + Math.cos(angle) * dist,
      y: toY - Math.sin(life * Math.PI) * (6 + i * 1.5),
      r: 0.8 + (1 - life) * 0.5,
      opacity: isPouring ? Math.max(0, 0.35 * (1 - life * life)) : 0,
    };
  });

  // Ripple rings at destination (3, always rendered, opacity-controlled)
  const ripples = [0, 1, 2].map(i => {
    const phase = (animTime * 2.2 + i * 0.9) % 2.2;
    return {
      radius: 2 + phase * 5,
      opacity: isPouring ? Math.max(0, 0.25 * (1 - phase / 2.2)) : 0,
    };
  });

  return (
    <Group>
      {/* Stream body (wavy polygon along bezier arc) */}
      <Line
        points={streamPts}
        closed
        fill={color}
        opacity={isPouring ? 0.5 : 0}
      />

      {/* Specular highlight along stream center */}
      <Line
        points={hlPts}
        stroke="white"
        strokeWidth={0.8}
        opacity={isPouring ? 0.22 : 0}
        lineCap="round"
      />

      {/* Impact glow at destination */}
      <Circle
        x={toX} y={toY}
        radius={3}
        fill="white"
        opacity={isPouring ? 0.15 : 0}
      />

      {/* Splash droplets */}
      {drops.map((d, i) => (
        <Circle
          key={`pour-drop-${i}`}
          x={d.x} y={d.y} radius={d.r}
          fill={color}
          opacity={d.opacity}
        />
      ))}

      {/* Ripple rings expanding from impact */}
      {ripples.map((r, i) => (
        <Circle
          key={`pour-ripple-${i}`}
          x={toX} y={toY + 1}
          radius={r.radius}
          stroke={color}
          strokeWidth={0.6}
          opacity={r.opacity}
        />
      ))}
    </Group>
  );
}
