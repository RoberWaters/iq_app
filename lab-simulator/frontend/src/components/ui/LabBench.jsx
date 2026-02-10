import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Text, Group } from 'react-konva';

const ITEM_W = 120;
const ITEM_H = 36;
const INST_COLOR = '#DBEAFE';
const INST_STROKE = '#3B82F6';
const REAG_COLOR = '#DCFCE7';
const REAG_STROKE = '#16A34A';

function BenchItem({ item, onRemove, onDragEnd }) {
  const isInstrument = item.kind === 'instrument';
  const fill = isInstrument ? INST_COLOR : REAG_COLOR;
  const stroke = isInstrument ? INST_STROKE : REAG_STROKE;

  return (
    <Group
      x={item.x}
      y={item.y}
      draggable
      onDblClick={() => onRemove(item.id, item.kind)}
      onDragEnd={(e) => {
        onDragEnd(item.id, e.target.x(), e.target.y());
      }}
    >
      <Rect
        width={ITEM_W}
        height={ITEM_H}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        cornerRadius={6}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={4}
        shadowOffsetY={2}
      />
      <Text
        x={6}
        y={4}
        width={ITEM_W - 12}
        height={ITEM_H - 4}
        text={item.name}
        fontSize={11}
        fontFamily="'IBM Plex Sans', sans-serif"
        fill="#1E293B"
        wrap="word"
        verticalAlign="middle"
      />
    </Group>
  );
}

export default function LabBench({
  benchItems,
  onAddFromDrop,
  onRemove,
  onMoveItem,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 700, height: 480 });

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Table geometry — trapezoidal shape
  const tablePoints = useCallback(() => {
    const w = size.width;
    const h = size.height;
    const topY = h * 0.55;
    const botY = h * 0.92;
    const inset = w * 0.12;
    return [
      inset, topY,
      w - inset, topY,
      w - inset * 0.3, botY,
      inset * 0.3, botY,
    ];
  }, [size]);

  // HTML5 drop handler — receive items from ToolStand
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('application/x-item-id');
    const category = e.dataTransfer.getData('application/x-item-category');
    if (!itemId) return;

    // Compute drop position relative to the stage
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(e.clientX - rect.left - ITEM_W / 2, size.width - ITEM_W - 20));
    const y = Math.max(20, Math.min(e.clientY - rect.top - ITEM_H / 2, size.height - ITEM_H - 20));
    onAddFromDrop(itemId, category, x, y);
  };

  return (
    <div
      ref={containerRef}
      className="lab-bench-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage width={size.width} height={size.height}>
        <Layer>
          {/* Lab table */}
          <Line
            points={tablePoints()}
            closed
            fill="#E8E4DF"
            stroke="#B0A999"
            strokeWidth={2}
          />
          {/* Table surface highlight */}
          <Line
            points={(() => {
              const pts = tablePoints();
              const shrink = 8;
              return [
                pts[0] + shrink, pts[1] + shrink,
                pts[2] - shrink, pts[3] + shrink,
                pts[4] - shrink * 0.3, pts[5] - shrink,
                pts[6] + shrink * 0.3, pts[7] - shrink,
              ];
            })()}
            closed
            fill="#F5F1EC"
          />
          {/* Table front edge shadow */}
          <Line
            points={(() => {
              const pts = tablePoints();
              return [pts[6], pts[7], pts[4], pts[5]];
            })()}
            stroke="#9A917E"
            strokeWidth={3}
          />

          {/* Hint text when empty */}
          {benchItems.length === 0 && (
            <Text
              x={size.width / 2 - 140}
              y={size.height * 0.35}
              text="Arrastra o haz clic en los materiales\ndel estante para colocarlos aquí"
              fontSize={14}
              fontFamily="'IBM Plex Sans', sans-serif"
              fill="#94A3B8"
              align="center"
              width={280}
            />
          )}

          {/* Items on bench */}
          {benchItems.map((item) => (
            <BenchItem
              key={item.id}
              item={item}
              onRemove={onRemove}
              onDragEnd={onMoveItem}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
