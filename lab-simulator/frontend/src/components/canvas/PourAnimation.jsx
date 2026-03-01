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

  // Quadratic bezier helpers
  const bz  = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  const dbz = (t, a, b, c) => 2 * (1 - t) * (b - a) + 2 * t * (c - b); // derivative

  // Control point: stream exits mostly downward from source, curves to dest.
  // cpX stays close to fromX (gravity pull), cpY sits at mid-height.
  const cpX = fromX * 0.82 + toX * 0.18;
  const cpY = fromY + (toY - fromY) * 0.55;

  // ── Stream line ─────────────────────────────────────────────────────────
  // 14-segment polyline along the bezier, drawn as a thin wiggly stroke
  const segs = 14;
  const streamPts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    // Slight perpendicular wiggle so the stream isn't dead straight
    const dx = dbz(t, fromX, cpX, toX);
    const dy = dbz(t, fromY, cpY, toY);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const wiggle = Math.sin(animTime * 9 + t * 10) * 0.5;
    streamPts.push(
      bz(t, fromX, cpX, toX) + nx * wiggle,
      bz(t, fromY, cpY, toY) + ny * wiggle,
    );
  }

  // ── Falling drops ────────────────────────────────────────────────────────
  // 7 drops at staggered phases; each travels 0→1 along the bezier path.
  const NUM_DROPS = 7;
  const SPEED = 1.6; // path-cycles per second
  const drops = Array.from({ length: NUM_DROPS }, (_, i) => {
    const phase = ((animTime * SPEED + i / NUM_DROPS) % 1);
    const t = phase;
    const x = bz(t, fromX, cpX, toX) + Math.sin(animTime * 5 + i * 1.7) * 0.6;
    const y = bz(t, fromY, cpY, toY);
    const r = 1.8 - t * 0.5; // slightly smaller as it falls
    const opacity = isPouring ? 0.8 * Math.sin(t * Math.PI) : 0;
    return { x, y, r, opacity };
  });

  // ── Ripple rings at landing ───────────────────────────────────────────────
  const ripples = [0, 1, 2].map(i => {
    const phase = (animTime * 2.5 + i * 0.85) % 2;
    return {
      radius: 1.5 + phase * 4.5,
      opacity: isPouring ? Math.max(0, 0.22 * (1 - phase / 2)) : 0,
    };
  });

  // ── Tiny splash drops at landing ─────────────────────────────────────────
  const splashes = [0, 1, 2, 3].map(i => {
    const phase = (animTime * 4 + i * 0.95) % 1.3;
    const life = phase / 1.3;
    const angle = i * 1.57 + animTime * 0.4;
    return {
      x: toX + Math.cos(angle) * (2 + life * 7),
      y: toY - Math.sin(life * Math.PI) * (3 + i * 1.2),
      opacity: isPouring ? Math.max(0, 0.35 * (1 - life * life)) : 0,
    };
  });

  return (
    <Group>
      {/* Thin stream thread */}
      <Line
        points={streamPts}
        stroke={color}
        strokeWidth={1.8}
        opacity={isPouring ? 0.55 : 0}
        lineCap="round"
        lineJoin="round"
      />

      {/* Falling drops along path */}
      {drops.map((d, i) => (
        <Circle
          key={`drop-${i}`}
          x={d.x} y={d.y} radius={d.r}
          fill={color}
          opacity={d.opacity}
        />
      ))}

      {/* Impact ripple rings */}
      {ripples.map((r, i) => (
        <Circle
          key={`ripple-${i}`}
          x={toX} y={toY + 1}
          radius={r.radius}
          stroke={color}
          strokeWidth={0.5}
          opacity={r.opacity}
        />
      ))}

      {/* Tiny splash droplets */}
      {splashes.map((s, i) => (
        <Circle
          key={`splash-${i}`}
          x={s.x} y={s.y} radius={0.9}
          fill={color}
          opacity={s.opacity}
        />
      ))}
    </Group>
  );
}
