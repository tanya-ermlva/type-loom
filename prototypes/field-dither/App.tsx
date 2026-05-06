import { Canvas } from './components/Canvas';
import { Panel } from './components/Panel';
import { useStore } from './store';

export default function App() {
  const algo = useStore((s) => s.globals.ditherAlgo);
  const fieldCount = useStore((s) => s.fields.length);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <header className="h-11 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 text-[13px] gap-3">
        <span className="font-semibold">Field Dither</span>
        <span className="text-zinc-500 text-[11px]">
          Type Loom prototype · {algo} · {fieldCount} field{fieldCount === 1 ? '' : 's'}
        </span>
        <div className="flex-1" />
        <a href="../" className="text-[11px] text-zinc-500 hover:text-zinc-200">← all prototypes</a>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <Canvas />
        </main>
        <Panel />
      </div>
    </div>
  );
}
