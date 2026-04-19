import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../state/store';
import { computeLayout } from '../core/grid/layout';
import { runAnimatedPipeline } from '../core/treatments/animatedPipeline';
import { renderToCanvas } from '../core/render/canvas';
import { MaskOverlays } from './MaskOverlays';

export const CanvasPreview = forwardRef<HTMLCanvasElement>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(ref, () => canvasRef.current!);

  const config = useStore((s) => s.config);
  const treatments = useStore((s) => s.treatments);
  const animations = useStore((s) => s.animations);
  const currentTime = useStore((s) => s.currentTime);
  const showMaskOverlays = useStore((s) => s.showMaskOverlays);
  const setShowMaskOverlays = useStore((s) => s.setShowMaskOverlays);
  const isPlaying = useStore((s) => s.isPlaying);

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

  const hasMasks = treatments.some((t) => t.enabled && t.mask);

  return (
    <main className="flex-1 grid place-items-center bg-gray-100 overflow-auto p-4 relative">
      <div
        className="relative bg-white shadow-md max-w-full max-h-full"
        style={{ aspectRatio: `${config.canvas.width} / ${config.canvas.height}` }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
        <MaskOverlays />
      </div>

      {hasMasks && (
        <button
          onClick={() => setShowMaskOverlays(!showMaskOverlays)}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/90 backdrop-blur-sm border border-gray-200 rounded shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"
          disabled={isPlaying}
          title={
            isPlaying
              ? 'Mask outlines auto-hide during playback'
              : showMaskOverlays
              ? 'Hide mask outlines'
              : 'Show mask outlines'
          }
        >
          {isPlaying
            ? '◌ masks (auto-hidden)'
            : showMaskOverlays
            ? '◉ masks'
            : '◌ masks'}
        </button>
      )}
    </main>
  );
});
