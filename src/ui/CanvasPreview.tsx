import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../state/store';
import { computeLayout } from '../core/grid/layout';
import { runAnimatedPipeline } from '../core/treatments/animatedPipeline';
import { renderToCanvas } from '../core/render/canvas';
import { applyConfigAnimations } from '../core/animation/configAnim';
import { MaskOverlays } from './MaskOverlays';

export const CanvasPreview = forwardRef<HTMLCanvasElement>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => canvasRef.current!);

  const config = useStore((s) => s.config);
  const treatments = useStore((s) => s.treatments);
  const animations = useStore((s) => s.animations);
  const currentTime = useStore((s) => s.currentTime);
  const loopDuration = useStore((s) => s.loopDuration);
  const showMaskOverlays = useStore((s) => s.showMaskOverlays);
  const setShowMaskOverlays = useStore((s) => s.setShowMaskOverlays);
  const isPlaying = useStore((s) => s.isPlaying);

  // Display size of the (visible) canvas, computed to fit the wrapper while
  // preserving aspect ratio. The internal canvas resolution stays at
  // config.canvas.{width,height}; CSS scales it down for display.
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const recalc = () => {
      const rect = wrapper.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const containerRatio = rect.width / rect.height;
      const canvasRatio = config.canvas.width / config.canvas.height;
      let w: number, h: number;
      if (canvasRatio > containerRatio) {
        // wider than container — width-constrained
        w = rect.width;
        h = w / canvasRatio;
      } else {
        // taller than container — height-constrained
        h = rect.height;
        w = h * canvasRatio;
      }
      setDisplaySize({ w, h });
    };
    recalc();
    const obs = new ResizeObserver(recalc);
    obs.observe(wrapper);
    return () => obs.disconnect();
  }, [config.canvas.width, config.canvas.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const effectiveConfig = applyConfigAnimations(config, animations, currentTime, loopDuration);
    canvas.width = effectiveConfig.canvas.width;
    canvas.height = effectiveConfig.canvas.height;

    const layoutCells = computeLayout(effectiveConfig);
    const rows = Math.floor(effectiveConfig.canvas.height / effectiveConfig.rowSpacing);
    const columns = rows > 0 ? layoutCells.length / rows : 0;
    const finalCells = runAnimatedPipeline(layoutCells, treatments, animations, {
      config: effectiveConfig, rows, columns, t: currentTime, loopDuration,
    });

    renderToCanvas(ctx, finalCells, effectiveConfig);
  }, [config, treatments, animations, currentTime, loopDuration]);

  const hasMasks = treatments.some((t) => t.enabled && t.mask);

  return (
    <main className="flex-1 grid place-items-center bg-gray-100 p-4 relative min-h-0 min-w-0 overflow-hidden">
      <div ref={wrapperRef} className="w-full h-full grid place-items-center min-h-0 min-w-0">
        {displaySize && (
          <div
            className="relative bg-white shadow-md"
            style={{ width: `${displaySize.w}px`, height: `${displaySize.h}px` }}
          >
            <canvas ref={canvasRef} className="block w-full h-full" />
            <MaskOverlays />
          </div>
        )}
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
