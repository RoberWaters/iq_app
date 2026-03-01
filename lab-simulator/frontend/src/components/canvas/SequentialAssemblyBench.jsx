import { Stage, Layer, Rect, Text } from 'react-konva';
import Erlenmeyer from './Erlenmeyer';
import PrecipitateEffect from './PrecipitateEffect';
import FoilCover from './FoilCover';
import PourAnimation from './PourAnimation';

/**
 * Canvas for sequential assembly (P4 Volhard and similar).
 * Shows a central flask whose visual state evolves step by step.
 *
 * Always renders all child nodes — uses opacity toggle for visibility
 * (react-konva critical rule: never conditionally render inside Layer).
 */
export default function SequentialAssemblyBench({
  width = 500,
  height = 480,
  flaskState = {},
  isAnimating = false,
  currentStepIndex = 0,
  currentAction = '',
}) {
  const benchY = height - 20;
  const flaskX = width / 2;
  const flaskY = 140;

  const fillLevel = flaskState.fillLevel || 0;
  const containerColor = flaskState.containerColor || '#F8F8FF';
  const label = flaskState.label || '';
  const precipitate = flaskState.precipitate;
  const foilCovered = flaskState.foilCovered || false;

  // Precipitate layers for PrecipitateEffect
  const precipitateLayers = precipitate
    ? [{ type: precipitate.type, color: precipitate.color, opacity: precipitate.opacity, density: 0.6 }]
    : [];

  // Pour animation visible during pour-type actions
  const isPouringAction = isAnimating && (
    currentAction === 'add_reagent' ||
    currentAction === 'measure_and_transfer' ||
    currentAction === 'transfer'
  );

  // Erlenmeyer body dimensions (must match Erlenmeyer component)
  const bodyWidth = 140;
  const bodyHeight = 120;
  const neckHeight = 40;

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Bench surface */}
        <Rect
          x={0} y={benchY} width={width} height={20}
          fill="#E2E8F0" cornerRadius={[4, 4, 0, 0]}
        />

        {/* Flask (Erlenmeyer) */}
        <Erlenmeyer
          x={flaskX}
          y={flaskY}
          liquidColor={containerColor}
          fillLevel={fillLevel}
        />

        {/* Precipitate inside flask — always rendered, opacity-controlled */}
        <PrecipitateEffect
          x={flaskX}
          y={flaskY + neckHeight}
          width={bodyWidth * 0.8}
          height={bodyHeight * 0.8}
          layers={precipitateLayers}
          visible={precipitateLayers.length > 0}
        />

        {/* Foil cover — always rendered, opacity-controlled */}
        <FoilCover
          x={flaskX}
          y={flaskY}
          neckWidth={30}
          visible={foilCovered}
        />

        {/* Pour animation from above into flask */}
        <PourAnimation
          fromX={flaskX - 60}
          fromY={80}
          toX={flaskX}
          toY={flaskY + 5}
          isPouring={isPouringAction}
          color="#D0D8E0"
        />

        {/* Label below flask */}
        <Text
          x={flaskX - 80}
          y={benchY - 28}
          text={label}
          fontSize={11}
          fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={160}
          align="center"
        />

        {/* Step indicator text */}
        <Text
          x={10}
          y={12}
          text={`Paso ${currentStepIndex + 1}`}
          fontSize={14}
          fill="#2563EB"
          fontFamily="IBM Plex Sans"
          fontStyle="bold"
        />
      </Layer>
    </Stage>
  );
}
