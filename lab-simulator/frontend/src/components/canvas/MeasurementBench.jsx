import { Stage, Layer, Rect, Text } from 'react-konva';
import GraduatedCylinder from './GraduatedCylinder';

export default function MeasurementBench({ width = 400, height = 450, currentVolume, maxVolume = 250 }) {
  const centerX = width / 2;

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Bench surface */}
        <Rect
          x={0}
          y={height - 20}
          width={width}
          height={20}
          fill="#E2E8F0"
          cornerRadius={[4, 4, 0, 0]}
        />

        {/* Graduated Cylinder centered */}
        <GraduatedCylinder
          x={centerX}
          y={40}
          capacity={maxVolume}
          currentVolume={currentVolume}
          liquidColor="#93C5FD"
        />

        {/* Label */}
        <Text
          x={centerX - 60}
          y={height - 45}
          text={`Probeta ${maxVolume} mL`}
          fontSize={12}
          fill="#64748B"
          fontFamily="IBM Plex Sans"
          width={120}
          align="center"
        />
      </Layer>
    </Stage>
  );
}
