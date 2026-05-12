import { useRef, useEffect, useCallback } from 'react';
import type { GameState } from '@manila/engine';
import { BoardRenderer } from './BoardRenderer.js';

interface Props {
  gameState: GameState;
  onSpotClick?: (spotId: string) => void;
}

export function GameBoard({ gameState, onSpotClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new BoardRenderer(ctx);
    rendererRef.current = renderer;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const width = rect.width;
      const height = Math.min(rect.height, width * 0.74);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      renderer.setSize(width, height);
      renderer.render(gameState);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(gameState);
    }
  }, [gameState]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSpotClick || !rendererRef.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const spotId = rendererRef.current.hitTest(x, y);
      if (spotId) {
        onSpotClick(spotId);
      }
    },
    [onSpotClick],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        display: 'block',
        width: '100%',
        cursor: onSpotClick ? 'pointer' : 'default',
        borderRadius: '8px',
      }}
    />
  );
}
