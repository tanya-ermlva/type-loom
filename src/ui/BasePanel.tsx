import { useStore } from '../state/store';
import { Slider } from './controls/Slider';
import { ColorSwatch } from './controls/ColorSwatch';

export function BasePanel() {
  const config = useStore((s) => s.config);
  const updateConfig = useStore((s) => s.updateConfig);
  const randomizePalette = useStore((s) => s.randomizePalette);

  return (
    <aside className="w-64 border-r border-gray-200 p-4 overflow-y-auto bg-white">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Base</h2>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-700 mb-1">Canvas size</div>
          <div className="flex gap-2">
            <input
              type="number"
              value={config.canvas.width}
              onChange={(e) => updateConfig({ canvas: { ...config.canvas, width: Number(e.target.value) } })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <span className="self-center text-gray-400">×</span>
            <input
              type="number"
              value={config.canvas.height}
              onChange={(e) => updateConfig({ canvas: { ...config.canvas, height: Number(e.target.value) } })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        <Slider
          label="Char size" value={config.charSize} min={8} max={200}
          onChange={(v) => updateConfig({ charSize: v })}
        />
        <Slider
          label="Row spacing" value={config.rowSpacing} min={4} max={200}
          onChange={(v) => updateConfig({ rowSpacing: v })}
        />
        <Slider
          label="Column spacing" value={config.columnSpacing} min={0} max={300}
          onChange={(v) => updateConfig({ columnSpacing: v })}
        />
        <Slider
          label="Character spacing" value={config.charSpacing} min={4} max={200}
          onChange={(v) => updateConfig({ charSpacing: v })}
        />

        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Colors</span>
            <button
              onClick={randomizePalette}
              className="text-xs text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
              title="Randomize palette (R)"
            >
              🎲 Randomize
            </button>
          </div>
          <ColorSwatch label="FG" value={config.fgColor} onChange={(v) => updateConfig({ fgColor: v })} />
          <ColorSwatch label="BG" value={config.bgColor} onChange={(v) => updateConfig({ bgColor: v })} />
        </div>
      </div>
    </aside>
  );
}
