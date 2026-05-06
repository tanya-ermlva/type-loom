import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { evaluate, render } from './flow';
import { Sidebar } from './Sidebar';
import { ProjectsModal } from './ProjectsModal';
import { captureThumbnail, saveProject } from './persistence';

export default function App() {
  const composition = useStore((s) => s.composition);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const toSnapshot = useStore((s) => s.toSnapshot);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [t, setT] = useState(0);
  const [projectsOpen, setProjectsOpen] = useState(false);

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

  function onSaveProject() {
    const name = prompt('Project name:', 'Untitled');
    if (!name || !name.trim()) return;
    const canvas = canvasRef.current;
    const thumbnail = canvas ? captureThumbnail(canvas) : undefined;
    saveProject(name.trim(), toSnapshot(), thumbnail);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="h-11 bg-white border-b border-gray-200 flex items-center px-4 text-[13px] gap-3">
        <span className="font-semibold text-gray-900">Word Flow</span>
        <span className="text-gray-500 text-[11px]">Type Loom prototype</span>
        <div className="flex-1" />
        <button
          onClick={onSaveProject}
          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-[12px] border border-gray-300"
        >
          Save
        </button>
        <button
          onClick={() => setProjectsOpen(true)}
          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-[12px] border border-gray-300"
        >
          Projects
        </button>
        <a href="../" className="text-[11px] text-gray-500 hover:text-gray-800 ml-2">
          ← all prototypes
        </a>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
          <div
            className="relative max-w-full max-h-full"
            style={{
              aspectRatio: `${composition.canvas.width} / ${composition.canvas.height}`,
              width: 'min(100%, calc((100vh - 6rem) * ' + (composition.canvas.width / composition.canvas.height) + '))',
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

      <ProjectsModal open={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </div>
  );
}
