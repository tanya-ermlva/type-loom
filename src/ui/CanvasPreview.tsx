import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../state/store';
import { computeLayout } from '../core/grid/layout';
import { runAnimatedPipeline } from '../core/treatments/animatedPipeline';
import { renderToCanvas } from '../core/render/canvas';

export const CanvasPreview = forwardRef<HTMLCanvasElement>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(ref, () => canvasRef.current!);

  const config = useStore((s) => s.config);
  const treatments = useStore((s) => s.treatments);
  const animations = useStore((s) => s.animations);
  const isPlaying = useStore((s) => s.isPlaying);
  const currentTime = useStore((s) => s.currentTime);
  const loopDuration = useStore((s) => s.loopDuration);
  const setCurrentTime = useStore((s) => s.setCurrentTime);

  // Render whenever inputs change (this also re-runs every animation frame
  // via currentTime updates from the rAF loop below).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = config.canvas.width;
    canvas.height = config.canvas.height;

    const layoutCells = computeLayout(config);
    const rows = Math.floor(config.canvas.height / config.rowSpacing);
    const columns = rows > 0 ? layoutCells.length / rows : 0;
    const finalCells = runAnimatedPipeline(layoutCells, treatments, animations, {
      config, rows, columns, t: currentTime,
    });

    renderToCanvas(ctx, finalCells, config);
  }, [config, treatments, animations, currentTime]);

  // requestAnimationFrame loop — only runs when isPlaying.
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const next = (useStore.getState().currentTime + dt) % Math.max(0.1, loopDuration);
      setCurrentTime(next);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, loopDuration, setCurrentTime]);

  return (
    <main className="flex-1 grid place-items-center bg-gray-100 overflow-auto p-4">
      <canvas
        ref={canvasRef}
        className="bg-white shadow-md max-w-full max-h-full"
        style={{
          aspectRatio: `${config.canvas.width} / ${config.canvas.height}`,
        }}
      />
    </main>
  );
});
