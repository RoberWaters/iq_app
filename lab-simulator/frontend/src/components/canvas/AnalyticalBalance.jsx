import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Rect, Line, Circle, Text } from 'react-konva';

/**
 * Interactive analytical balance with drag-and-drop samples.
 *
 * Samples sit on a shelf at the left. The student drags one onto the
 * weighing pan. Once placed, the pan dips with a spring animation and
 * the display stabilizes. The sample can be dragged off (back to shelf)
 * and replaced — mass is preserved by the parent.
 *
 * Props:
 *   width, height        — canvas size
 *   samples              — [{id, label, color}]
 *   activeSampleId       — which sample is on the pan (null = empty)
 *   mass                 — current mass to display (g)
 *   confirmed            — disable interactions after confirm
 *   onPlaceSample(id)    — called when a sample is dropped on the pan
 *   onRemoveSample()     — called when the sample is dragged off
 *
 * react-konva rules:
 *   - No conditional rendering inside Layer — always render, toggle opacity
 *   - setState deferred from Konva handlers via setTimeout
 *   - getStage() wrapped in try-catch
 *   - Hit areas use rgba(0,0,0,0.001), not "transparent"
 */

const SNAP_DISTANCE = 70;

function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}

function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch { /* ignore */ }
}

export default function AnalyticalBalance({
  width = 500,
  height = 370,
  samples = [],
  activeSampleId = null,
  mass = 0,
  confirmed = false,
  onPlaceSample,
  onRemoveSample,
}) {
  // ── Pan spring animation ──────────────────────────────────────────────────
  const [panOffset, setPanOffset] = useState(0);
  const panRaf = useRef(null);
  const prevActive = useRef(activeSampleId);

  useEffect(() => {
    const wasOn = !!prevActive.current;
    const isOn = !!activeSampleId;
    prevActive.current = activeSampleId;
    if (wasOn === isOn) return;

    const dir = isOn ? 1 : -1;
    const maxDisp = 12;
    const restOffset = isOn ? 2 : 0;
    const duration = 900;
    let start = null;
    let running = true;

    const frame = (ts) => {
      if (!running) return;
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const elastic = easeOutElastic(t);
      if (dir === 1) {
        setPanOffset(maxDisp * (1 - elastic) + restOffset * elastic);
      } else {
        setPanOffset(-maxDisp * (1 - elastic));
      }
      if (t < 1) panRaf.current = requestAnimationFrame(frame);
    };

    if (panRaf.current) cancelAnimationFrame(panRaf.current);
    panRaf.current = requestAnimationFrame(frame);
    return () => { running = false; if (panRaf.current) cancelAnimationFrame(panRaf.current); };
  }, [activeSampleId]);

  // ── Display stabilization ─────────────────────────────────────────────────
  const [displayText, setDisplayText] = useState('0.0000');
  const [isStabilizing, setIsStabilizing] = useState(false);
  const stabRaf = useRef(null);
  const stabTimeout = useRef(null);
  const prevActiveForDisplay = useRef(activeSampleId);
  const prevMass = useRef(mass);

  useEffect(() => {
    const justPlaced = !prevActiveForDisplay.current && !!activeSampleId;
    const justRemoved = !!prevActiveForDisplay.current && !activeSampleId;
    const massChanged = prevMass.current !== mass && !!activeSampleId;
    prevActiveForDisplay.current = activeSampleId;
    prevMass.current = mass;

    if (stabRaf.current) cancelAnimationFrame(stabRaf.current);
    if (stabTimeout.current) clearTimeout(stabTimeout.current);

    if (!activeSampleId) {
      setDisplayText('0.0000');
      setIsStabilizing(justRemoved);
      if (justRemoved) {
        stabTimeout.current = setTimeout(() => setIsStabilizing(false), 300);
      }
      return;
    }

    const target = mass;
    const duration = justPlaced ? 1400 : massChanged ? 400 : 0;

    if (duration === 0) {
      setDisplayText(target.toFixed(4));
      return;
    }

    setIsStabilizing(true);
    let start = null;
    let running = true;

    const frame = (ts) => {
      if (!running) return;
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);

      if (justPlaced) {
        // Full stabilization: flutter then converge
        if (t < 0.5) {
          const noise = (Math.random() - 0.5) * 0.08 * (1 - t / 0.5);
          setDisplayText((target + noise).toFixed(4));
        } else {
          const ct = (t - 0.5) / 0.5;
          const noise = (Math.random() - 0.5) * 0.003 * (1 - ct);
          setDisplayText((target + noise).toFixed(4));
        }
      } else {
        // Brief adjust: small flutter
        const noise = (Math.random() - 0.5) * 0.004 * (1 - t);
        setDisplayText((target + noise).toFixed(4));
      }

      if (t < 1) {
        stabRaf.current = requestAnimationFrame(frame);
      } else {
        setDisplayText(target.toFixed(4));
        stabTimeout.current = setTimeout(() => setIsStabilizing(false), 100);
      }
    };

    stabRaf.current = requestAnimationFrame(frame);
    return () => {
      running = false;
      if (stabRaf.current) cancelAnimationFrame(stabRaf.current);
      if (stabTimeout.current) clearTimeout(stabTimeout.current);
    };
  }, [activeSampleId, mass]);

  // ── Drag proximity state ──────────────────────────────────────────────────
  const [nearPan, setNearPan] = useState(false);

  // ── Layout constants (responsive to canvas size) ─────────────────────────
  const benchY = height - 16;

  // Shelf
  const shelfX = 55;
  const shelfStartY = 70;
  const shelfGap = 72;

  // Balance — centered in right portion of canvas
  const balCX = Math.min(width * 0.62, width - 110);
  const bodyW = 200;
  const bodyH = 75;
  const bodyX = balCX - bodyW / 2;
  const bodyY = height - 34 - bodyH;

  const chamberW = 155;
  const chamberH = 110;
  const chamberX = balCX - chamberW / 2;
  const chamberY = bodyY - chamberH + 10;

  const panCX = balCX;
  const panBaseY = bodyY - 8;
  const panY = panBaseY + panOffset;
  const panRadius = 35;

  const displayW = 105;
  const displayH = 30;
  const displayX = balCX - displayW / 2;
  const displayY = bodyY + 14;

  // ── Home positions for each sample ────────────────────────────────────────
  const getHomePos = (sampleId) => {
    if (sampleId === activeSampleId) {
      return { x: panCX, y: panY - 6 };
    }
    const idx = samples.findIndex(s => s.id === sampleId);
    return { x: shelfX, y: shelfStartY + idx * shelfGap };
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragMove = (e, _sampleId) => {
    const pos = e.target.position();
    const dist = Math.hypot(pos.x - panCX, pos.y - panBaseY);
    setNearPan(dist < SNAP_DISTANCE);
  };

  const handleDragEnd = (e, sampleId) => {
    const pos = e.target.position();
    const dist = Math.hypot(pos.x - panCX, pos.y - panBaseY);

    setNearPan(false);

    if (sampleId === activeSampleId) {
      // Currently on pan — remove if dragged far enough
      if (dist > SNAP_DISTANCE) {
        const idx = samples.findIndex(s => s.id === sampleId);
        const shelfPos = { x: shelfX, y: shelfStartY + idx * shelfGap };
        e.target.position(shelfPos);
        e.target.getLayer()?.batchDraw();
        if (onRemoveSample) setTimeout(onRemoveSample, 0);
      } else {
        // Snap back to pan
        e.target.position({ x: panCX, y: panY - 6 });
        e.target.getLayer()?.batchDraw();
      }
    } else if (!activeSampleId && dist < SNAP_DISTANCE) {
      // Place on pan
      e.target.position({ x: panCX, y: panY - 6 });
      e.target.getLayer()?.batchDraw();
      if (onPlaceSample) setTimeout(() => onPlaceSample(sampleId), 0);
    } else {
      // Snap back to shelf
      const home = getHomePos(sampleId);
      e.target.position(home);
      e.target.getLayer()?.batchDraw();
    }
  };

  // ── Leveling bubble ───────────────────────────────────────────────────────
  const bubbleX = bodyX + 22;
  const bubbleY = bodyY + bodyH - 14;

  return (
    <Stage width={width} height={height}>
      <Layer>

        {/* ── Bench surface ──────────────────────────────────────────── */}
        <Rect x={0} y={benchY} width={width} height={16}
          fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]} />

        {/* ══════════════════════════════════════════════════════════════
            SHELF AREA (left side)
        ══════════════════════════════════════════════════════════════ */}

        {/* Shelf background */}
        <Rect x={8} y={40} width={100} height={samples.length * shelfGap + 16}
          fill="#F1F5F9" stroke="#CBD5E1" strokeWidth={1}
          cornerRadius={6} />

        {/* Shelf title */}
        <Text x={8} y={20} text="Muestras"
          fontSize={10} fill="#475569" fontFamily="IBM Plex Sans"
          fontStyle="bold" width={100} align="center" />

        {/* Shelf dividers */}
        {samples.map((_s, i) => (
          <Line
            key={`shelf-div-${i}`}
            points={[16, shelfStartY + i * shelfGap - 12, 100, shelfStartY + i * shelfGap - 12]}
            stroke="#E2E8F0" strokeWidth={1}
            opacity={i > 0 ? 1 : 0}
          />
        ))}

        {/* ══════════════════════════════════════════════════════════════
            BALANCE (right side)
        ══════════════════════════════════════════════════════════════ */}

        {/* ── Balance body (main housing) ────────────────────────────── */}
        <Rect x={bodyX} y={bodyY} width={bodyW} height={bodyH}
          fill="#F0F0F0" stroke="#C0C0C0" strokeWidth={1.5}
          cornerRadius={[6, 6, 4, 4]} />
        {/* Top bevel */}
        <Rect x={bodyX + 2} y={bodyY} width={bodyW - 4} height={4}
          fill="#FAFAFA" cornerRadius={[6, 6, 0, 0]} />
        {/* Bottom trim */}
        <Rect x={bodyX + 4} y={bodyY + bodyH - 5} width={bodyW - 8} height={4}
          fill="#D0D0D0" cornerRadius={2} />

        {/* ── Feet ───────────────────────────────────────────────────── */}
        <Circle x={bodyX + 16} y={bodyY + bodyH + 2} radius={5} fill="#888" />
        <Circle x={bodyX + bodyW - 16} y={bodyY + bodyH + 2} radius={5} fill="#888" />
        <Circle x={bodyX + 16} y={bodyY + bodyH + 2} radius={3} fill="#666" />
        <Circle x={bodyX + bodyW - 16} y={bodyY + bodyH + 2} radius={3} fill="#666" />

        {/* ── Glass draft shield ─────────────────────────────────────── */}
        {/* Back panel */}
        <Rect x={chamberX + 4} y={chamberY} width={chamberW - 8} height={chamberH}
          fill="#E8F0F4" opacity={0.25} stroke="#B0C4D0" strokeWidth={1}
          cornerRadius={[4, 4, 0, 0]} />
        {/* Left panel */}
        <Rect x={chamberX} y={chamberY} width={6} height={chamberH}
          fill="#D0E0E8" opacity={0.5} stroke="#A0B8C4" strokeWidth={0.8}
          cornerRadius={[3, 0, 0, 0]} />
        {/* Right panel */}
        <Rect x={chamberX + chamberW - 6} y={chamberY} width={6} height={chamberH}
          fill="#D0E0E8" opacity={0.5} stroke="#A0B8C4" strokeWidth={0.8}
          cornerRadius={[0, 3, 0, 0]} />
        {/* Top rail */}
        <Rect x={chamberX} y={chamberY} width={chamberW} height={5}
          fill="#C0D0D8" stroke="#A0B8C4" strokeWidth={0.8}
          cornerRadius={[4, 4, 0, 0]} />
        {/* Glass reflections */}
        <Rect x={chamberX + 12} y={chamberY + 10} width={2} height={chamberH - 25}
          fill="white" opacity={0.35} cornerRadius={1} />
        <Rect x={chamberX + chamberW - 14} y={chamberY + 10} width={2} height={chamberH - 25}
          fill="white" opacity={0.25} cornerRadius={1} />

        {/* ── Chamber floor ──────────────────────────────────────────── */}
        <Rect x={chamberX + 8} y={panBaseY + 3} width={chamberW - 16} height={3}
          fill="#E8E8E8" cornerRadius={1} />

        {/* ── Pan support pillar ─────────────────────────────────────── */}
        <Rect x={panCX - 4} y={panY + 3} width={8}
          height={Math.max(1, panBaseY - panY + 4)}
          fill="#C8C8C8" stroke="#B0B0B0" strokeWidth={0.8}
          cornerRadius={2} />

        {/* ── Weighing pan ───────────────────────────────────────────── */}
        {/* Shadow */}
        <Circle x={panCX + 2} y={panY + 4} radius={panRadius}
          fill="#000000" opacity={0.06} />
        {/* Pan base */}
        <Circle x={panCX} y={panY} radius={panRadius}
          fill="#E0E0E0" stroke="#B8B8B8" strokeWidth={1.5} />
        {/* Pan surface */}
        <Circle x={panCX} y={panY} radius={panRadius - 4}
          fill="#ECECEC" />
        {/* Pan rim detail */}
        <Circle x={panCX} y={panY} radius={panRadius - 1}
          stroke="#D0D0D0" strokeWidth={0.5} fill="rgba(0,0,0,0)" />
        {/* Pan metallic highlight (crescent) */}
        <Line
          points={[
            panCX - 24, panY - 26,
            panCX - 14, panY - 30,
            panCX - 4, panY - 28,
            panCX - 12, panY - 22,
          ]}
          closed fill="white" opacity={0.35}
        />

        {/* ── Blue glow ring (proximity feedback) ────────────────────── */}
        <Circle x={panCX} y={panBaseY} radius={panRadius + 18}
          fill="#3B82F6" opacity={nearPan ? 0.14 : 0} listening={false} />

        {/* ══════════════════════════════════════════════════════════════
            DRAGGABLE SAMPLES (always rendered, opacity-toggled)
        ══════════════════════════════════════════════════════════════ */}
        {samples.map((sample, i) => {
          const isOnPan = sample.id === activeSampleId;
          const homeX = isOnPan ? panCX : shelfX;
          const homeY = isOnPan ? panY - 6 : shelfStartY + i * shelfGap;
          const canDrag = !confirmed && (
            (isOnPan) ||
            (!activeSampleId)
          );
          // If another sample is on pan, this one is not draggable, show dimmed
          const isDimmed = !!activeSampleId && !isOnPan;

          return (
            <Group
              key={sample.id}
              x={homeX}
              y={homeY}
              draggable={canDrag}
              onDragMove={(e) => handleDragMove(e, sample.id)}
              onDragEnd={(e) => handleDragEnd(e, sample.id)}
              onMouseEnter={(e) => canDrag && setCursor(e, 'grab')}
              onMouseLeave={(e) => setCursor(e, 'default')}
              onDragStart={(e) => setCursor(e, 'grabbing')}
              opacity={isDimmed ? 0.4 : 1}
            >
              {/* Hit area */}
              <Rect x={-30} y={-24} width={60} height={55}
                fill="rgba(0,0,0,0.001)" />

              {/* Weighing paper / boat */}
              <Line
                points={[-24, 8, -20, -4, 20, -4, 24, 8]}
                closed fill="#FAFAF5" stroke="#D0D0C0" strokeWidth={1}
              />
              {/* Paper shadow */}
              <Line
                points={[-22, 8, 22, 8]}
                stroke="#E0E0D8" strokeWidth={0.8}
              />

              {/* Fat/grease sample blob */}
              <Line
                points={[
                  -12, 2,
                  -8, -6,
                  -2, -9,
                  6, -8,
                  11, -4,
                  13, 2,
                  8, 6,
                  -2, 7,
                  -10, 5,
                ]}
                closed
                fill={sample.color || '#F5E6C8'}
                stroke="#C8B090"
                strokeWidth={0.8}
              />
              {/* Fat highlight */}
              <Line
                points={[-4, -6, 2, -8, 6, -5, 2, -3]}
                closed fill="white" opacity={0.3}
              />

              {/* Label */}
              <Text x={-28} y={14} text={sample.label}
                fontSize={10} fill={isOnPan ? '#1D4ED8' : '#64748B'}
                fontFamily="IBM Plex Sans" fontStyle={isOnPan ? 'bold' : 'normal'}
                width={56} align="center" />

              {/* "On balance" badge — shown when sample is on pan */}
              <Rect x={-20} y={26} width={40} height={13}
                fill="#DBEAFE" cornerRadius={3} stroke="#93C5FD" strokeWidth={0.5}
                opacity={isOnPan ? 1 : 0} />
              <Text x={-20} y={28} text="En plato"
                fontSize={7.5} fill="#2563EB" fontFamily="IBM Plex Sans"
                width={40} align="center"
                opacity={isOnPan ? 1 : 0} />
            </Group>
          );
        })}

        {/* ── Digital display ────────────────────────────────────────── */}
        {/* Display housing */}
        <Rect x={displayX - 4} y={displayY - 4} width={displayW + 8} height={displayH + 8}
          fill="#D8D8D8" cornerRadius={4} stroke="#B0B0B0" strokeWidth={1} />
        {/* Display screen */}
        <Rect x={displayX} y={displayY} width={displayW} height={displayH}
          fill="#1A1A2E" cornerRadius={2} />
        {/* Backlight */}
        <Rect x={displayX + 1} y={displayY + 1} width={displayW - 2} height={displayH - 2}
          fill={isStabilizing ? '#0A2A1A' : '#0A2818'} cornerRadius={2} />
        {/* Value */}
        <Text
          x={displayX + 4} y={displayY + 4}
          text={displayText}
          fontSize={16} fontFamily="IBM Plex Mono"
          fill={isStabilizing ? '#40E870' : '#30D860'}
          width={displayW - 22} align="right"
        />
        {/* Unit */}
        <Text
          x={displayX + displayW - 18} y={displayY + displayH - 12}
          text="g" fontSize={9} fontFamily="IBM Plex Mono"
          fill="#30D860" opacity={0.7}
        />
        {/* Stability dot */}
        <Circle
          x={displayX + 9} y={displayY + displayH / 2}
          radius={3}
          fill={isStabilizing ? '#40E870' : '#30D860'}
          opacity={isStabilizing ? 0.5 : 0.9}
        />

        {/* ── Control buttons ────────────────────────────────────────── */}
        <Rect x={bodyX + bodyW - 62} y={bodyY + bodyH - 22} width={24} height={12}
          fill="#4A4A5A" cornerRadius={3} stroke="#3A3A4A" strokeWidth={1} />
        <Text x={bodyX + bodyW - 62} y={bodyY + bodyH - 20} text="TARE"
          fontSize={6} fill="#C0C0D0" fontFamily="IBM Plex Mono"
          width={24} align="center" />
        <Rect x={bodyX + bodyW - 34} y={bodyY + bodyH - 22} width={24} height={12}
          fill="#4A4A5A" cornerRadius={3} stroke="#3A3A4A" strokeWidth={1} />
        <Text x={bodyX + bodyW - 34} y={bodyY + bodyH - 20} text="ON"
          fontSize={6} fill="#80D080" fontFamily="IBM Plex Mono"
          width={24} align="center" />

        {/* ── Leveling bubble ────────────────────────────────────────── */}
        <Circle x={bubbleX} y={bubbleY} radius={8}
          fill="#F8F8F0" stroke="#B0B0A0" strokeWidth={1} />
        <Line points={[bubbleX - 4, bubbleY, bubbleX + 4, bubbleY]}
          stroke="#D0D0C8" strokeWidth={0.5} />
        <Line points={[bubbleX, bubbleY - 4, bubbleX, bubbleY + 4]}
          stroke="#D0D0C8" strokeWidth={0.5} />
        <Circle x={bubbleX + 0.3} y={bubbleY - 0.2} radius={3}
          fill="#A8D8A0" opacity={0.7} stroke="#80B878" strokeWidth={0.5} />

        {/* ── Brand text ─────────────────────────────────────────────── */}
        <Text x={bodyX + 14} y={bodyY + 8} text="ANALYTICAL"
          fontSize={6.5} fill="#A0A0A0" fontFamily="IBM Plex Sans"
          fontStyle="bold" letterSpacing={1.5} />
        <Text x={bodyX + 14} y={bodyY + 17} text="BALANCE"
          fontSize={6} fill="#B0B0B0" fontFamily="IBM Plex Sans"
          letterSpacing={1} />
        <Text x={bodyX + 14} y={bodyY + 28} text="0.0001 g"
          fontSize={5.5} fill="#C0C0C0" fontFamily="IBM Plex Mono" />

        {/* ── Instruction hint ───────────────────────────────────────── */}
        <Text
          x={chamberX} y={chamberY - 18}
          text={
            confirmed ? 'Pesada registrada'
            : activeSampleId ? 'Arrastra fuera para retirar'
            : 'Arrastra una muestra al plato'
          }
          fontSize={9.5} fontFamily="IBM Plex Sans"
          fill={confirmed ? '#16A34A' : '#3B82F6'}
          width={chamberW} align="center"
          opacity={0.85}
        />

      </Layer>
    </Stage>
  );
}
