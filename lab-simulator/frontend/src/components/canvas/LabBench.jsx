import { useCallback, useState, useEffect, useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import Burette from './Burette';
import Erlenmeyer from './Erlenmeyer';
import DropAnimation from './DropAnimation';
import PrecipitateEffect from './PrecipitateEffect';
import StirringEffect from './StirringEffect';
import IndicatorDiffusion from './IndicatorDiffusion';
import MagneticStirrer from './MagneticStirrer';
import StirBar from './StirBar';
import useTitration from '../../hooks/useTitration';
import useSimulatorStore from '../../store/useSimulatorStore';
import useTitrationStore from '../../store/useTitrationStore';
import { interpolateColorHSL } from '../../utils/colorInterpolation';

export default function LabBench({ width = 500, height = 650 }) {
  const { volumeAdded, maxBuretteVolume, currentColor, isDropping, progress } = useTitration();
  const { practiceConfig } = useSimulatorStore();
  const {
    stirrerOn, stirrerSpeed, stirBarInFlask,
    setStirBarInFlask, toggleStirrer, setStirrerSpeed,
  } = useTitrationStore();

  const titrationConfig = practiceConfig?.titration || {};

  // Configurable colors from practice config
  const buretteLiquidColor = titrationConfig.titrantColor || '#C8D8E8';
  const dropColor = titrationConfig.dropColor || '#F0F0F0';
  const flaskFillLevel = titrationConfig.flaskFillLevel || 0.44;

  // ── Localized vs uniform color mechanic with progressive mixing ─────────
  const isStirring = stirrerOn && stirBarInFlask;
  const [lastMixedColor, setLastMixedColor] = useState(() => currentColor);

  // Progressive mixing animation state
  const [mixingProgress, setMixingProgress] = useState(0); // 0 = unmixed, 1 = fully mixed
  const mixingRafRef = useRef(null);
  const mixingStartRef = useRef(null);
  const mixBaseColorRef = useRef(null);
  const mixTargetColorRef = useRef(null);
  const mixBaseSpotOpaRef = useRef(0);
  const prevIsStirringRef = useRef(isStirring);
  const MIXING_DURATION = 2200;

  useEffect(() => {
    const wasStirring = prevIsStirringRef.current;
    prevIsStirringRef.current = isStirring;

    if (isStirring && !wasStirring && volumeAdded > 0) {
      // Just turned ON — start progressive mixing
      mixBaseColorRef.current = lastMixedColor;
      mixTargetColorRef.current = currentColor;
      const baseSpot = currentColor !== lastMixedColor
        ? Math.min(0.7, 0.15 + progress * 0.5) : 0;
      mixBaseSpotOpaRef.current = baseSpot;
      mixingStartRef.current = performance.now();

      const tick = (now) => {
        const elapsed = now - mixingStartRef.current;
        const t = Math.min(1, elapsed / MIXING_DURATION);
        const eased = t * (2 - t); // easeOutQuad
        setMixingProgress(eased); // eslint-disable-line react-hooks/set-state-in-effect

        if (t < 1) {
          mixingRafRef.current = requestAnimationFrame(tick);
        } else {
          setMixingProgress(1); // eslint-disable-line react-hooks/set-state-in-effect
          setLastMixedColor(mixTargetColorRef.current); // eslint-disable-line react-hooks/set-state-in-effect
          mixingRafRef.current = null;
        }
      };
      if (mixingRafRef.current) cancelAnimationFrame(mixingRafRef.current);
      mixingRafRef.current = requestAnimationFrame(tick);
    } else if (isStirring && wasStirring) {
      // Already stirring — keep synced with new drops
      setLastMixedColor(currentColor); // eslint-disable-line react-hooks/set-state-in-effect
      setMixingProgress(1); // eslint-disable-line react-hooks/set-state-in-effect
    } else if (!isStirring && wasStirring) {
      // Turned OFF — stop animation, freeze current state
      if (mixingRafRef.current) cancelAnimationFrame(mixingRafRef.current);
      mixingRafRef.current = null;
      setMixingProgress(0); // eslint-disable-line react-hooks/set-state-in-effect
    }

    return () => {
      if (mixingRafRef.current) cancelAnimationFrame(mixingRafRef.current);
    };
  }, [isStirring, currentColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute displayed flask color: interpolate during mixing transition
  let flaskDisplayColor;
  if (isStirring && mixingProgress < 1 && mixBaseColorRef.current) {
    flaskDisplayColor = interpolateColorHSL(
      mixBaseColorRef.current, mixTargetColorRef.current, mixingProgress
    );
  } else if (isStirring) {
    flaskDisplayColor = currentColor;
  } else {
    flaskDisplayColor = lastMixedColor;
  }

  // Spot opacity: fades out during mixing transition
  const rawSpotOpacity = !isStirring && volumeAdded > 0 && currentColor !== lastMixedColor
    ? Math.min(0.7, 0.15 + progress * 0.5) : 0;
  const spotOpacity = isStirring && mixingProgress < 1 && mixBaseSpotOpaRef.current > 0
    ? mixBaseSpotOpaRef.current * (1 - mixingProgress)
    : rawSpotOpacity;

  // Precipitate layers — support static and dynamic (growing) layers
  const rawLayers = titrationConfig.precipitate?.layers || [];
  const precipitateLayers = rawLayers.map(layer => {
    if (layer.dynamic) {
      const scaledOpacity = layer.opacity * Math.min(1, progress);
      const scaledDensity = (layer.density || 0.5) * Math.min(1, progress);
      return { ...layer, opacity: scaledOpacity, density: scaledDensity };
    }
    return layer;
  });
  const hasPrecipitate = precipitateLayers.length > 0;

  const buretteX = width / 2;
  const buretteY = 30;
  const erlenmeyerX = width / 2;
  const erlenmeyerY = 360;

  // Erlenmeyer body dimensions (must match Erlenmeyer component)
  const bodyWidth = 140;
  const bodyHeight = 120;
  const neckHeight = 40;

  // Flask bottom = erlenmeyerY + neckHeight + bodyHeight
  const flaskBottomY = erlenmeyerY + neckHeight + bodyHeight;
  const stirrerY = flaskBottomY + 2;

  // Stir bar rest position (on the stirrer ceramic surface, to the left of the flask)
  const stirBarRestX = erlenmeyerX - 105;
  const stirBarRestY = stirrerY + 12;

  const handlePlaceBar = useCallback(() => setStirBarInFlask(true), [setStirBarInFlask]);
  const handleRemoveBar = useCallback(() => setStirBarInFlask(false), [setStirBarInFlask]);
  const handleSpeedUp = useCallback(() => setStirrerSpeed(Math.min(5, stirrerSpeed + 1)), [stirrerSpeed, setStirrerSpeed]);
  const handleSpeedDown = useCallback(() => setStirrerSpeed(Math.max(1, stirrerSpeed - 1)), [stirrerSpeed, setStirrerSpeed]);

  return (
    <div className="lab-bench-container">
      <Stage width={width} height={height}>
        <Layer>
          {/* Burette */}
          <Burette
            x={buretteX}
            y={buretteY}
            volumeAdded={volumeAdded}
            maxVolume={maxBuretteVolume}
            liquidColor={buretteLiquidColor}
          />

          {/* Drop animation */}
          <DropAnimation
            x={buretteX}
            startY={buretteY + 290}
            endY={erlenmeyerY - 20}
            isDropping={isDropping}
            color={dropColor}
          />

          {/* Magnetic stirrer plate (behind flask, with built-in controls) */}
          <MagneticStirrer
            x={erlenmeyerX}
            y={stirrerY}
            isOn={stirrerOn}
            speed={stirrerSpeed}
            stirBarInFlask={stirBarInFlask}
            onToggle={toggleStirrer}
            onSpeedUp={handleSpeedUp}
            onSpeedDown={handleSpeedDown}
          />

          {/* Erlenmeyer flask */}
          <Erlenmeyer
            x={erlenmeyerX}
            y={erlenmeyerY}
            liquidColor={flaskDisplayColor}
            fillLevel={flaskFillLevel}
            isStirring={isStirring}
            stirSpeed={stirrerSpeed}
          />

          {/* Indicator/titrant dye diffusing inside liquid when stirrer OFF */}
          <IndicatorDiffusion
            x={erlenmeyerX}
            y={erlenmeyerY}
            neckHeight={neckHeight}
            bodyHeight={bodyHeight}
            bodyWidth={bodyWidth}
            fillLevel={flaskFillLevel}
            color={currentColor}
            opacity={spotOpacity}
          />

          {/* Liquid stirring effect (vortex + swirl lines when stirrer is on) */}
          <StirringEffect
            x={erlenmeyerX}
            y={erlenmeyerY}
            bodyWidth={bodyWidth}
            bodyHeight={bodyHeight}
            neckHeight={neckHeight}
            fillLevel={flaskFillLevel}
            isStirring={isStirring}
            speed={stirrerSpeed}
            liquidColor={flaskDisplayColor}
          />

          {/* Precipitate inside flask — always rendered, opacity-controlled */}
          <PrecipitateEffect
            x={erlenmeyerX}
            y={erlenmeyerY + neckHeight}
            width={bodyWidth * 0.7}
            height={bodyHeight}
            layers={precipitateLayers}
            visible={hasPrecipitate}
            isStirring={isStirring}
            stirSpeed={stirrerSpeed}
          />

          {/* Stir bar (draggable in/out of flask, spins when active) */}
          <StirBar
            flaskCenterX={erlenmeyerX}
            flaskMouthY={erlenmeyerY}
            flaskNeckHeight={neckHeight}
            flaskBodyHeight={bodyHeight}
            restX={stirBarRestX}
            restY={stirBarRestY}
            isInFlask={stirBarInFlask}
            stirrerOn={stirrerOn}
            speed={stirrerSpeed}
            onPlaceInFlask={handlePlaceBar}
            onRemoveFromFlask={handleRemoveBar}
          />
        </Layer>
      </Stage>
    </div>
  );
}
