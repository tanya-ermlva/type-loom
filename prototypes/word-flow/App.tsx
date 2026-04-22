import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { evaluate, render } from './flow';
import { Sidebar } from './Sidebar';

export default function App() {
  const composition = useStore((s) => s.composition);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [t, setT] = useState(0);

  // RAF animation loop — advances t within [0, loopDuration).
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      const tInLoop = elapsed % composition.loopDuration;
      setT(tInLoop);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, composition.loopDuration]);

  // Render on t or composition change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvas.width !== composition.canvas.width) canvas.width = composition.canvas.width;
    if (canvas.height !== composition.canvas.height) canvas.height = composition.canvas.height;
    const instances = evaluate(composition, t);
    render(ctx, composition, instances);
  }, [composition, t]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
        <div
          className="relative max-w-full max-h-full"
          style={{
            aspectRatio: `${composition.canvas.width} / ${composition.canvas.height}`,
            width: 'min(100%, calc((100vh - 3rem) * ' + (composition.canvas.width / composition.canvas.height) + '))',
          }}
        >
          <canvas
            ref={canvasRef}
            className="block shadow-lg w-full h-full"
          />
          <button
            onClick={() => setPlaying(!playing)}
            className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded hover:bg-black/85"
          >
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono">
            t = {t.toFixed(2)}s / {composition.loopDuration}s
          </div>
        </div>
      </div>
      <Sidebar />
    </div>
  );
}
