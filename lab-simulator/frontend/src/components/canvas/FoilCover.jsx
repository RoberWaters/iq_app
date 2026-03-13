import { Group, Line, Rect } from 'react-konva';

/**
 * Aluminum foil wrapping around the sides of an Erlenmeyer flask,
 * leaving a vertical window in the front center so the student can
 * see the liquid and precipitate inside.
 *
 * Always rendered — visibility controlled via opacity (react-konva rule).
 *
 * Props:
 *   x          — center X of the flask (same as Erlenmeyer x)
 *   y          — Y position of the flask mouth (same as Erlenmeyer y)
 *   neckWidth  — width of the flask neck opening (default 30)
 *   visible    — controls opacity (true/false)
 *   coverage   — fraction of flask width covered by foil, 0–1 (default 0.65)
 */
export default function FoilCover({ x, y, neckWidth = 30, visible = true, coverage = 0.65 }) {
  const bodyWidth = 140;
  const bodyHeight = 120;
  const neckHeight = 40;
  const halfNeck = neckWidth / 2;
  const halfBody = bodyWidth / 2;
  const pad = 3;

  // The uncovered window is (1 - coverage) of the width, centered
  const windowFrac = 1 - coverage; // 0.35 by default

  // Half-width of the flask at a given Y
  const halfWidthAt = (py) => {
    const neckBottom = y + neckHeight;
    if (py <= neckBottom) return halfNeck + pad;
    const bf = (py - neckBottom) / bodyHeight;
    return halfNeck + pad + (halfBody - halfNeck + pad) * Math.min(1, bf);
  };

  // Window half-width at a given Y (the gap in the center)
  const windowHalfAt = (py) => halfWidthAt(py) * windowFrac;

  // Key Y positions
  const yTop = y - 2;
  const yNeck = y + neckHeight;
  const yBottom = y + neckHeight + bodyHeight + pad;

  // ── Left foil panel outline ──
  // Outer edge follows the flask left side; inner edge follows the window left edge
  const leftOutline = [
    // outer edge (top to bottom)
    x - halfNeck - pad, yTop,
    x - halfNeck - pad, yNeck,
    x - halfBody - pad, yBottom,
    // inner edge (bottom to top)
    x - windowHalfAt(yBottom), yBottom,
    x - windowHalfAt(yNeck), yNeck,
    x - windowHalfAt(yTop), yTop,
  ];

  // ── Right foil panel outline ──
  const rightOutline = [
    // outer edge (top to bottom)
    x + halfNeck + pad, yTop,
    x + halfNeck + pad, yNeck,
    x + halfBody + pad, yBottom,
    // inner edge (bottom to top)
    x + windowHalfAt(yBottom), yBottom,
    x + windowHalfAt(yNeck), yNeck,
    x + windowHalfAt(yTop), yTop,
  ];

  // ── Crinkle lines (horizontal) — on each panel ──
  const numCrinkles = 6;
  const crinkleLinesLeft = [];
  const crinkleLinesRight = [];
  for (let i = 1; i <= numCrinkles; i++) {
    const frac = i / (numCrinkles + 1);
    const cy = yTop + (yBottom - yTop) * frac;
    const hw = halfWidthAt(cy);
    const wh = windowHalfAt(cy);

    // Left panel: from -hw to -wh
    const ptsL = [];
    const panelW = hw - wh;
    const segs = Math.max(3, Math.floor(panelW / 10));
    for (let s = 0; s <= segs; s++) {
      const sx = x - hw + panelW * (s / segs);
      const sy = cy + (s % 2 === 0 ? -1.5 : 1.5);
      ptsL.push(sx, sy);
    }
    crinkleLinesLeft.push(ptsL);

    // Right panel: from +wh to +hw
    const ptsR = [];
    for (let s = 0; s <= segs; s++) {
      const sx = x + wh + panelW * (s / segs);
      const sy = cy + (s % 2 === 0 ? -1.5 : 1.5);
      ptsR.push(sx, sy);
    }
    crinkleLinesRight.push(ptsR);
  }

  // ── Vertical crinkle lines — one per panel ──
  const vertCrinkles = [];
  // Left panel — one line at ~middle of left panel
  for (const side of [-1, 1]) {
    const pts = [];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const vy = yTop + 6 + (yBottom - yTop - 12) * (s / steps);
      const hw = halfWidthAt(vy);
      const wh = windowHalfAt(vy);
      const mid = (hw + wh) / 2; // midpoint of panel
      const vx = x + side * mid;
      pts.push(vx + (s % 2 === 0 ? -1 : 1), vy);
    }
    if (pts.length >= 4) vertCrinkles.push(pts);
  }

  return (
    <Group opacity={visible ? 1 : 0}>
      {/* Left foil panel */}
      <Line
        points={leftOutline}
        closed
        fill="#C0C0C0"
        opacity={0.82}
        stroke="#A8A8A8"
        strokeWidth={1.5}
        lineJoin="round"
      />

      {/* Right foil panel */}
      <Line
        points={rightOutline}
        closed
        fill="#C0C0C0"
        opacity={0.82}
        stroke="#A8A8A8"
        strokeWidth={1.5}
        lineJoin="round"
      />

      {/* Left panel highlight */}
      <Line
        points={[
          x - halfBody + 10, yNeck + 10,
          x - halfBody + 10, yBottom - 14,
        ]}
        stroke="#D8D8D8"
        strokeWidth={4}
        opacity={0.35}
        lineCap="round"
      />

      {/* Right panel shadow */}
      <Line
        points={[
          x + halfBody - 10, yNeck + 10,
          x + halfBody - 10, yBottom - 14,
        ]}
        stroke="#A0A0A0"
        strokeWidth={3}
        opacity={0.25}
        lineCap="round"
      />

      {/* Horizontal crinkle lines — left */}
      {crinkleLinesLeft.map((pts, i) => (
        <Line
          key={`hcl-${i}`}
          points={pts}
          stroke="#B0B0B0"
          strokeWidth={0.8}
          opacity={0.55}
          lineCap="round"
          lineJoin="round"
        />
      ))}

      {/* Horizontal crinkle lines — right */}
      {crinkleLinesRight.map((pts, i) => (
        <Line
          key={`hcr-${i}`}
          points={pts}
          stroke="#B0B0B0"
          strokeWidth={0.8}
          opacity={0.55}
          lineCap="round"
          lineJoin="round"
        />
      ))}

      {/* Vertical crinkle lines */}
      {vertCrinkles.map((pts, i) => (
        <Line
          key={`vc-${i}`}
          points={pts}
          stroke="#A8A8A8"
          strokeWidth={0.6}
          opacity={0.35}
          lineCap="round"
          lineJoin="round"
        />
      ))}

      {/* Top edge — crinkled rim around mouth (both sides, gap in center) */}
      <Line
        points={[
          x - halfNeck - pad - 3, yTop,
          x - halfNeck + 2, yTop - 4,
          x - windowHalfAt(yTop) - 2, yTop - 2,
          x - windowHalfAt(yTop), yTop,
        ]}
        stroke="#A0A0A0"
        strokeWidth={1.5}
        lineCap="round"
        lineJoin="round"
      />
      <Line
        points={[
          x + windowHalfAt(yTop), yTop,
          x + windowHalfAt(yTop) + 2, yTop - 2,
          x + halfNeck - 2, yTop - 4,
          x + halfNeck + pad + 3, yTop,
        ]}
        stroke="#A0A0A0"
        strokeWidth={1.5}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  );
}
