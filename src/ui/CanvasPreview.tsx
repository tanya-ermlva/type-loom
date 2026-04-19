import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../state/store';
import { computeLayout } from '../core/grid/layout';
import { runPipeline } from '../core/treatments/pipeline';
import { renderToCanvas } from '../core/render/canvas';

export const CanvasPreview = forwardRef<HTMLCanvasElement>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(ref, () => canvasRef.current!);

  const config = useStore((s) => s.config);
  const treatments = useStore((s) => s.treatments);

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
    const finalCells = runPipeline(layoutCells, treatments, {
      config, rows, columns, t: 0,
    });

    renderToCanvas(ctx, finalCells, config);
  }, [config, treatments]);

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
