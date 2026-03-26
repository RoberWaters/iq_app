import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Rect, Line, Text, Circle } from 'react-konva';
import GraduatedCylinder from './GraduatedCylinder';
import Erlenmeyer from './Erlenmeyer';
import PrecipitateEffect from './PrecipitateEffect';
import PourAnimation from './PourAnimation';
import FoilCover from './FoilCover';

/**
 * Interactive bottle-to-graduated-cylinder-to-flask measurement canvas.
 *
 * Phase 1: Hold the BOTTLE to pour water into the graduated cylinder.
 * Phase 2: Hold the CYLINDER to pour water into the Erlenmeyer flask.
 *
 * Both interactions are press-and-hold on the canvas objects.
 * Tilt animations ramp smoothly via requestAnimationFrame.
 *
 * react-konva rules enforced:
 *   - No conditional rendering inside Layer — opacity toggle only.
 *   - setState deferred in Konva event handlers via setTimeout(fn, 0).
 *   - getStage() wrapped in try-catch.
 *   - Hit areas use "rgba(0,0,0,0.001)" fill.
 */

function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch { /* ignore */ }
}

export default function BottleBench({
  width = 600,
  height = 480,
  currentVolume = 0,
  maxVolume = 25,
  isFilling = false,
  liquidColor = '#DCE8F5',
  sampleName = 'Agua\nDestilada',
  // Flask props
  showFlask = false,
  flaskFillLevel = 0.08,
  flaskLiquidColor = '#DCE8F5',
  // Drain (cylinder → flask) props
  isDraining = false,
  // Canvas interaction callbacks
  onBottlePress = null,
  onCylinderPress = null,
  // Bottle appearance
  bottleStyle = 'clear',
  // Precipitate (grows during drain for current step)
  precipitate = null,
  precipitateProgress = 0,
  // Existing precipitate from previous steps (always visible)
  existingPrecipitate = null,
  // Foil cover
  foilCovered = false,
}) {
  // ── Bottle style (clear vs amber) ────────────────────────────
  const isAmber = bottleStyle === 'amber';
  const bottleGlass = isAmber ? '#8B5E3C' : '#F0F4F8';
  const bottleStroke = isAmber ? '#6B3A1F' : '#94A3B8';
  const bottleHighlight = isAmber ? '#C4875A' : 'white';
  const bottleHighlightOp = isAmber ? 0.25 : 0.3;
  const bottleCapFill = isAmber ? '#B22222' : '#1E40AF';
  const bottleCapStrokeFill = isAmber ? '#8B1A1A' : '#1E3A8A';
  const bottleLiquidOp = isAmber ? 0.25 : 0.55;
  const bottleNeckLiquidOp = isAmber ? 0.2 : 0.4;
  // ── Layout (shifts left when flask is visible) ─────────────────
  const benchY = height - 20;

  const bottleStandX = showFlask ? 88 : 120;
  const cylX = showFlask ? 235 : 320;
  const flaskCenterX = 420;

  const cylTubeW = maxVolume <= 10 ? 28 : maxVolume >= 100 ? 44 : 36;
  const cylTubeH = showFlask ? 210 : 240;
  const cylBaseH = 10;
  const cylY = benchY - cylTubeH - cylBaseH;
  const cylSpoutY = cylY;

  // ── Bottle geometry (dropper bottle when amber) ───────────────
  const bottleBodyW = isAmber ? 34 : 50;
  const bottleBodyH = isAmber ? 70 : 130;
  const bottleNeckW = isAmber ? 10 : 18;
  const bottleNeckH = isAmber ? 14 : 34;
  const bottleCapH = isAmber ? 0 : 10;
  const bottleBulbH = 20; // rubber dropper bulb height (amber only)
  const bottleTopH = isAmber ? bottleBulbH : bottleCapH;
  const bottleTotalH = bottleBodyH + bottleNeckH + bottleTopH;

  const bottleBaseY = benchY - 4;
  const bottleBodyTop = bottleBaseY - bottleBodyH;
  const bottleNeckTop = bottleBodyTop - bottleNeckH;
  const bottleLiquidTop = bottleBodyTop + (isAmber ? 10 : 16);
  const bottleLiquidH = bottleBaseY - bottleLiquidTop - 4;

  // ── Flask geometry (matches Erlenmeyer component defaults) ────
  const flaskTotalH = 160; // 120 body + 40 neck
  const flaskMouthY = benchY - flaskTotalH;

  // ── Bottle tilt animation (bottle → cylinder) ─────────────────
  const [tiltProgress, setTiltProgress] = useState(0);
  const [animTime, setAnimTime] = useState(0);
  const tiltRef = useRef(0);
  const rafRef = useRef(null);
  const directionRef = useRef('idle');

  useEffect(() => {
    let lastTs = null;
    let running = true;
    const RAMP_UP_MS = 800;
    const RAMP_DOWN_MS = 700;

    directionRef.current = isFilling ? 'up' : 'down';

    const frame = (ts) => {
      if (!running) return;
      const dt = lastTs !== null ? Math.min(ts - lastTs, 50) : 0;
      lastTs = ts;

      const current = tiltRef.current;
      const dir = directionRef.current;

      if (dir === 'up' && current < 1) {
        tiltRef.current = Math.min(1, current + dt / RAMP_UP_MS);
      } else if (dir === 'down' && current > 0) {
        tiltRef.current = Math.max(0, current - dt / RAMP_DOWN_MS);
      }

      const t = tiltRef.current;
      const eased = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      setTiltProgress(eased);
      setAnimTime(ts * 0.001);

      if ((dir === 'up' && tiltRef.current < 1) || (dir === 'down' && tiltRef.current > 0)) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const target = isFilling ? 1 : 0;
    if (tiltRef.current !== target) {
      rafRef.current = requestAnimationFrame(frame);
    } else if (isFilling) {
      const pourFrame = (ts) => {
        if (!running) return;
        setAnimTime(ts * 0.001);
        rafRef.current = requestAnimationFrame(pourFrame);
      };
      rafRef.current = requestAnimationFrame(pourFrame);
    }

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isFilling]);

  // ── Cylinder tilt animation (cylinder → flask) ────────────────
  const [cylTiltProgress, setCylTiltProgress] = useState(0);
  const cylTiltRef = useRef(0);
  const cylRafRef = useRef(null);
  const cylDirRef = useRef('idle');

  useEffect(() => {
    let lastTs = null;
    let running = true;
    const RAMP_UP_MS = 600;
    const RAMP_DOWN_MS = 500;

    cylDirRef.current = isDraining ? 'up' : 'down';

    const frame = (ts) => {
      if (!running) return;
      const dt = lastTs !== null ? Math.min(ts - lastTs, 50) : 0;
      lastTs = ts;

      const current = cylTiltRef.current;
      const dir = cylDirRef.current;

      if (dir === 'up' && current < 1) {
        cylTiltRef.current = Math.min(1, current + dt / RAMP_UP_MS);
      } else if (dir === 'down' && current > 0) {
        cylTiltRef.current = Math.max(0, current - dt / RAMP_DOWN_MS);
      }

      const t = cylTiltRef.current;
      const eased = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      setCylTiltProgress(eased);
      setAnimTime(ts * 0.001);

      if ((dir === 'up' && cylTiltRef.current < 1) || (dir === 'down' && cylTiltRef.current > 0)) {
        cylRafRef.current = requestAnimationFrame(frame);
      } else {
        cylRafRef.current = null;
      }
    };

    if (cylRafRef.current) cancelAnimationFrame(cylRafRef.current);
    const target = isDraining ? 1 : 0;
    if (cylTiltRef.current !== target) {
      cylRafRef.current = requestAnimationFrame(frame);
    } else if (isDraining) {
      const holdFrame = (ts) => {
        if (!running) return;
        setAnimTime(ts * 0.001);
        cylRafRef.current = requestAnimationFrame(holdFrame);
      };
      cylRafRef.current = requestAnimationFrame(holdFrame);
    }

    return () => {
      running = false;
      if (cylRafRef.current) cancelAnimationFrame(cylRafRef.current);
    };
  }, [isDraining]);

  // ── Derived values ─────────────────────────────────────────────

  // Bottle tilt (bottle → cylinder)
  const tiltDeg = tiltProgress * 100;
  const tiltRad = tiltDeg * Math.PI / 180;

  const targetSpoutX = cylX - cylTubeW / 2 - 5;
  const targetSpoutY = cylSpoutY;
  const targetPivotX = targetSpoutX - bottleTotalH * Math.sin(tiltRad);
  const targetPivotY = targetSpoutY + bottleTotalH * Math.cos(tiltRad);

  const bottlePivotX = bottleStandX + tiltProgress * (targetPivotX - bottleStandX);
  const bottlePivotY = bottleBaseY + tiltProgress * (targetPivotY - bottleBaseY);

  const bottleSpoutX = bottlePivotX + bottleTotalH * Math.sin(tiltRad);
  const bottleSpoutY = bottlePivotY - bottleTotalH * Math.cos(tiltRad);

  // Cylinder tilt for pour-to-flask
  const cylMaxTiltDeg = 100;
  const cylTiltDeg = cylTiltProgress * cylMaxTiltDeg;
  const cylTiltRad = cylTiltDeg * Math.PI / 180;
  const cylTotalH = cylTubeH + cylBaseH;

  // Slide cylinder toward flask during tilt so spout reaches flask mouth
  const maxCylTiltRad = cylMaxTiltDeg * Math.PI / 180;
  const spoutGoalX = flaskCenterX - 25;
  const spoutGoalY = flaskMouthY - 18;
  const cylSlideX = spoutGoalX - cylX - cylTotalH * Math.sin(maxCylTiltRad);
  const cylSlideY = spoutGoalY - benchY + cylTotalH * Math.cos(maxCylTiltRad);
  const cylAnimX = cylX + cylTiltProgress * cylSlideX;
  const cylAnimY = benchY + cylTiltProgress * cylSlideY;

  // Cylinder spout world position when tilted + slid
  const cylSpoutWorldX = cylAnimX + cylTotalH * Math.sin(cylTiltRad);
  const cylSpoutWorldY = cylAnimY - cylTotalH * Math.cos(cylTiltRad);

  // Pour streams
  const bottlePourActive = tiltProgress > 0.55 && isFilling;
  const cylPourActive = isDraining && cylTiltProgress > 0.5 && currentVolume > 0;

  // Bottle interactive (not while filling or draining)
  const bottleListening = !isDraining && cylTiltProgress < 0.01;
  // Cylinder interactive (has volume and not currently filling from bottle)
  const cylinderListening = currentVolume > 0 || isDraining;

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Bench surface */}
        <Rect
          x={0} y={benchY} width={width} height={20}
          fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]}
        />

        {/* ── FLASK (Erlenmeyer component, always rendered) ───── */}
        <Group opacity={showFlask ? 1 : 0}>
          <Erlenmeyer
            x={flaskCenterX}
            y={flaskMouthY}
            fillLevel={flaskFillLevel}
            liquidColor={flaskLiquidColor}
          />

          {/* Precipitate mound — existing from previous steps + growing from current drain */}
          <PrecipitateEffect
            x={flaskCenterX}
            y={flaskMouthY + 40}
            width={140 * 0.7}
            height={120}
            layers={[
              // Existing precipitate from previous steps (always at full values)
              ...(existingPrecipitate ? [{
                type: existingPrecipitate.type || 'granular',
                color: existingPrecipitate.color || '#FFFFFF',
                opacity: existingPrecipitate.opacity || 0.8,
                density: existingPrecipitate.density || 0.65,
              }] : []),
              // New precipitate growing during current drain
              ...(precipitate && precipitateProgress > 0 ? [{
                type: precipitate.type || 'granular',
                color: precipitate.color || '#FFFFFF',
                opacity: (precipitate.opacity || 0.8) * Math.min(1, precipitateProgress),
                density: (0.65) * Math.min(1, precipitateProgress),
              }] : []),
            ]}
            visible={existingPrecipitate != null || (precipitate != null && precipitateProgress > 0)}
          />

          {/* Aluminum foil cover (always rendered, opacity-toggled) */}
          <FoilCover
            x={flaskCenterX}
            y={flaskMouthY}
            visible={foilCovered}
          />

          {/* Flask label */}
          <Text
            x={flaskCenterX - 50}
            y={benchY + 3}
            width={100}
            text="Matraz 100 mL"
            fontSize={10}
            fill="#64748B"
            fontFamily="IBM Plex Sans"
            align="center"
          />

          {/* Flask content label */}
          <Text
            x={flaskCenterX - 35}
            y={benchY - 25}
            width={70}
            text="10 mL\nmuestra"
            fontSize={9}
            fill="#64748B"
            fontFamily="IBM Plex Sans"
            align="center"
            opacity={0.7}
            lineHeight={1.2}
          />
        </Group>

        {/* ── BOTTLE (upright, hidden while tilting) ─────────────── */}
        <Group
          opacity={tiltProgress > 0.01 ? 0 : 1}
          listening={bottleListening}
          onPointerDown={() => setTimeout(() => onBottlePress?.(), 0)}
          onMouseEnter={(e) => setCursor(e, 'grab')}
          onMouseLeave={(e) => setCursor(e, 'default')}
        >
          {/* Body */}
          <Rect
            x={bottleStandX - bottleBodyW / 2}
            y={bottleBodyTop}
            width={bottleBodyW}
            height={bottleBodyH}
            fill={bottleGlass}
            stroke={bottleStroke}
            strokeWidth={1.2}
            cornerRadius={isAmber ? [2, 2, 6, 6] : [2, 2, 4, 4]}
          />

          {/* Liquid inside */}
          <Rect
            x={bottleStandX - bottleBodyW / 2 + 3}
            y={bottleLiquidTop}
            width={bottleBodyW - 6}
            height={bottleLiquidH}
            fill={liquidColor}
            opacity={bottleLiquidOp}
            cornerRadius={[0, 0, 3, 3]}
          />

          {/* Liquid meniscus */}
          <Line
            points={[
              bottleStandX - bottleBodyW / 2 + 3, bottleLiquidTop,
              bottleStandX + bottleBodyW / 2 - 3, bottleLiquidTop,
            ]}
            stroke={isAmber ? '#6B3A1F' : '#8EAAB8'} strokeWidth={0.8} opacity={0.4}
          />

          {/* Glass highlights */}
          <Rect
            x={bottleStandX - bottleBodyW / 2 + 4}
            y={bottleBodyTop + 8}
            width={isAmber ? 3 : 4} height={bottleBodyH - 16}
            fill={bottleHighlight} opacity={bottleHighlightOp} cornerRadius={2}
          />
          <Rect
            x={bottleStandX + bottleBodyW / 2 - (isAmber ? 8 : 10)}
            y={bottleBodyTop + 12}
            width={2} height={bottleBodyH - 24}
            fill={bottleHighlight} opacity={bottleHighlightOp * 0.5} cornerRadius={1}
          />

          {/* Label */}
          <Rect
            x={bottleStandX - (isAmber ? 14 : 22)}
            y={bottleBodyTop + bottleBodyH * (isAmber ? 0.22 : 0.28)}
            width={isAmber ? 28 : 44} height={isAmber ? 28 : 38}
            fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={0.5} cornerRadius={2}
          />
          <Text
            x={bottleStandX - (isAmber ? 14 : 22)}
            y={bottleBodyTop + bottleBodyH * (isAmber ? 0.22 : 0.28) + (isAmber ? 4 : 6)}
            width={isAmber ? 28 : 44}
            text={sampleName}
            fontSize={isAmber ? 7 : 8} fill="#334155"
            fontFamily="IBM Plex Sans" align="center" lineHeight={1.3}
          />

          {/* Neck (trapezoid shoulder) */}
          <Line
            points={[
              bottleStandX - bottleBodyW / 2, bottleBodyTop,
              bottleStandX - bottleNeckW / 2, bottleNeckTop,
              bottleStandX + bottleNeckW / 2, bottleNeckTop,
              bottleStandX + bottleBodyW / 2, bottleBodyTop,
            ]}
            closed fill={bottleGlass} stroke={bottleStroke} strokeWidth={1.2}
          />

          {/* Liquid in neck */}
          <Rect
            x={bottleStandX - bottleNeckW / 2 + 2}
            y={bottleNeckTop + 3}
            width={bottleNeckW - 4} height={bottleNeckH - 3}
            fill={liquidColor} opacity={bottleNeckLiquidOp}
          />

          {/* Neck rim */}
          <Rect
            x={bottleStandX - bottleNeckW / 2 - 1}
            y={bottleNeckTop - 2}
            width={bottleNeckW + 2} height={4}
            fill={isAmber ? '#A0734D' : '#E2E8F0'} stroke={bottleStroke} strokeWidth={0.8} cornerRadius={2}
          />

          {/* === Standard screw cap (clear style) === */}
          <Rect
            x={bottleStandX - bottleNeckW / 2 - 2}
            y={bottleNeckTop - bottleCapH - 3}
            width={bottleNeckW + 4} height={Math.max(1, bottleCapH)}
            fill={bottleCapFill} stroke={bottleCapStrokeFill} strokeWidth={1}
            cornerRadius={[3, 3, 0, 0]}
            opacity={isAmber ? 0 : 1}
          />
          <Rect
            x={bottleStandX - bottleNeckW / 2}
            y={bottleNeckTop - bottleCapH - 1}
            width={bottleNeckW} height={3}
            fill="white" cornerRadius={1}
            opacity={isAmber ? 0 : 0.2}
          />

          {/* === Rubber dropper bulb (amber style) === */}
          {/* Glass dropper tube */}
          <Rect
            x={bottleStandX - 1}
            y={bottleNeckTop - bottleBulbH + 4}
            width={2} height={bottleBulbH + bottleNeckH - 2}
            fill="#C8B89A" stroke="#A09070" strokeWidth={0.4}
            opacity={isAmber ? 0.6 : 0}
          />
          {/* Rubber collar (connects bulb to neck) */}
          <Rect
            x={bottleStandX - bottleNeckW / 2 - 1}
            y={bottleNeckTop - 5}
            width={bottleNeckW + 2} height={6}
            fill="#1A1A1A"
            cornerRadius={1}
            opacity={isAmber ? 1 : 0}
          />
          {/* Rubber bulb body */}
          <Rect
            x={bottleStandX - 7}
            y={bottleNeckTop - bottleBulbH + 2}
            width={14} height={bottleBulbH - 6}
            fill="#2D2D2D" stroke="#1A1A1A" strokeWidth={0.6}
            cornerRadius={[7, 7, 4, 4]}
            opacity={isAmber ? 1 : 0}
          />
          {/* Bulb highlight */}
          <Rect
            x={bottleStandX - 4}
            y={bottleNeckTop - bottleBulbH + 5}
            width={3} height={bottleBulbH - 12}
            fill="#555" cornerRadius={2}
            opacity={isAmber ? 0.3 : 0}
          />
          {/* Bulb top (rounded) */}
          <Circle
            x={bottleStandX}
            y={bottleNeckTop - bottleBulbH + 4}
            radius={6}
            fill="#333333"
            opacity={isAmber ? 1 : 0}
          />
        </Group>

        {/* ── BOTTLE (tilting, visible only while pouring to cylinder) ── */}
        <Group
          x={bottlePivotX}
          y={bottlePivotY}
          rotation={tiltDeg}
          opacity={tiltProgress > 0.01 ? 1 : 0}
          listening={false}
        >
          {/* Body */}
          <Rect
            x={-bottleBodyW / 2}
            y={-bottleBodyH}
            width={bottleBodyW}
            height={bottleBodyH}
            fill={bottleGlass}
            stroke={bottleStroke}
            strokeWidth={1.2}
            cornerRadius={isAmber ? [2, 2, 6, 6] : [2, 2, 4, 4]}
          />

          {/* Liquid inside */}
          <Rect
            x={-bottleBodyW / 2 + 3}
            y={-bottleBodyH + (isAmber ? 10 : 16)}
            width={bottleBodyW - 6}
            height={bottleLiquidH}
            fill={liquidColor}
            opacity={bottleLiquidOp}
            cornerRadius={[0, 0, 3, 3]}
          />

          {/* Glass highlights */}
          <Rect
            x={-bottleBodyW / 2 + 4}
            y={-bottleBodyH + 8}
            width={isAmber ? 3 : 4} height={bottleBodyH - 16}
            fill={bottleHighlight} opacity={bottleHighlightOp} cornerRadius={2}
          />

          {/* Label */}
          <Rect
            x={-(isAmber ? 14 : 22)}
            y={-bottleBodyH + bottleBodyH * (isAmber ? 0.22 : 0.28)}
            width={isAmber ? 28 : 44} height={isAmber ? 28 : 38}
            fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={0.5} cornerRadius={2}
          />
          <Text
            x={-(isAmber ? 14 : 22)}
            y={-bottleBodyH + bottleBodyH * (isAmber ? 0.22 : 0.28) + (isAmber ? 4 : 6)}
            width={isAmber ? 28 : 44}
            text={sampleName}
            fontSize={isAmber ? 7 : 8} fill="#334155"
            fontFamily="IBM Plex Sans" align="center" lineHeight={1.3}
          />

          {/* Neck (trapezoid shoulder) */}
          <Line
            points={[
              -bottleBodyW / 2, -bottleBodyH,
              -bottleNeckW / 2, -bottleBodyH - bottleNeckH,
              bottleNeckW / 2, -bottleBodyH - bottleNeckH,
              bottleBodyW / 2, -bottleBodyH,
            ]}
            closed fill={bottleGlass} stroke={bottleStroke} strokeWidth={1.2}
          />

          {/* Liquid in neck */}
          <Rect
            x={-bottleNeckW / 2 + 2}
            y={-bottleBodyH - bottleNeckH + 3}
            width={bottleNeckW - 4} height={bottleNeckH - 3}
            fill={liquidColor} opacity={bottleNeckLiquidOp}
          />

          {/* Neck rim */}
          <Rect
            x={-bottleNeckW / 2 - 1}
            y={-bottleBodyH - bottleNeckH - 2}
            width={bottleNeckW + 2} height={4}
            fill={isAmber ? '#A0734D' : '#E2E8F0'} stroke={bottleStroke} strokeWidth={0.8} cornerRadius={2}
          />

          {/* === Rubber dropper (amber tilting) === */}
          {/* Glass dropper tube */}
          <Rect
            x={-1}
            y={-bottleTotalH + 4}
            width={2} height={bottleTopH + bottleNeckH - 2}
            fill="#C8B89A" stroke="#A09070" strokeWidth={0.4}
            opacity={isAmber ? 0.6 : 0}
          />
          {/* Rubber collar */}
          <Rect
            x={-bottleNeckW / 2 - 1}
            y={-bottleBodyH - bottleNeckH - 5}
            width={bottleNeckW + 2} height={6}
            fill="#1A1A1A" cornerRadius={1}
            opacity={isAmber ? 1 : 0}
          />
          {/* Rubber bulb body */}
          <Rect
            x={-7}
            y={-bottleTotalH + 2}
            width={14} height={bottleBulbH - 6}
            fill="#2D2D2D" stroke="#1A1A1A" strokeWidth={0.6}
            cornerRadius={[7, 7, 4, 4]}
            opacity={isAmber ? 1 : 0}
          />
          {/* Bulb top */}
          <Circle
            x={0}
            y={-bottleTotalH + 4}
            radius={6}
            fill="#333333"
            opacity={isAmber ? 1 : 0}
          />
        </Group>

        {/* Cap sitting on bench when bottle is tilting (clear style only) */}
        <Rect
          x={bottleStandX + bottleBodyW / 2 + 10}
          y={benchY - 12}
          width={bottleNeckW + 4} height={Math.max(1, bottleCapH)}
          fill={bottleCapFill} stroke={bottleCapStrokeFill} strokeWidth={1}
          cornerRadius={[3, 3, 0, 0]}
          opacity={tiltProgress > 0.01 && !isAmber ? 0.9 : 0}
          listening={false}
        />

        {/* ── POUR STREAM: bottle → cylinder ──────────────────── */}
        <PourAnimation
          fromX={bottleSpoutX}
          fromY={bottleSpoutY}
          toX={cylX}
          toY={cylSpoutY + 5}
          isPouring={bottlePourActive}
          color={liquidColor}
        />

        {/* ── GRADUATED CYLINDER (in rotated group for tilt) ──── */}
        <Group
          x={cylAnimX} y={cylAnimY} rotation={cylTiltDeg}
          listening={cylinderListening}
          onPointerDown={() => setTimeout(() => onCylinderPress?.(), 0)}
          onMouseEnter={(e) => { if (currentVolume > 0) setCursor(e, 'grab'); }}
          onMouseLeave={(e) => setCursor(e, 'default')}
        >
          <GraduatedCylinder
            x={0}
            y={-(cylTubeH + 10)}
            capacity={maxVolume}
            currentVolume={currentVolume}
            liquidColor={liquidColor}
            isFlowing={isFilling}
            animTime={animTime}
            tubeWidth={cylTubeW}
            tubeHeight={cylTubeH}
            baseWidth={50}
          />
        </Group>

        {/* ── POUR STREAM: cylinder → flask ───────────────────── */}
        <PourAnimation
          fromX={cylSpoutWorldX}
          fromY={cylSpoutWorldY}
          toX={flaskCenterX}
          toY={flaskMouthY + 5}
          isPouring={cylPourActive}
          color={liquidColor}
        />

        {/* Labels */}
        <Text
          x={cylX - 50} y={cylY - 18}
          text={`Probeta ${maxVolume} mL`}
          fontSize={11} fill="#64748B"
          fontFamily="IBM Plex Sans" width={100} align="center"
          opacity={cylTiltProgress > 0.3 ? 0 : 1}
        />
        <Text
          x={bottleStandX - 45} y={benchY + 2}
          text={sampleName.replace('\n', ' ')}
          fontSize={11} fill="#64748B"
          fontFamily="IBM Plex Sans" width={90} align="center"
          opacity={1}
        />
      </Layer>
    </Stage>
  );
}
