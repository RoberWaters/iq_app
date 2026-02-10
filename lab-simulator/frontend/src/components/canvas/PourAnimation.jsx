import { useRef, useEffect } from 'react';
import { Line } from 'react-konva';
import Konva from 'konva';

export default function PourAnimation({ fromX, fromY, toX, toY, isPouring, color = '#93C5FD' }) {
  const lineRef = useRef(null);
  const tweenRef = useRef(null);

  useEffect(() => {
    if (!lineRef.current) return;
    const node = lineRef.current;

    if (tweenRef.current) {
      tweenRef.current.destroy();
      tweenRef.current = null;
    }

    if (isPouring) {
      node.opacity(0);
      tweenRef.current = new Konva.Tween({
        node,
        duration: 0.4,
        opacity: 0.7,
        easing: Konva.Easings.EaseOut,
      });
      tweenRef.current.play();
    } else {
      tweenRef.current = new Konva.Tween({
        node,
        duration: 0.3,
        opacity: 0,
        easing: Konva.Easings.EaseIn,
      });
      tweenRef.current.play();
    }

    return () => {
      if (tweenRef.current) tweenRef.current.destroy();
    };
  }, [isPouring]);

  // Curved arc from source to destination
  const midX = (fromX + toX) / 2;
  const midY = Math.min(fromY, toY) - 30;
  const points = [
    fromX, fromY,
    fromX + (midX - fromX) * 0.3, fromY - 15,
    midX, midY,
    toX + (midX - toX) * 0.3, toY - 15,
    toX, toY,
  ];

  return (
    <Line
      ref={lineRef}
      points={points}
      stroke={color}
      strokeWidth={6}
      opacity={0}
      lineCap="round"
      lineJoin="round"
      tension={0.4}
    />
  );
}
