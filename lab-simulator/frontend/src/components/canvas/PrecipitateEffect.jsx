import { Group, Circle } from 'react-konva';
import { useMemo } from 'react';

/**
 * Renders precipitate particles at the bottom of a flask area.
 * Uses a seeded pseudo-random distribution for consistency across renders.
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
  const particles = useMemo(() => {
    const result = [];
    const rng = seededRandom(42);

    layers.forEach((layer, layerIdx) => {
      const count = Math.round((layer.density || 0.5) * 30);
      const isGranular = layer.type === 'granular';
      const baseRadius = isGranular ? 3.5 : 2;

      for (let i = 0; i < count; i++) {
        // Particles concentrate at the bottom of the area
        const px = x - width / 2 + width * 0.1 + rng() * width * 0.8;
        const py = y + height * 0.6 + rng() * height * 0.35;
        const r = baseRadius + rng() * (isGranular ? 2 : 1);

        result.push({
          key: `p-${layerIdx}-${i}`,
          x: px,
          y: py,
          radius: r,
          fill: layer.color || '#FFFFFF',
          opacity: layer.opacity || 0.6,
        });
      }
    });

    return result;
  }, [x, y, width, height, layers]);

  return (
    <Group opacity={visible ? 1 : 0}>
      {particles.map((p) => (
        <Circle
          key={p.key}
          x={p.x}
          y={p.y}
          radius={p.radius}
          fill={p.fill}
          opacity={p.opacity}
        />
      ))}
    </Group>
  );
}
