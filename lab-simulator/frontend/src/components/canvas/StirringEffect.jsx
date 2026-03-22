import { useEffect, useRef } from 'react';
import { Group, Line, Circle } from 'react-konva';
import Konva from 'konva';

/**
 * Liquid stirring animation overlay — swirl lines + orbiting particles.
 *
 * Fades in when stirring starts, fades out gradually when it stops
 * (matching the liquid surface settling speed).
 *
 * react-konva rules:
 *   - Always rendered, opacity-controlled
 *   - Konva.Animation cleaned up on unmount
 */

const RAMP_UP_SPEED = 2.5;
const DECAY_SPEED = 1.2;

export default function StirringEffect({
  x,
  y,
  bodyWidth = 140,
  bodyHeight = 120,
  neckWidth = 30,
  neckHeight = 40,
  fillLevel = 0.44,
  isStirring = false,
  speed = 3,
  liquidColor = '#4169E1',
}) {
  const groupRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);
  const intensityRef = useRef(0);

  const totalHeight = neckHeight + bodyHeight;
  const liquidTopOffset = totalHeight * (1 - fillLevel);
  const liquidSurfaceY = y + liquidTopOffset;

  const halfBody = bodyWidth / 2;
  const halfNeck = neckWidth / 2;
  const getHalfWidthAtY = (absY) => {
    const yOff = absY - y;
    if (yOff <= neckHeight) return halfNeck - 2;
    const bodyProgress = (yOff - neckHeight) / bodyHeight;
    return (halfNeck + (halfBody - halfNeck) * bodyProgress) - 4;
  };

  const flaskBottomY = y + totalHeight;

  const swirlCount = 3;
  const swirlLines = [];
  for (let i = 0; i < swirlCount; i++) {
    const frac = 0.2 + (i / swirlCount) * 0.55;
    const swirlY = liquidSurfaceY + (flaskBottomY - liquidSurfaceY) * frac;
    const hw = getHalfWidthAtY(swirlY) * 0.7;
    swirlLines.push({ y: swirlY, halfW: hw, phase: (i * Math.PI * 2) / swirlCount });
  }

  const particleCount = 6;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const frac = 0.1 + (i / particleCount) * 0.75;
    const pY = liquidSurfaceY + (flaskBottomY - liquidSurfaceY) * frac;
    const hw = getHalfWidthAtY(pY) * 0.55;
    particles.push({
      y: pY,
      radius: hw,
      size: 1.2 + (i % 3) * 0.6,
      phase: (i * Math.PI * 2) / particleCount,
    });
  }

  useEffect(() => {
    if (!groupRef.current) return;

    if (!isStirring && intensityRef.current < 0.001) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      return;
    }

    if (animRef.current) return;

    const group = groupRef.current;

    const anim = new Konva.Animation((frame) => {
      const dt = Math.min(frame.timeDiff / 1000, 0.05);

      if (isStirring) {
        intensityRef.current = Math.min(1, intensityRef.current + dt * RAMP_UP_SPEED);
      } else {
        intensityRef.current *= Math.exp(-DECAY_SPEED * dt);
        if (intensityRef.current < 0.005) intensityRef.current = 0;
      }

      const intensity = intensityRef.current;

      if (intensity < 0.001) {
        group.opacity(0);
        anim.stop();
        animRef.current = null;
        return;
      }

      group.opacity(intensity);

      angleRef.current += speed * Math.PI * 0.8 * dt * intensity;
      const angle = angleRef.current;

      for (let i = 0; i < swirlCount; i++) {
        const swirl = group.findOne(`#swirl-${i}`);
        if (!swirl) continue;
        const sl = swirlLines[i];
        const pts = [];
        const steps = 16;
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const baseX = x - sl.halfW + t * sl.halfW * 2;
          const wave = Math.sin(angle + sl.phase + t * Math.PI * 2) * (3 + speed * 0.7) * intensity;
          pts.push(baseX, sl.y + wave);
        }
        swirl.points(pts);
      }

      for (let i = 0; i < particleCount; i++) {
        const circle = group.findOne(`#particle-${i}`);
        if (!circle) continue;
        const p = particles[i];
        const pAngle = angle + p.phase;
        circle.x(x + Math.cos(pAngle) * p.radius * intensity);
        circle.y(p.y + Math.sin(pAngle) * p.radius * 0.25 * intensity);
        circle.opacity((0.25 + Math.sin(pAngle) * 0.15) * intensity);
      }
    }, group.getLayer());

    anim.start();
    animRef.current = anim;

    return () => {
      anim.stop();
      animRef.current = null;
    };
  }, [isStirring, speed, x, liquidSurfaceY, flaskBottomY]);

  const highlightColor = lightenColor(liquidColor, 0.35);

  return (
    <Group ref={groupRef} opacity={0} listening={false}>
      {swirlLines.map((sl, i) => (
        <Line
          key={`swirl-${i}`}
          id={`swirl-${i}`}
          points={[x - sl.halfW, sl.y, x + sl.halfW, sl.y]}
          stroke={highlightColor}
          strokeWidth={1}
          opacity={0.3}
          lineCap="round"
          lineJoin="round"
        />
      ))}
      {particles.map((p, i) => (
        <Circle
          key={`particle-${i}`}
          id={`particle-${i}`}
          x={x}
          y={p.y}
          radius={p.size}
          fill={highlightColor}
          opacity={0.25}
        />
      ))}
    </Group>
  );
}

function parseHex(hex) {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

function lightenColor(hex, amount) {
  const [r, g, b] = parseHex(hex);
  const lr = Math.max(0, Math.min(255, Math.round(r + (255 - r) * amount)));
  const lg = Math.max(0, Math.min(255, Math.round(g + (255 - g) * amount)));
  const lb = Math.max(0, Math.min(255, Math.round(b + (255 - b) * amount)));
  return '#' + [lr, lg, lb].map(v => v.toString(16).padStart(2, '0')).join('');
}
