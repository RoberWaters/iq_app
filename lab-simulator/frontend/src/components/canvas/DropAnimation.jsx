import { useRef, useEffect } from 'react';
import { Circle } from 'react-konva';
import Konva from 'konva';

export default function DropAnimation({ x, startY, endY, isDropping, color = '#F0F0F0' }) {
  const dropRef = useRef(null);
  const tweenRef = useRef(null);

  useEffect(() => {
    const node = dropRef.current;
    if (!node) return;

    // Destroy any existing tween
    if (tweenRef.current) {
      try { tweenRef.current.destroy(); } catch (_) { /* ignore */ }
      tweenRef.current = null;
    }

    if (isDropping) {
      // Single one-shot drop animation
      node.y(startY);
      node.opacity(1);

      tweenRef.current = new Konva.Tween({
        node,
        duration: 0.35,
        y: endY,
        easing: Konva.Easings.EaseIn,
        onFinish: () => {
          node.opacity(0);
          try { node.getLayer()?.batchDraw(); } catch (_) { /* ignore */ }
        },
      });
      tweenRef.current.play();
    } else {
      node.opacity(0);
    }

    return () => {
      if (tweenRef.current) {
        try { tweenRef.current.destroy(); } catch (_) { /* ignore */ }
        tweenRef.current = null;
      }
    };
  }, [isDropping, startY, endY]);

  return (
    <Circle
      ref={dropRef}
      x={x}
      y={startY}
      radius={4}
      fill={color}
      opacity={0}
      scaleY={1.5}
    />
  );
}
