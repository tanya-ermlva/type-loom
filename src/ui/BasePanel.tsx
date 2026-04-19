import { useState } from 'react';
import { useStore } from '../state/store';
import { Slider } from './controls/Slider';
import { ColorSwatch } from './controls/ColorSwatch';
import { NumberField } from './controls/NumberField';
import { loadFontFile, displayFontName } from '../core/font/loader';
import { DEFAULT_BASE_CONFIG } from '../core/types';

const DEFAULT_FONT_FAMILY = DEFAULT_BASE_CONFIG.fontFamily;

const CANVAS_PRESETS: Array<{ label: string; width: number; height: number }> = [
  { label: 'Square 1:1',      width: 1080, height: 1080 },
  { label: 'Portrait 4:5',    width: 1080, height: 1350 },
  { label: 'Portrait 3:4',    width: 1080, height: 1440 },
  { label: 'Portrait 9:16',   width: 1080, height: 1920 },
  { label: 'Landscape 5:4',   width: 1350, height: 1080 },
  { label: 'Landscape 4:3',   width: 1440, height: 1080 },
  { label: 'Landscape 3:2',   width: 1620, height: 1080 },
  { label: 'Landscape 16:9',  width: 1920, height: 1080 },
];

function findMatchingPreset(w: number, h: number): string {
  return CANVAS_PRESETS.find((p) => p.width === w && p.height === h)?.label ?? 'Custom';
}

export function BasePanel() {
  const config = useStore((s) => s.config);
  const updateConfig = useStore((s) => s.updateConfig);
  const randomizePalette = useStore((s) => s.randomizePalette);
  const [fontError, setFontError] = useState<string | null>(null);
  const [fontLoading, setFontLoading] = useState(false);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontError(null);
    setFontLoading(true);
    try {
      const { cssFamily } = await loadFontFile(file);
      updateConfig({ fontFamily: cssFamily });
    } catch (err) {
      setFontError((err as Error).message || 'Could not load that font file.');
    } finally {
      setFontLoading(false);
      e.target.value = '';  // allow re-uploading the same file
    }
  };

  const isCustomFont = config.fontFamily !== DEFAULT_FONT_FAMILY;

  return (
    <aside className="w-64 border-r border-gray-200 p-4 overflow-y-auto bg-white">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Base</h2>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Font</span>
            {isCustomFont && (
              <button
                onClick={() => updateConfig({ fontFamily: DEFAULT_FONT_FAMILY })}
                className="text-xs text-blue-600 hover:underline"
                title="Reset to system sans"
              >
                reset
              </button>
            )}
          </div>
          <label className="block text-xs">
            <span className="block text-gray-500 truncate mb-1" title={config.fontFamily}>
              {fontLoading ? 'Loading…' : displayFontName(config.fontFamily)}
            </span>
            <input
              type="file"
              accept=".otf,.ttf,.woff,.woff2"
              onChange={handleFontUpload}
              disabled={fontLoading}
              className="block w-full text-xs text-gray-500
                file:mr-2 file:py-1 file:px-2 file:rounded file:border-0
                file:text-xs file:bg-gray-900 file:text-white
                hover:file:bg-gray-700 file:cursor-pointer"
            />
            {fontError && <p className="text-xs text-red-500 mt-1">{fontError}</p>}
          </label>
        </div>

        <div>
          <div className="text-sm text-gray-700 mb-1">Canvas size</div>
          <select
            value={findMatchingPreset(config.canvas.width, config.canvas.height)}
            onChange={(e) => {
              if (e.target.value === 'Custom') return;
              const preset = CANVAS_PRESETS.find((p) => p.label === e.target.value);
              if (preset) updateConfig({ canvas: { width: preset.width, height: preset.height } });
            }}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-1.5 bg-white focus:outline-none focus:border-blue-400"
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} · {p.width}×{p.height}
              </option>
            ))}
            <option value="Custom">Custom · {config.canvas.width}×{config.canvas.height}</option>
          </select>
          <div className="flex gap-1 items-center">
            <NumberField
              value={config.canvas.width}
              min={64}
              max={8000}
              step={1}
              onChange={(v) => updateConfig({ canvas: { ...config.canvas, width: v } })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              ariaLabel="Canvas width"
            />
            <button
              onClick={() => updateConfig({ canvas: { width: config.canvas.height, height: config.canvas.width } })}
              className="text-gray-400 hover:text-gray-700 px-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
              title="Swap orientation"
              aria-label="Swap canvas width and height"
            >⇄</button>
            <NumberField
              value={config.canvas.height}
              min={64}
              max={8000}
              step={1}
              onChange={(v) => updateConfig({ canvas: { ...config.canvas, height: v } })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              ariaLabel="Canvas height"
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
