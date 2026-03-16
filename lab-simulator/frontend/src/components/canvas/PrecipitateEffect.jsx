import { Group, Circle, Line } from 'react-konva';
import { useMemo } from 'react';

/**
 * Renders precipitate as an irregular mound settled at the very bottom of a flask.
 *
 * Each layer renders a bumpy dome polygon plus scattered texture circles.
 * The shape is intentionally imperfect — not a smooth sine, but a noisy hill.
 *
 * Props:
 *   x, y       — center-x, top-y of the liquid area
 *   width      — width of the liquid area
 *   height     — height of the liquid area
 *   layers     — array of { type, color, opacity, density }
 *   visible    — controls opacity (always rendered, never conditionally)
 */

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function PrecipitateEffect({
  x, y, width, height, layers = [], visible = true,
}) {
  const shapes = useMemo(() => {
    const result = [];
    const rng = seededRandom(42);
    let stackOffset = 0;

    // The very bottom of the flask body
    const flaskBottomY = y + height;

    layers.forEach((layer, layerIdx) => {
      const density = layer.density || 0.5;
      const isGranular = layer.type === 'granular';

      // Mound sits at the very bottom, width/height scale with density
      const moundW = width * (isGranular ? 0.65 : 0.50) * Math.min(1, density + 0.3);
      const moundH = height * (isGranular ? 0.14 : 0.10) * Math.min(1, density + 0.3);
      const moundCX = x;
      const moundBY = flaskBottomY - stackOffset;

      // Build irregular dome (sine + noise for bumpy look)
      const steps = 20;
      const domePoints = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = moundCX - moundW / 2 + t * moundW;
        // Base sine shape with random bumps
        const baseSine = Math.sin(t * Math.PI);
        const noise = (rng() - 0.5) * 0.35;
        // Taper edges to zero, bump interior
        const edgeFade = Math.sin(t * Math.PI); // 0 at edges, 1 at center
        const py = moundBY - moundH * (baseSine + noise * edgeFade);
        domePoints.push(px, Math.min(py, moundBY));
      }
      // Close at bottom
      domePoints.push(moundCX + moundW / 2, moundBY);
      domePoints.push(moundCX - moundW / 2, moundBY);

      result.push({
        key: `mound-${layerIdx}`,
        type: 'mound',
        points: domePoints,
        fill: layer.color || '#FFFFFF',
        opacity: layer.opacity || 0.6,
      });

      // Scatter texture circles — some on the mound, some slightly around it
      const texCount = Math.round(density * (isGranular ? 18 : 10));
      for (let i = 0; i < texCount; i++) {
        const t = 0.05 + rng() * 0.9;
        const px = moundCX - moundW * 0.55 + t * moundW * 1.1;
        // Mostly on/near the mound surface, a few scattered higher
        const surfaceY = moundBY - moundH * Math.sin(t * Math.PI);
        const scatter = rng();
        // 70% on/below surface, 30% slightly above for dispersed look
        const py = scatter < 0.7
          ? surfaceY + rng() * moundH * 0.3
          : surfaceY - rng() * moundH * 0.6;
        const r = isGranular ? 1.8 + rng() * 2.2 : 1.2 + rng() * 1.4;

        const opMult = 0.6 + rng() * 0.4;

        result.push({
          key: `tex-${layerIdx}-${i}`,
          type: 'circle',
          x: px,
          y: Math.min(Math.max(py, moundBY - moundH * 1.8), moundBY - 1),
          radius: r,
          fill: layer.color || '#FFFFFF',
          opacity: (layer.opacity || 0.6) * opMult,
        });
      }

      stackOffset += moundH * 0.5;
    });

    return result;
  }, [x, y, width, height, layers]);

  return (
    <Group opacity={visible ? 1 : 0}>
      {shapes.map((s) =>
        s.type === 'mound' ? (
          <Line
            key={s.key}
            points={s.points}
            closed
            fill={s.fill}
            opacity={s.opacity}
          />
        ) : (
          <Circle
            key={s.key}
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
