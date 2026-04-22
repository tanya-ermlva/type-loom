import { useStore } from './store';
import type { RowFlowParams, DensityMode } from './flow';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt = 2,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: number;
}) {
  return (
    <label className="block text-xs mb-1.5">
      <div className="flex justify-between mb-0.5 text-gray-600">
        <span>{label}</span>
        <span className="font-mono text-gray-500">
          {step < 1 ? value.toFixed(fmt) : value.toFixed(0)}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gray-800"
      />
    </label>
  );
}

export function Sidebar() {
  const composition = useStore((s) => s.composition);
  const selectedFlowId = useStore((s) => s.selectedFlowId);
  const selectFlow = useStore((s) => s.selectFlow);
  const updateFlowParams = useStore((s) => s.updateFlowParams);
  const toggleFlow = useStore((s) => s.toggleFlow);
  const addFlow = useStore((s) => s.addFlow);
  const removeFlow = useStore((s) => s.removeFlow);
  const resetComposition = useStore((s) => s.resetComposition);

  const selectedFlow = composition.flows.find((f) => f.id === selectedFlowId);

  const update = (patch: Partial<RowFlowParams>) => {
    if (!selectedFlow) return;
    updateFlowParams(selectedFlow.id, patch);
  };

  return (
    <aside className="w-80 h-full border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Prototype</div>
          <h1 className="text-sm font-semibold">Word-flow</h1>
        </div>
        <button
          onClick={resetComposition}
          className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
          title="Reset to default composition"
        >
          Reset
        </button>
      </div>

      {/* Flow list */}
      <div className="p-3 border-b border-gray-100 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Flows</div>
          <button
            onClick={addFlow}
            className="text-xs px-1.5 py-0.5 bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            + Add
          </button>
        </div>
        {composition.flows.map((f) => {
          const isSelected = f.id === selectedFlowId;
          return (
            <div
              key={f.id}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => selectFlow(f.id)}
            >
              <input
                type="checkbox"
                checked={f.enabled}
                onChange={() => toggleFlow(f.id)}
                onClick={(e) => e.stopPropagation()}
                className="cursor-pointer"
              />
              <span
                className={`flex-1 text-xs truncate ${
                  f.enabled ? 'text-gray-800' : 'text-gray-400 line-through'
                }`}
              >
                {f.params.word}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFlow(f.id);
                }}
                className="text-gray-400 hover:text-red-500 text-xs"
                title="Remove"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Params for selected flow */}
      {selectedFlow ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <label className="block text-xs">
            <div className="text-gray-600 mb-0.5">Word</div>
            <input
              type="text"
              value={selectedFlow.params.word}
              onChange={(e) => update({ word: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </label>

          <div>
            <Slider
              label="Rows"
              value={selectedFlow.params.rows}
              min={1}
              max={20}
              step={1}
              onChange={(v) => update({ rows: v })}
            />
            <Slider
              label="Row spacing (px)"
              value={selectedFlow.params.rowSpacing}
              min={10}
              max={80}
              step={1}
              onChange={(v) => update({ rowSpacing: v })}
            />
            <Slider
              label="Y center (px)"
              value={selectedFlow.params.yCenter}
              min={0}
              max={composition.canvas.height}
              step={1}
              onChange={(v) => update({ yCenter: v })}
            />
            <Slider
              label="Font size (px)"
              value={selectedFlow.params.fontSize}
              min={8}
              max={80}
              step={1}
              onChange={(v) => update({ fontSize: v })}
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Density</div>
            <label className="block text-xs mb-2">
              <select
                value={selectedFlow.params.density.mode}
                onChange={(e) =>
                  update({
                    density: {
                      ...selectedFlow.params.density,
                      mode: e.target.value as DensityMode,
                    },
                  })
                }
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="uniform">Uniform</option>
                <option value="tight-middle">Tight middle (dense middle)</option>
                <option value="tight-edges">Tight edges (dense edges)</option>
              </select>
            </label>
            <Slider
              label="Min words/row"
              value={selectedFlow.params.density.min}
              min={0}
              max={30}
              step={1}
              onChange={(v) =>
                update({ density: { ...selectedFlow.params.density, min: v } })
              }
            />
            <Slider
              label="Max words/row"
              value={selectedFlow.params.density.max}
              min={0}
              max={30}
              step={1}
              onChange={(v) =>
                update({ density: { ...selectedFlow.params.density, max: v } })
              }
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">X wave</div>
            <Slider
              label="Amplitude (px)"
              value={selectedFlow.params.xWave.amplitude}
              min={0}
              max={150}
              step={1}
              onChange={(v) =>
                update({ xWave: { ...selectedFlow.params.xWave, amplitude: v } })
              }
            />
            <Slider
              label="Frequency"
              value={selectedFlow.params.xWave.frequency}
              min={0}
              max={3}
              step={0.05}
              onChange={(v) =>
                update({ xWave: { ...selectedFlow.params.xWave, frequency: v } })
              }
            />
            <Slider
              label="Phase (turns)"
              value={selectedFlow.params.xWave.phase}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) =>
                update({ xWave: { ...selectedFlow.params.xWave, phase: v } })
              }
            />
            <Slider
              label="Phase speed (cycles/loop)"
              value={selectedFlow.params.xWave.phaseSpeed}
              min={-3}
              max={3}
              step={1}
              onChange={(v) =>
                update({ xWave: { ...selectedFlow.params.xWave, phaseSpeed: v } })
              }
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Jitter</div>
            <Slider
              label="Position (px)"
              value={selectedFlow.params.jitter.position}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) =>
                update({ jitter: { ...selectedFlow.params.jitter, position: v } })
              }
            />
            <Slider
              label="Rotation (rad)"
              value={selectedFlow.params.jitter.rotation}
              min={0}
              max={0.2}
              step={0.005}
              fmt={3}
              onChange={(v) =>
                update({ jitter: { ...selectedFlow.params.jitter, rotation: v } })
              }
            />
            <Slider
              label="Opacity drop"
              value={selectedFlow.params.jitter.opacity}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) =>
                update({ jitter: { ...selectedFlow.params.jitter, opacity: v } })
              }
            />
          </div>

          <label className="block text-xs pt-2 border-t border-gray-100">
            <div className="text-gray-600 mb-0.5">Color</div>
            <input
              type="color"
              value={selectedFlow.params.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-full h-8 border border-gray-300 rounded cursor-pointer"
            />
          </label>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 p-4 text-center">
          Select a flow above to edit its parameters.
        </div>
      )}
    </aside>
  );
}
