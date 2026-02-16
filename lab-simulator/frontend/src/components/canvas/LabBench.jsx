import { Stage, Layer } from 'react-konva';
import Burette from './Burette';
import Erlenmeyer from './Erlenmeyer';
import DropAnimation from './DropAnimation';
import useTitration from '../../hooks/useTitration';

export default function LabBench({ width = 500, height = 600 }) {
  const { volumeAdded, maxBuretteVolume, currentColor, isDropping } = useTitration();

  const buretteX = width / 2;
  const buretteY = 30;
  const erlenmeyerX = width / 2;
  const erlenmeyerY = 360;

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
            liquidColor="#C8D8E8"
          />

          {/* Drop animation */}
          <DropAnimation
            x={buretteX}
            startY={buretteY + 290}
            endY={erlenmeyerY - 20}
            isDropping={isDropping}
            color="#F0F0F0"
          />

          {/* Erlenmeyer flask */}
          <Erlenmeyer
            x={erlenmeyerX}
            y={erlenmeyerY}
            liquidColor={currentColor}
            fillLevel={0.44}
          />
        </Layer>
      </Stage>
    </div>
  );
}
