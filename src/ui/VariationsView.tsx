import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { computeLayout } from '../core/grid/layout';
import { runAnimatedPipeline } from '../core/treatments/animatedPipeline';
import { renderToCanvas } from '../core/render/canvas';
import type { Variation } from '../core/variations/random';

export function VariationsView() {
  const variations = useStore((s) => s.variations);
  const regenerateVariations = useStore((s) => s.regenerateVariations);
  const applyVariation = useStore((s) => s.applyVariation);
  const setMode = useStore((s) => s.setMode);

  return (
    <main className="flex-1 flex flex-col bg-gray-100 p-4 min-h-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Four random variations — one treatment + one animation each. Click "Use this" to apply.
        </p>
        <button
          onClick={regenerateVariations}
          className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          title="Generate four new random variations"
        >
          🎲 Regenerate
        </button>
      </div>

      <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 min-h-0">
        {variations.map((v) => (
          <MiniCanvas
            key={v.id}
            variation={v}
            onApply={() => {
              applyVariation(v.id);
              setMode('single');
            }}
          />
        ))}
      </div>
    </main>
  );
}

function MiniCanvas({ variation, onApply }: { variation: Variation; onApply: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = useStore((s) => s.config);
  const currentTime = useStore((s) => s.currentTime);

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
    const finalCells = runAnimatedPipeline(
      layoutCells,
      [variation.treatment],
      variation.animation ? [variation.animation] : [],
      { config, rows, columns, t: currentTime },
    );

    renderToCanvas(ctx, finalCells, config);
  }, [config, variation, currentTime]);

  const labelText = variation.animation
    ? `${variation.treatment.type} · animating ${variation.animation.paramKey}${
        variation.animation.staggerAmount > 0 ? ` · stagger ${variation.animation.staggerAxis}` : ''
      }`
    : variation.treatment.type;

  return (
    <div className="relative bg-white rounded shadow-sm overflow-hidden grid place-items-center min-h-0">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
        style={{ aspectRatio: `${config.canvas.width} / ${config.canvas.height}` }}
      />
      <div className="absolute top-2 left-2 bg-white/85 backdrop-blur-sm rounded px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-700 max-w-[calc(100%-1rem)] truncate">
        {labelText}
      </div>
      <button
        onClick={onApply}
        className="absolute bottom-2 right-2 px-2.5 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        Use this
      </button>
    </div>
  );
}
