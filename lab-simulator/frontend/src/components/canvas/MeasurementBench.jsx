import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import GraduatedCylinder from './GraduatedCylinder';

export default function MeasurementBench({ width = 400, height = 500, currentVolume, maxVolume = 250, isFilling = false }) {
  const centerX = width / 2;
  const cylY = 80;

  // Faucet geometry
  const faucetX = centerX;
  const faucetY = 18;
  const spoutY = 62;

  // Water stream endpoint — just above liquid surface
  const tubeHeight = 280;
  const fillFraction = Math.min(1, Math.max(0, currentVolume / maxVolume));
  const liquidTopY = cylY + tubeHeight - fillFraction * tubeHeight;
  const streamEndY = Math.max(cylY + 5, liquidTopY - 4);
  const streamH = Math.max(0, streamEndY - spoutY - 10);

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Bench surface */}
        <Rect
          x={0}
          y={height - 30}
          width={width}
          height={30}
          fill="#D1C7B7"
        />
        {/* Bench front edge */}
        <Rect
          x={0}
          y={height - 30}
          width={width}
          height={4}
          fill="#BEB4A4"
        />

        {/* Faucet pipe (horizontal from left wall) */}
        <Rect
          x={0}
          y={faucetY}
          width={faucetX - 8}
          height={10}
          fill="#A0AEC0"
          stroke="#718096"
          strokeWidth={1}
        />

        {/* Faucet body (vertical pipe down to spout) */}
        <Rect
          x={faucetX - 8}
          y={faucetY}
          width={16}
          height={spoutY - faucetY + 8}
          fill="#A0AEC0"
          stroke="#718096"
          strokeWidth={1}
          cornerRadius={[0, 0, 3, 3]}
        />

        {/* Faucet spout tip */}
        <Rect
          x={faucetX - 5}
          y={spoutY + 5}
          width={10}
          height={5}
          fill="#8B95A5"
          cornerRadius={[0, 0, 2, 2]}
        />

        {/* Faucet handle (turns blue when filling) */}
        <Rect
          x={faucetX + 10}
          y={faucetY + 5}
          width={20}
          height={6}
          fill={isFilling ? '#60A5FA' : '#718096'}
          cornerRadius={3}
        />

        {/* Pipe highlight */}
        <Rect
          x={10}
          y={faucetY + 1}
          width={faucetX - 20}
          height={2}
          fill="white"
          opacity={0.2}
        />

        {/* Water stream from spout */}
        <Rect
          x={faucetX - 1.5}
          y={spoutY + 10}
          width={3}
          height={streamH}
          fill="#60A5FA"
          opacity={isFilling ? 0.7 : 0}
          cornerRadius={[0, 0, 1, 1]}
        />

        {/* Splash ripple at liquid surface */}
        <Line
          points={[
            faucetX - 6, streamEndY + 2,
            faucetX - 3, streamEndY - 1,
            faucetX, streamEndY + 3,
            faucetX + 3, streamEndY - 1,
            faucetX + 6, streamEndY + 2,
          ]}
          stroke="#93C5FD"
          strokeWidth={1.5}
          opacity={isFilling ? 0.6 : 0}
          lineCap="round"
        />

        {/* Graduated Cylinder */}
        <GraduatedCylinder
          x={centerX}
          y={cylY}
          capacity={maxVolume}
          currentVolume={currentVolume}
          liquidColor="#93C5FD"
        />

        {/* Label */}
        <Text
          x={centerX - 60}
          y={height - 55}
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
