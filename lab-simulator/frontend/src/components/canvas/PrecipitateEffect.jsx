import { Group, Circle, Line } from 'react-konva';
import { useMemo, useEffect, useRef } from 'react';
import Konva from 'konva';

/**
 * Renders precipitate as an irregular mound settled at the very bottom of a flask.
 *
 * When `isStirring` is true, particles disperse upward through the liquid.
 * When stirring stops, particles settle back gradually (~2 s) and the
 * mound fades back in — simulating sedimentation.
 *
 * react-konva rules:
 *   - Always rendered, opacity-toggled (never conditional)
 *   - Konva.Animation destroyed on cleanup
 */

const RAMP_UP_SPEED = 1.8;   // dispersal 0→1 in ~0.6 s
const SETTLE_SPEED = 0.8;    // dispersal 1→0 in ~2.5 s (exponential)

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function PrecipitateEffect({
  x, y, width, height, layers = [], visible = true,
  isStirring = false, stirSpeed = 3,
}) {
  const groupRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);
  const dispersalRef = useRef(0); // 0 = settled, 1 = fully dispersed

  const shapes = useMemo(() => {
    const result = [];
    const rng = seededRandom(42);
    let stackOffset = 0;

    const flaskBottomY = y + height;

    layers.forEach((layer, layerIdx) => {
      const density = layer.density || 0.5;
      const isGranular = layer.type === 'granular';

      const moundW = width * (isGranular ? 0.65 : 0.50) * Math.min(1, density + 0.3);
      const moundH = height * (isGranular ? 0.14 : 0.10) * Math.min(1, density + 0.3);
      const moundCX = x;
      const moundBY = flaskBottomY - stackOffset;

      const steps = 20;
      const domePoints = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = moundCX - moundW / 2 + t * moundW;
        const baseSine = Math.sin(t * Math.PI);
        const noise = (rng() - 0.5) * 0.35;
        const edgeFade = Math.sin(t * Math.PI);
        const py = moundBY - moundH * (baseSine + noise * edgeFade);
        domePoints.push(px, Math.min(py, moundBY));
      }
      domePoints.push(moundCX + moundW / 2, moundBY);
      domePoints.push(moundCX - moundW / 2, moundBY);

      result.push({
        key: `mound-${layerIdx}`,
        type: 'mound',
        points: domePoints,
        fill: layer.color || '#FFFFFF',
        opacity: layer.opacity || 0.6,
      });

      const texCount = Math.round(density * (isGranular ? 18 : 10));
      for (let i = 0; i < texCount; i++) {
        const t = 0.05 + rng() * 0.9;
        const px = moundCX - moundW * 0.55 + t * moundW * 1.1;
        const surfaceY = moundBY - moundH * Math.sin(t * Math.PI);
        const scatter = rng();
        const py = scatter < 0.7
          ? surfaceY + rng() * moundH * 0.3
          : surfaceY - rng() * moundH * 0.6;
        const r = isGranular ? 1.8 + rng() * 2.2 : 1.2 + rng() * 1.4;
        const opMult = 0.6 + rng() * 0.4;

        const restX = px;
        const restY = Math.min(Math.max(py, moundBY - moundH * 1.8), moundBY - 1);
        const orbitRadius = width * (0.15 + rng() * 0.3);
        const orbitPhase = rng() * Math.PI * 2;
        const floatFrac = 0.15 + rng() * 0.65;
        const dispersedY = y + height * (1 - floatFrac);

        result.push({
          key: `tex-${layerIdx}-${i}`,
          type: 'circle',
          x: restX,
          y: restY,
          restX,
          restY,
          dispersedY,
          orbitRadius,
          orbitPhase,
          radius: r,
          fill: layer.color || '#FFFFFF',
          opacity: (layer.opacity || 0.6) * opMult,
          baseOpacity: (layer.opacity || 0.6) * opMult,
        });
      }

      stackOffset += moundH * 0.5;
    });

    return result;
  }, [x, y, width, height, layers]);

  // Animation — handles both dispersal and settling
  useEffect(() => {
    if (!groupRef.current || shapes.length === 0) return;

    // If not stirring AND already settled, nothing to do
    if (!isStirring && dispersalRef.current < 0.001) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      return;
    }

    // Already running — the isStirring change will be picked up by the loop
    if (animRef.current) return;

    const group = groupRef.current;

    const anim = new Konva.Animation((frame) => {
      const dt = Math.min(frame.timeDiff / 1000, 0.05);

      // Ramp dispersal up or settle it down
      if (isStirring) {
        dispersalRef.current = Math.min(1, dispersalRef.current + dt * RAMP_UP_SPEED);
      } else {
        dispersalRef.current *= Math.exp(-SETTLE_SPEED * dt);
        if (dispersalRef.current < 0.005) {
          dispersalRef.current = 0;
        }
      }

      const d = dispersalRef.current;

      if (d < 0.001) {
        // Fully settled — reset all positions and stop
        shapes.forEach((s) => {
          const node = group.findOne(`#${s.key}`);
          if (!node) return;
          if (s.type === 'mound') {
            node.opacity(s.opacity);
          } else {
            node.x(s.restX);
            node.y(s.restY);
            node.opacity(s.opacity);
          }
        });
        anim.stop();
        animRef.current = null;
        return;
      }

      // Keep angle advancing (slower during settling for natural look)
      angleRef.current += stirSpeed * Math.PI * 0.6 * dt * d;
      const angle = angleRef.current;

      shapes.forEach((s) => {
        const node = group.findOne(`#${s.key}`);
        if (!node) return;

        if (s.type === 'mound') {
          // Mound fades out proportionally to dispersal
          node.opacity(s.opacity * (1 - d * 0.75));
        } else {
          // Lerp position between rest and dispersed
          const dispX = x + Math.cos(angle + s.orbitPhase) * s.orbitRadius;
          const dispY = s.dispersedY + Math.sin(angle * 0.7 + s.orbitPhase) * 8;

          node.x(s.restX + (dispX - s.restX) * d);
          node.y(s.restY + (dispY - s.restY) * d);
          // Opacity: at d=0 use rest opacity, at d=1 use pulsing opacity
          const pulseOp = s.baseOpacity * (0.5 + Math.sin(angle + s.orbitPhase) * 0.2);
          node.opacity(s.opacity + (pulseOp - s.opacity) * d);
        }
      });
    }, group.getLayer());

    anim.start();
    animRef.current = anim;

    return () => {
      anim.stop();
      animRef.current = null;
    };
  }, [isStirring, stirSpeed, shapes, x]);

  return (
    <Group ref={groupRef} opacity={visible ? 1 : 0}>
      {shapes.map((s) =>
        s.type === 'mound' ? (
          <Line
            key={s.key}
            id={s.key}
            points={s.points}
            closed
            fill={s.fill}
            opacity={s.opacity}
          />
        ) : (
          <Circle
            key={s.key}
            id={s.key}
            x={s.x}
            y={s.y}
            radius={s.radius}
            fill={s.fill}
            opacity={s.opacity}
          />
        )
      )}
    </Group>
  );
}
