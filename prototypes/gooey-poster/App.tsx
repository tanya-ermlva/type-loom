import { Canvas } from './components/Canvas';
import { GooeyFilter } from './components/GooeyFilter';
import { Panel } from './components/Panel';
import { usePosterStore } from './store';

export default function App() {
  const reset = usePosterStore((s) => s.reset);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <header className="h-11 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 text-[13px] gap-3">
        <span className="font-semibold">Gooey Poster</span>
        <span className="text-zinc-500 text-[11px]">Type Loom prototype</span>
        <div className="flex-1" />
        <button
          onClick={() => {
            if (confirm('Reset poster to defaults?')) reset();
          }}
          className="px-3 py-1 text-[11px] text-zinc-400 hover:text-zinc-100"
        >
          Reset
        </button>
        <button
          disabled
          title="Coming in v1.1"
          className="px-3 py-1 rounded bg-zinc-800 text-zinc-500 text-[11px] cursor-not-allowed"
        >
          Export ▾
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <Canvas />
        </main>
        <Panel />
      </div>

      <GooeyFilter />
    </div>
  );
}
