import { Stage, Layer } from 'react-konva';
import Burette from './Burette';
import Erlenmeyer from './Erlenmeyer';
import DropAnimation from './DropAnimation';
import PrecipitateEffect from './PrecipitateEffect';
import useTitration from '../../hooks/useTitration';
import useSimulatorStore from '../../store/useSimulatorStore';

export default function LabBench({ width = 500, height = 600 }) {
  const { volumeAdded, maxBuretteVolume, currentColor, isDropping, progress } = useTitration();
  const { practiceConfig } = useSimulatorStore();

  const titrationConfig = practiceConfig?.titration || {};

  // Configurable colors from practice config
  const buretteLiquidColor = titrationConfig.titrantColor || '#C8D8E8';
  const dropColor = titrationConfig.dropColor || '#F0F0F0';
  const flaskFillLevel = titrationConfig.flaskFillLevel || 0.44;

  // Precipitate layers — support static and dynamic (growing) layers
  const rawLayers = titrationConfig.precipitate?.layers || [];
  const precipitateLayers = rawLayers.map(layer => {
    if (layer.dynamic) {
      // Dynamic layers grow in opacity/density as titration progresses
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

          {/* Erlenmeyer flask */}
          <Erlenmeyer
            x={erlenmeyerX}
            y={erlenmeyerY}
            liquidColor={currentColor}
            fillLevel={flaskFillLevel}
          />

          {/* Precipitate inside flask — always rendered, opacity-controlled */}
          <PrecipitateEffect
            x={erlenmeyerX}
            y={erlenmeyerY + neckHeight}
            width={bodyWidth * 0.8}
            height={bodyHeight * 0.8}
            layers={precipitateLayers}
            visible={hasPrecipitate}
          />
        </Layer>
      </Stage>
    </div>
  );
}
