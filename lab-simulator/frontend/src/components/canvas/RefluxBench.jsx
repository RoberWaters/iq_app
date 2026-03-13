import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Rect, Line, Circle, Text } from 'react-konva';
import Erlenmeyer from './Erlenmeyer';

/**
 * Canvas for Practice 2 reflux assembly.
 *
 * Shows a round-bottom flask (Erlenmeyer) whose fill level and color
 * evolve as assembly steps complete. When the condenser is on, a
 * vertical glass tube appears above the flask neck. During "reflux"
 * a heat shimmer effect pulses below the flask.
 *
 * react-konva rules:
 *   - No conditional rendering inside Layer — opacity toggle only.
 *   - All decorative elements always rendered.
 */
export default function RefluxBench({
  width = 500,
  height = 480,
  flaskState = {},
  isAnimating = false,
  currentAction = '',
}) {
  const {
    fillLevel = 0,
    containerColor = '#F8F8FF',
    condenserOn = false,
  } = flaskState;

  // Heat pulse animation during reflux
  const [heatPulse, setHeatPulse] = useState(0);
  const heatRaf = useRef(null);
  const heatStart = useRef(null);

  const isRefluxing = currentAction === 'reflux' && isAnimating;

  useEffect(() => {
    if (!isRefluxing) {
      if (heatRaf.current) cancelAnimationFrame(heatRaf.current);
      heatRaf.current = null;
      heatStart.current = null;
      return;
    }

    heatStart.current = null;
    let running = true;
    const animate = (ts) => {
      if (!running) return;
      if (!heatStart.current) heatStart.current = ts;
      const elapsed = (ts - heatStart.current) % 1200;
      const t = elapsed / 1200;
      setHeatPulse(Math.sin(t * Math.PI * 2) * 0.5 + 0.5);
      heatRaf.current = requestAnimationFrame(animate);
    };
    heatRaf.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      if (heatRaf.current) cancelAnimationFrame(heatRaf.current);
    };
  }, [isRefluxing]);

  // Layout
  const benchY = height - 24;
  const flaskX = width / 2;
  const flaskY = height * 0.52;

  // Condenser geometry (tube above flask neck)
  const condenserX = flaskX;
  const condenserTopY = flaskY - 220;
  const condenserBottomY = flaskY - 80;

  // Status label
  let statusText = '';
  if (currentAction === 'reflux' && isAnimating) statusText = 'Reflujo en curso...';
  else if (currentAction === 'cool' && isAnimating) statusText = 'Enfriando...';
  else if (currentAction === 'attach_condenser' && isAnimating) statusText = 'Instalando condensador...';
  else if (currentAction === 'add_indicator' && isAnimating) statusText = 'Añadiendo indicador...';
  else if (currentAction === 'weigh_and_transfer' && isAnimating) statusText = 'Transfiriendo...';
  else if (currentAction === 'add_reagent' && isAnimating) statusText = 'Agregando KOH...';

  // Heat flame colors pulse
  const flameAlpha = isRefluxing ? 0.15 + heatPulse * 0.25 : 0;
  const heatWaveAlpha = isRefluxing ? 0.08 + heatPulse * 0.12 : 0;

  return (
    <Stage width={width} height={height}>
      <Layer>

        {/* Bench surface */}
        <Rect x={0} y={benchY} width={width} height={24} fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]} />

        {/* ── Heat / flame effect below flask (reflux) ─────────────────── */}
        <Circle
          x={flaskX} y={flaskY + 60}
          radius={50}
          fill="#FF8C00"
          opacity={flameAlpha}
        />
        <Circle
          x={flaskX} y={flaskY + 45}
          radius={36}
          fill="#FFA500"
          opacity={flameAlpha * 0.7}
        />

        {/* Heat wave shimmer rings */}
        <Circle x={flaskX} y={flaskY + 10} radius={70} stroke="#FF6B00" strokeWidth={2} opacity={heatWaveAlpha} />
        <Circle x={flaskX} y={flaskY + 10} radius={80} stroke="#FF8C00" strokeWidth={1.5} opacity={heatWaveAlpha * 0.6} />

        {/* ── Flask ─────────────────────────────────────────────────────── */}
        <Erlenmeyer
          x={flaskX}
          y={flaskY}
          liquidColor={containerColor}
          fillLevel={fillLevel}
        />

        {/* ── Condenser (Allihn-style glass tube above flask neck) ──────── */}
        {/* Outer glass jacket */}
        <Rect
          x={condenserX - 14}
          y={condenserTopY}
          width={28}
          height={condenserBottomY - condenserTopY}
          fill="#D6EAF8"
          stroke="#8BA8B8"
          strokeWidth={1.5}
          cornerRadius={5}
          opacity={condenserOn ? 0.85 : 0}
        />
        {/* Inner tube */}
        <Rect
          x={condenserX - 6}
          y={condenserTopY + 4}
          width={12}
          height={condenserBottomY - condenserTopY - 8}
          fill="#EBF5FB"
          stroke="#A9CCE3"
          strokeWidth={1}
          cornerRadius={3}
          opacity={condenserOn ? 0.9 : 0}
        />
        {/* Glass highlight */}
        <Rect
          x={condenserX - 12}
          y={condenserTopY + 4}
          width={4}
          height={condenserBottomY - condenserTopY - 8}
          fill="white"
          opacity={condenserOn ? 0.25 : 0}
          cornerRadius={2}
        />
        {/* Top cap */}
        <Rect
          x={condenserX - 8}
          y={condenserTopY - 10}
          width={16}
          height={14}
          fill="#8BA8B8"
          cornerRadius={3}
          opacity={condenserOn ? 0.9 : 0}
        />
        {/* Water inlet/outlet lines */}
        <Line
          points={[condenserX - 14, condenserTopY + 30, condenserX - 26, condenserTopY + 30]}
          stroke="#5DADE2"
          strokeWidth={3}
          opacity={condenserOn ? 0.8 : 0}
        />
        <Line
          points={[condenserX + 14, condenserBottomY - 30, condenserX + 26, condenserBottomY - 30]}
          stroke="#5DADE2"
          strokeWidth={3}
          opacity={condenserOn ? 0.8 : 0}
        />
        <Text
          x={condenserX - 42} y={condenserTopY + 24}
          text="H₂O"
          fontSize={9} fill="#2E86C1"
          fontFamily="IBM Plex Sans"
          opacity={condenserOn ? 0.85 : 0}
        />
        {/* Condenser label */}
        <Text
          x={condenserX + 16} y={(condenserTopY + condenserBottomY) / 2 - 6}
          text="Condensador"
          fontSize={9} fill="#5D6D7E"
          fontFamily="IBM Plex Sans"
          opacity={condenserOn ? 0.7 : 0}
        />

        {/* ── Status text ───────────────────────────────────────────────── */}
        <Text
          x={width / 2 - 120} y={14}
          text={statusText}
          fontSize={11}
          fill={isAnimating ? '#F59E0B' : '#64748B'}
          fontFamily="IBM Plex Sans"
          fontStyle="bold"
          width={240} align="center"
          opacity={statusText ? 1 : 0}
        />

        {/* ── Flask label ───────────────────────────────────────────────── */}
        <Text
          x={flaskX - 60} y={benchY - 20}
          text={flaskState.label || 'Matraz de saponificación'}
          fontSize={9.5} fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={120} align="center"
        />

      </Layer>
    </Stage>
  );
}
