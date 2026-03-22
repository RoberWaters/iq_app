import { useEffect, useRef, useCallback } from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import Konva from 'konva';

/**
 * Draggable magnetic stir bar (magneto).
 *
 * Two states:
 *   - Outside flask: sits on the stirrer surface, draggable into the flask
 *   - Inside flask: spins at the bottom of the liquid when stirrer is on
 *
 * Drag into flask: drop on the flask neck zone to place.
 * Drag out of flask: drag from inside the flask to remove.
 *
 * react-konva rules:
 *   - Always rendered, opacity-toggled for each position
 *   - Tweens destroyed (not stopped)
 *   - setState deferred with setTimeout in event handlers
 *   - getStage() wrapped in try-catch
 *   - Hit areas use rgba(0,0,0,0.001) fill
 */

function setCursor(e, cursor) {
  try {
    const stage = e.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  } catch { /* ignore */ }
}

// Pill-shaped stir bar dimensions
const BAR_W = 32;
const BAR_H = 8;
const BAR_R = BAR_H / 2; // corner radius for pill shape

export default function StirBar({
  // Flask geometry for snap detection
  flaskCenterX = 250,
  flaskMouthY = 360,
  flaskNeckHeight = 40,
  flaskBodyHeight = 120,
  // Rest position (on stirrer surface, beside the flask)
  restX = 170,
  restY = 540,
  // State
  isInFlask = false,
  stirrerOn = false,
  speed = 3,
  // Callbacks
  onPlaceInFlask,
  onRemoveFromFlask,
}) {
  const outerRef = useRef(null);
  const insideRef = useRef(null);
  const animRef = useRef(null);

  // Position when inside flask (bottom of body)
  const insideX = flaskCenterX;
  const insideY = flaskMouthY + flaskNeckHeight + flaskBodyHeight - 16;

  // Flask neck drop zone
  const neckZone = {
    xMin: flaskCenterX - 20,
    xMax: flaskCenterX + 20,
    yMin: flaskMouthY - 10,
    yMax: flaskMouthY + flaskNeckHeight + 30,
  };

  // ── Spin animation: horizontal rotation simulated via scaleX oscillation ────
  // A real stir bar spins around a vertical axis. From the side view,
  // it appears to shrink and flip horizontally. We simulate this by
  // oscillating scaleX between -1 and 1 (cos of the angle).
  const angleRef = useRef(0);

  useEffect(() => {
    if (!isInFlask || !stirrerOn || !insideRef.current) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      if (insideRef.current) {
        insideRef.current.scaleX(1);
      }
      angleRef.current = 0;
      return;
    }

    const anim = new Konva.Animation((frame) => {
      const radiansPerSecond = speed * Math.PI * 2;
      const angleDelta = (radiansPerSecond * frame.timeDiff) / 1000;
      angleRef.current = (angleRef.current + angleDelta) % (Math.PI * 2);
      const node = insideRef.current;
      if (node) node.scaleX(Math.cos(angleRef.current));
    }, insideRef.current.getLayer());

    anim.start();
    animRef.current = anim;

    return () => {
      anim.stop();
      animRef.current = null;
    };
  }, [isInFlask, stirrerOn, speed]);

  // ── Drag handlers for the bar when OUTSIDE the flask ────────────────────
  // Konva updates the node's x/y to the dragged position (absolute coords).
  // On drop, check if the bar landed in the flask neck zone; snap back otherwise.
  const handleDragEndOutside = useCallback((e) => {
    const pos = e.target.position();

    if (pos.x > neckZone.xMin && pos.x < neckZone.xMax &&
        pos.y > neckZone.yMin && pos.y < neckZone.yMax) {
      // Dropped into flask neck zone — snap into flask
      e.target.position({ x: restX, y: restY });
      e.target.getLayer()?.batchDraw();
      if (onPlaceInFlask) setTimeout(onPlaceInFlask, 0);
    } else {
      // Snap back to rest position
      e.target.position({ x: restX, y: restY });
      e.target.getLayer()?.batchDraw();
    }
    setCursor(e, 'default');
  }, [restX, restY, neckZone, onPlaceInFlask]);

  // ── Drag handlers for the bar when INSIDE the flask ─────────────────────
  const handleDragEndInside = useCallback((e) => {
    const pos = e.target.position();

    // If dragged above the flask mouth — remove from flask
    if (pos.y < flaskMouthY + 10) {
      e.target.position({ x: insideX, y: insideY });
      e.target.getLayer()?.batchDraw();
      if (onRemoveFromFlask) setTimeout(onRemoveFromFlask, 0);
    } else {
      // Snap back to inside position
      e.target.position({ x: insideX, y: insideY });
      e.target.getLayer()?.batchDraw();
    }
    setCursor(e, 'default');
  }, [insideX, insideY, flaskMouthY, onRemoveFromFlask]);

  return (
    <Group>
      {/* ── Stir bar OUTSIDE flask (on stirrer surface) ─────────────── */}
      <Group
        x={restX}
        y={restY}
        draggable={!isInFlask}
        onDragEnd={handleDragEndOutside}
        onMouseEnter={(e) => { if (!isInFlask) setCursor(e, 'grab'); }}
        onMouseLeave={(e) => setCursor(e, 'default')}
        onDragStart={(e) => setCursor(e, 'grabbing')}
        opacity={isInFlask ? 0 : 1}
        listening={!isInFlask}
        ref={outerRef}
      >
        {/* Pill body (white PTFE coating) */}
        <Rect
          x={-BAR_W / 2}
          y={-BAR_H / 2}
          width={BAR_W}
          height={BAR_H}
          fill="#F3F4F6"
          stroke="#9CA3AF"
          strokeWidth={1}
          cornerRadius={BAR_R}
        />
        {/* Magnet stripe (dark center) */}
        <Line
          points={[-BAR_W / 2 + 5, 0, BAR_W / 2 - 5, 0]}
          stroke="#374151"
          strokeWidth={2.5}
          lineCap="round"
        />
        {/* Highlight */}
        <Rect
          x={-BAR_W / 2 + 3}
          y={-BAR_H / 2 + 1}
          width={BAR_W - 6}
          height={2}
          fill="white"
          opacity={0.5}
          cornerRadius={1}
        />
        {/* Hit area (larger than visual for easy grabbing) */}
        <Rect
          x={-BAR_W / 2 - 6}
          y={-BAR_H / 2 - 6}
          width={BAR_W + 12}
          height={BAR_H + 12}
          fill="rgba(0,0,0,0.001)"
        />
      </Group>

      {/* ── Stir bar INSIDE flask (spinning at bottom) ──────────────── */}
      <Group
        x={insideX}
        y={insideY}
        draggable={isInFlask && !stirrerOn}
        onDragEnd={handleDragEndInside}
        onMouseEnter={(e) => { if (isInFlask && !stirrerOn) setCursor(e, 'grab'); }}
        onMouseLeave={(e) => setCursor(e, 'default')}
        onDragStart={(e) => setCursor(e, 'grabbing')}
        opacity={isInFlask ? 1 : 0}
        listening={isInFlask}
        ref={insideRef}
      >
        {/* Pill body (inside liquid — slightly tinted) */}
        <Rect
          x={-BAR_W / 2}
          y={-BAR_H / 2}
          width={BAR_W}
          height={BAR_H}
          fill="#E5E7EB"
          stroke="#9CA3AF"
          strokeWidth={0.8}
          cornerRadius={BAR_R}
        />
        {/* Magnet stripe */}
        <Line
          points={[-BAR_W / 2 + 5, 0, BAR_W / 2 - 5, 0]}
          stroke="#374151"
          strokeWidth={2}
          lineCap="round"
        />
        {/* Highlight */}
        <Rect
          x={-BAR_W / 2 + 3}
          y={-BAR_H / 2 + 1}
          width={BAR_W - 6}
          height={2}
          fill="white"
          opacity={0.35}
          cornerRadius={1}
        />
        {/* Hit area */}
        <Rect
          x={-BAR_W / 2 - 8}
          y={-BAR_H / 2 - 8}
          width={BAR_W + 16}
          height={BAR_H + 16}
          fill="rgba(0,0,0,0.001)"
        />
      </Group>
    </Group>
  );
}
