import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Line, Text, Circle } from 'react-konva';
import GraduatedCylinder from './GraduatedCylinder';

export default function MeasurementBench({ width = 400, height = 450, currentVolume, maxVolume = 250, isFilling = false }) {
  // --- Animation loop (runs at ~60fps while filling) ---
  const [animTime, setAnimTime] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!isFilling) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }
    const animate = (ts) => {
      setAnimTime(ts * 0.001); // seconds
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isFilling]);

  // --- Layout constants ---
  const centerX = width / 2;
  const cylY = 80;
  const tubeHeight = 280;

  // Faucet geometry
  const faucetX = centerX;
  const faucetY = 18;
  const spoutY = 62;
  const nozzleTipY = spoutY + 14;

  // Stream endpoint — just above liquid surface
  const fillFraction = Math.min(1, Math.max(0, currentVolume / maxVolume));
  const liquidTopY = cylY + tubeHeight - fillFraction * tubeHeight;
  const streamEndY = Math.max(cylY + 8, liquidTopY - 3);
  const streamStartY = nozzleTipY + 1;
  const streamLen = Math.max(0, streamEndY - streamStartY);

  // --- Water stream shape (wavy polygon narrowing with gravity) ---
  const segs = 20;
  const startHW = 2.2; // half-width at nozzle exit
  const streamPts = [];
  const hlPts = []; // center highlight

  // Left edge going down
  for (let i = 0; i <= segs; i++) {
    const frac = i / segs;
    const sy = streamStartY + frac * streamLen;
    const hw = startHW * (1 - frac * 0.35);
    const wave = Math.sin(animTime * 9 - frac * 13) * 0.35 * (0.4 + frac * 0.6);
    streamPts.push(faucetX + wave - hw, sy);
    hlPts.push(faucetX + wave - 0.2, sy);
  }
  // Right edge going up
  for (let i = segs; i >= 0; i--) {
    const frac = i / segs;
    const sy = streamStartY + frac * streamLen;
    const hw = startHW * (1 - frac * 0.35);
    const wave = Math.sin(animTime * 9 - frac * 13) * 0.35 * (0.4 + frac * 0.6);
    streamPts.push(faucetX + wave + hw, sy);
  }

  // --- Splash droplets (5 always rendered, opacity-controlled) ---
  const drops = [0, 1, 2, 3, 4].map(i => {
    const phase = animTime * 4.5 + i * 1.26;
    const life = (phase % 1.4) / 1.4; // 0..1 lifecycle
    const angle = i * 1.25 + phase * 0.3;
    const dist = 3 + life * 13;
    const dx = Math.cos(angle) * dist;
    const dy = -Math.sin(life * Math.PI) * (7 + i * 2);
    return {
      x: faucetX + dx,
      y: streamEndY + dy,
      r: 1.0 + (1 - life) * 0.6,
      opacity: isFilling ? Math.max(0, 0.4 * (1 - life * life)) : 0,
    };
  });

  // --- Ripple rings (3 always rendered, opacity-controlled) ---
  const ripples = [0, 1, 2].map(i => {
    const phase = (animTime * 2.2 + i * 0.9) % 2.2;
    const radius = 2 + phase * 6;
    const opacity = isFilling ? Math.max(0, 0.3 * (1 - phase / 2.2)) : 0;
    return { radius, opacity };
  });

  // --- Micro-spray particles (3 tiny mist dots above impact) ---
  const spray = [0, 1, 2].map(i => {
    const phase = animTime * 6 + i * 2.1;
    const life = (phase % 0.9) / 0.9;
    const dx = Math.sin(phase * 1.8 + i) * (5 + life * 4);
    const dy = -life * 10 - 2;
    return {
      x: faucetX + dx,
      y: streamEndY + dy,
      r: 0.7,
      opacity: isFilling ? Math.max(0, 0.25 * (1 - life)) : 0,
    };
  });

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Bench surface */}
        <Rect x={0} y={height - 30} width={width} height={30} fill="#D1C7B7" />
        <Rect x={0} y={height - 30} width={width} height={4} fill="#BEB4A4" />

        {/* ======== FAUCET ======== */}
        {/* Wall pipe (horizontal) */}
        <Rect
          x={0} y={faucetY}
          width={faucetX - 8} height={10}
          fill="#A0AEC0" stroke="#718096" strokeWidth={1}
        />
        {/* Pipe chrome highlight */}
        <Rect
          x={10} y={faucetY + 1}
          width={faucetX - 20} height={2}
          fill="white" opacity={0.25}
        />

        {/* Vertical section */}
        <Rect
          x={faucetX - 8} y={faucetY}
          width={16} height={spoutY - faucetY + 8}
          fill="#A0AEC0" stroke="#718096" strokeWidth={1}
          cornerRadius={[0, 0, 3, 3]}
        />
        {/* Vertical chrome highlight */}
        <Rect
          x={faucetX - 5} y={faucetY + 2}
          width={2} height={spoutY - faucetY + 4}
          fill="white" opacity={0.18}
        />

        {/* Nozzle tip (tapered trapezoid) */}
        <Line
          points={[
            faucetX - 6, spoutY + 5,
            faucetX - 3.5, nozzleTipY,
            faucetX + 3.5, nozzleTipY,
            faucetX + 6, spoutY + 5,
          ]}
          closed fill="#8B95A5"
          stroke="#6B7B8B" strokeWidth={0.8}
        />

        {/* Handle (turns blue when open) */}
        <Rect
          x={faucetX + 10} y={faucetY + 5}
          width={22} height={6}
          fill={isFilling ? '#60A5FA' : '#718096'}
          cornerRadius={3}
        />
        {/* Handle highlight */}
        <Rect
          x={faucetX + 12} y={faucetY + 6}
          width={18} height={1.5}
          fill="white" opacity={0.2}
          cornerRadius={1}
        />

        {/* ======== WATER STREAM ======== */}
        {/* Water bead forming at nozzle */}
        <Circle
          x={faucetX} y={nozzleTipY + 1}
          radius={2.8}
          fill="#C0D0DA"
          opacity={isFilling ? 0.5 : 0}
        />

        {/* Stream body (wavy polygon, realistic near-clear color) */}
        <Line
          points={streamPts}
          closed
          fill="#BDD0DC"
          opacity={isFilling ? 0.55 : 0}
        />

        {/* Stream specular highlight (white center line) */}
        <Line
          points={hlPts}
          stroke="white"
          strokeWidth={0.9}
          opacity={isFilling ? 0.3 : 0}
          lineCap="round"
        />

        {/* Stream refraction edge (subtle dark line on one side) */}
        <Line
          points={streamPts.slice(0, (segs + 1) * 2)}
          stroke="#8EAAB8"
          strokeWidth={0.4}
          opacity={isFilling ? 0.2 : 0}
        />

        {/* ======== SPLASH EFFECTS ======== */}
        {/* Impact glow at water surface */}
        <Circle
          x={faucetX} y={streamEndY}
          radius={3.5}
          fill="white"
          opacity={isFilling ? 0.18 : 0}
        />

        {/* Splash droplets */}
        {drops.map((d, i) => (
          <Circle
            key={`drop-${i}`}
            x={d.x} y={d.y} radius={d.r}
            fill="#CDDBE4"
            opacity={d.opacity}
          />
        ))}

        {/* Micro-spray mist */}
        {spray.map((s, i) => (
          <Circle
            key={`spray-${i}`}
            x={s.x} y={s.y} radius={s.r}
            fill="white"
            opacity={s.opacity}
          />
        ))}

        {/* Ripple rings expanding from impact */}
        {ripples.map((r, i) => (
          <Circle
            key={`ripple-${i}`}
            x={faucetX} y={streamEndY + 1}
            radius={r.radius}
            stroke="#94B0BE"
            strokeWidth={0.7}
            opacity={r.opacity}
          />
        ))}

        {/* ======== GRADUATED CYLINDER ======== */}
        <GraduatedCylinder
          x={centerX}
          y={cylY}
          capacity={maxVolume}
          currentVolume={currentVolume}
          isFlowing={isFilling}
          animTime={animTime}
        />

        {/* Label */}
        <Text
          x={centerX - 60} y={height - 55}
          text={`Probeta ${maxVolume} mL`}
          fontSize={12} fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={120} align="center"
        />
      </Layer>
    </Stage>
  );
}
