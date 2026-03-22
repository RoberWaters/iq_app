import { Group, Rect, Line, Circle, Text } from 'react-konva';

/**
 * Magnetic stirrer plate with built-in interactive controls.
 *
 * Layout (top to bottom):
 *   - Ceramic top surface (where flask sits)
 *   - Front control panel: power button, speed knob (−/+), LED, display
 *
 * react-konva rules:
 *   - Always rendered, no conditional nodes inside Layer
 *   - setState deferred via setTimeout in event handlers
 *   - Hit areas use rgba(0,0,0,0.001)
 *   - getStage() wrapped in try-catch
 */

function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch { /* ignore */ }
}

export default function MagneticStirrer({
  x = 250,
  y = 522,
  width = 200,
  isOn = false,
  speed = 3,
  stirBarInFlask = false,
  onToggle,
  onSpeedUp,
  onSpeedDown,
}) {
  const halfW = width / 2;
  const topH = 24;      // ceramic surface height
  const panelH = 32;    // front control panel height
  const totalH = topH + panelH;
  const panelY = y + topH;

  const ledColor = isOn ? '#22C55E' : '#6B7280';

  // Power button position (moved right to avoid brand text)
  const pwrX = x - halfW + 58;
  const pwrY = panelY + panelH / 2;

  // Speed display position
  const dispX = x + 16;
  const dispY = panelY + 6;

  // Speed −/+ button positions
  const btnMinusX = x - 8;
  const btnPlusX = x + 48;
  const btnY = panelY + panelH / 2;

  return (
    <Group>
      {/* Shadow */}
      <Rect
        x={x - halfW + 4} y={y + totalH}
        width={width - 8} height={6}
        fill="#00000015" cornerRadius={3}
      />

      {/* ── Main housing ─────────────────────────────────────────── */}
      <Rect
        x={x - halfW} y={y}
        width={width} height={totalH}
        fill="#4B5563" stroke="#374151" strokeWidth={1.5}
        cornerRadius={5}
      />

      {/* ── Top ceramic surface ──────────────────────────────────── */}
      <Rect
        x={x - halfW + 6} y={y + 3}
        width={width - 12} height={topH - 5}
        fill="#E5E7EB" stroke="#D1D5DB" strokeWidth={0.8}
        cornerRadius={3}
      />
      {/* Ceramic highlight */}
      <Rect
        x={x - halfW + 10} y={y + 5}
        width={width - 20} height={3}
        fill="white" opacity={0.4} cornerRadius={2}
      />
      {/* Center circle markings */}
      <Circle
        x={x} y={y + topH / 2}
        radius={28} stroke="#CBD5E1" strokeWidth={0.5} opacity={0.4}
      />
      <Circle
        x={x} y={y + topH / 2}
        radius={16} stroke="#CBD5E1" strokeWidth={0.4} opacity={0.3}
      />

      {/* ── Divider line between top and panel ────────────────────── */}
      <Line
        points={[x - halfW + 3, y + topH, x + halfW - 3, y + topH]}
        stroke="#374151" strokeWidth={1} opacity={0.6}
      />

      {/* ── Front control panel ───────────────────────────────────── */}

      {/* Brand label */}
      <Text
        x={x - halfW + 8} y={panelY + 6}
        text="STIR" fontSize={7} fill="#9CA3AF"
        fontFamily="IBM Plex Mono" fontStyle="bold" letterSpacing={1.5}
      />
      <Text
        x={x - halfW + 8} y={panelY + 16}
        text="PLATE" fontSize={6} fill="#6B7280"
        fontFamily="IBM Plex Mono" letterSpacing={1}
      />

      {/* ── Power button (circular, clickable) ────────────────────── */}
      <Circle
        x={pwrX} y={pwrY}
        radius={10}
        fill={isOn ? '#166534' : '#374151'}
        stroke={isOn ? '#22C55E' : '#6B7280'}
        strokeWidth={1.5}
        onClick={() => {
          if ((stirBarInFlask || isOn) && onToggle) setTimeout(onToggle, 0);
        }}
        onTap={() => {
          if ((stirBarInFlask || isOn) && onToggle) setTimeout(onToggle, 0);
        }}
        onMouseEnter={(e) => setCursor(e, 'pointer')}
        onMouseLeave={(e) => setCursor(e, 'default')}
      />
      {/* Power icon (circle with line) */}
      <Circle
        x={pwrX} y={pwrY + 1}
        radius={5} stroke={isOn ? '#4ADE80' : '#9CA3AF'}
        strokeWidth={1.2} listening={false}
      />
      <Line
        points={[pwrX, pwrY - 5, pwrX, pwrY - 1]}
        stroke={isOn ? '#4ADE80' : '#9CA3AF'}
        strokeWidth={1.5} lineCap="round" listening={false}
      />
      {/* LED glow around power button */}
      <Circle
        x={pwrX} y={pwrY}
        radius={13} fill="#22C55E"
        opacity={isOn ? 0.15 : 0} listening={false}
      />

      {/* ── Speed minus button ────────────────────────────────────── */}
      <Circle
        x={btnMinusX} y={btnY}
        radius={9}
        fill={isOn ? '#374151' : '#2D3748'}
        stroke="#6B7280" strokeWidth={1}
        onClick={() => { if (isOn && onSpeedDown) setTimeout(onSpeedDown, 0); }}
        onTap={() => { if (isOn && onSpeedDown) setTimeout(onSpeedDown, 0); }}
        onMouseEnter={(e) => { if (isOn) setCursor(e, 'pointer'); }}
        onMouseLeave={(e) => setCursor(e, 'default')}
      />
      <Line
        points={[btnMinusX - 4, btnY, btnMinusX + 4, btnY]}
        stroke={isOn ? '#E5E7EB' : '#6B7280'}
        strokeWidth={2} lineCap="round" listening={false}
      />

      {/* ── Speed display (digital-style) ─────────────────────────── */}
      <Rect
        x={dispX - 8} y={dispY}
        width={28} height={20}
        fill="#111827" stroke="#374151" strokeWidth={0.8}
        cornerRadius={2}
      />
      <Text
        x={dispX - 8} y={dispY + 3}
        width={28} align="center"
        text={isOn ? String(speed) : '-'}
        fontSize={13} fill={isOn ? '#4ADE80' : '#374151'}
        fontFamily="IBM Plex Mono" fontStyle="bold"
        listening={false}
      />

      {/* ── Speed plus button ─────────────────────────────────────── */}
      <Circle
        x={btnPlusX} y={btnY}
        radius={9}
        fill={isOn ? '#374151' : '#2D3748'}
        stroke="#6B7280" strokeWidth={1}
        onClick={() => { if (isOn && onSpeedUp) setTimeout(onSpeedUp, 0); }}
        onTap={() => { if (isOn && onSpeedUp) setTimeout(onSpeedUp, 0); }}
        onMouseEnter={(e) => { if (isOn) setCursor(e, 'pointer'); }}
        onMouseLeave={(e) => setCursor(e, 'default')}
      />
      <Line
        points={[btnPlusX - 4, btnY, btnPlusX + 4, btnY]}
        stroke={isOn ? '#E5E7EB' : '#6B7280'}
        strokeWidth={2} lineCap="round" listening={false}
      />
      <Line
        points={[btnPlusX, btnY - 4, btnPlusX, btnY + 4]}
        stroke={isOn ? '#E5E7EB' : '#6B7280'}
        strokeWidth={2} lineCap="round" listening={false}
      />

      {/* ── Speed indicator dots ──────────────────────────────────── */}
      {[1, 2, 3, 4, 5].map(i => (
        <Circle
          key={`dot-${i}`}
          x={x + halfW - 38 + i * 7}
          y={panelY + panelH - 7}
          radius={2}
          fill={isOn && i <= speed ? '#4ADE80' : '#4B5563'}
          stroke={isOn && i <= speed ? '#22C55E' : '#374151'}
          strokeWidth={0.5}
          listening={false}
        />
      ))}

      {/* ── LED indicator ─────────────────────────────────────────── */}
      <Circle
        x={x + halfW - 14} y={panelY + 10}
        radius={3} fill={ledColor} opacity={0.9}
        listening={false}
      />
      <Circle
        x={x + halfW - 14} y={panelY + 10}
        radius={6} fill="#22C55E"
        opacity={isOn ? 0.3 : 0} listening={false}
      />
    </Group>
  );
}
