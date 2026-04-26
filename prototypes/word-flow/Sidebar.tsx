import { useStore } from './store';
import type {
  Flow,
  RowFlowParams,
  CircleFlowParams,
  DensityMode,
} from './flow';

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

/** Editor for RowFlow-specific params. */
function RowFlowEditor({
  flow,
  update,
}: {
  flow: Extract<Flow, { kind: 'row' }>;
  update: (patch: Partial<RowFlowParams>) => void;
}) {
  const p = flow.params;
  return (
    <>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Density</div>
        <label className="block text-xs mb-2">
          <select
            value={p.density.mode}
            onChange={(e) =>
              update({ density: { ...p.density, mode: e.target.value as DensityMode } })
            }
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="uniform">Uniform</option>
            <option value="tight-middle">Tight middle (V-shape, dense middle)</option>
            <option value="tight-edges">Tight edges (Λ-shape, dense edges)</option>
            <option value="linear-down">Linear down (top → bottom)</option>
            <option value="linear-up">Linear up (bottom → top)</option>
            <option value="sine">Sine (oscillating)</option>
            <option value="random">Random (per-row noise)</option>
          </select>
        </label>
        <Slider
          label="Min words/row"
          value={p.density.min}
          min={0}
          max={30}
          step={1}
          onChange={(v) => update({ density: { ...p.density, min: v } })}
        />
        <Slider
          label="Max words/row"
          value={p.density.max}
          min={0}
          max={30}
          step={1}
          onChange={(v) => update({ density: { ...p.density, max: v } })}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Density pulse</div>
        <Slider
          label="Amplitude (± words)"
          value={p.densityPulse.amplitude}
          min={0}
          max={10}
          step={0.5}
          fmt={1}
          onChange={(v) => update({ densityPulse: { ...p.densityPulse, amplitude: v } })}
        />
        <Slider
          label="Phase speed (cycles/loop)"
          value={p.densityPulse.phaseSpeed}
          min={-3}
          max={3}
          step={1}
          onChange={(v) => update({ densityPulse: { ...p.densityPulse, phaseSpeed: v } })}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">X wave</div>
        <Slider
          label="Amplitude (px)"
          value={p.xWave.amplitude}
          min={0}
          max={150}
          step={1}
          onChange={(v) => update({ xWave: { ...p.xWave, amplitude: v } })}
        />
        <Slider
          label="Frequency"
          value={p.xWave.frequency}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => update({ xWave: { ...p.xWave, frequency: v } })}
        />
        <Slider
          label="Phase (turns)"
          value={p.xWave.phase}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ xWave: { ...p.xWave, phase: v } })}
        />
        <Slider
          label="Phase speed (cycles/loop)"
          value={p.xWave.phaseSpeed}
          min={-3}
          max={3}
          step={1}
          onChange={(v) => update({ xWave: { ...p.xWave, phaseSpeed: v } })}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Jitter</div>
        <Slider
          label="Position (px)"
          value={p.jitter.position}
          min={0}
          max={10}
          step={0.5}
          onChange={(v) => update({ jitter: { ...p.jitter, position: v } })}
        />
        <Slider
          label="Rotation (rad)"
          value={p.jitter.rotation}
          min={0}
          max={0.2}
          step={0.005}
          fmt={3}
          onChange={(v) => update({ jitter: { ...p.jitter, rotation: v } })}
        />
        <Slider
          label="Opacity drop"
          value={p.jitter.opacity}
          min={0}
          max={0.5}
          step={0.01}
          onChange={(v) => update({ jitter: { ...p.jitter, opacity: v } })}
        />
      </div>

      <label className="block text-xs pt-2 border-t border-gray-100">
        <div className="text-gray-600 mb-0.5">Color</div>
        <input
          type="color"
          value={p.color}
          onChange={(e) => update({ color: e.target.value })}
          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
        />
      </label>
    </>
  );
}

/** Editor for CircleFlow-specific params. */
function CircleFlowEditor({
  flow,
  update,
}: {
  flow: Extract<Flow, { kind: 'circle' }>;
  update: (patch: Partial<CircleFlowParams>) => void;
}) {
  const p = flow.params;
  return (
    <>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Geometry</div>
        <Slider
          label="Rings"
          value={p.rings}
          min={1}
          max={12}
          step={1}
          onChange={(v) => update({ rings: v })}
        />
        <Slider
          label="Inner radius (px)"
          value={p.innerRadius}
          min={0}
          max={400}
          step={5}
          onChange={(v) => update({ innerRadius: v })}
        />
        <Slider
          label="Outer radius (px)"
          value={p.outerRadius}
          min={0}
          max={500}
          step={5}
          onChange={(v) => update({ outerRadius: v })}
        />
        <Slider
          label="Words per ring"
          value={p.wordsPerRing}
          min={1}
          max={40}
          step={1}
          onChange={(v) => update({ wordsPerRing: v })}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Center</div>
        <Slider
          label="Center X (px)"
          value={p.center.x}
          min={0}
          max={1200}
          step={5}
          onChange={(v) => update({ center: { ...p.center, x: v } })}
        />
        <Slider
          label="Center Y (px)"
          value={p.center.y}
          min={0}
          max={1200}
          step={5}
          onChange={(v) => update({ center: { ...p.center, y: v } })}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Alignment</div>
        <label className="block text-xs mb-2">
          <select
            value={p.alignment}
            onChange={(e) => update({ alignment: e.target.value as CircleFlowParams['alignment'] })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="tangent">Tangent (follow ring)</option>
            <option value="horizontal">Horizontal (stay upright)</option>
          </select>
        </label>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Rotation</div>
        <Slider
          label="Phase (turns)"
          value={p.rotation.phase}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ rotation: { ...p.rotation, phase: v } })}
        />
        <Slider
          label="Phase speed (cycles/loop)"
          value={p.rotation.phaseSpeed}
          min={-3}
          max={3}
          step={1}
          onChange={(v) => update({ rotation: { ...p.rotation, phaseSpeed: v } })}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Jitter</div>
        <Slider
          label="Position (px)"
          value={p.jitter.position}
          min={0}
          max={10}
          step={0.5}
          onChange={(v) => update({ jitter: { ...p.jitter, position: v } })}
        />
        <Slider
          label="Rotation (rad)"
          value={p.jitter.rotation}
          min={0}
          max={0.2}
          step={0.005}
          fmt={3}
          onChange={(v) => update({ jitter: { ...p.jitter, rotation: v } })}
        />
        <Slider
          label="Opacity drop"
          value={p.jitter.opacity}
          min={0}
          max={0.5}
          step={0.01}
          onChange={(v) => update({ jitter: { ...p.jitter, opacity: v } })}
        />
      </div>

      <label className="block text-xs pt-2 border-t border-gray-100">
        <div className="text-gray-600 mb-0.5">Color</div>
        <input
          type="color"
          value={p.color}
          onChange={(e) => update({ color: e.target.value })}
          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
        />
      </label>
    </>
  );
}

export function Sidebar() {
  const composition = useStore((s) => s.composition);
  const selectedFlowId = useStore((s) => s.selectedFlowId);
  const selectFlow = useStore((s) => s.selectFlow);
  const updateCompositionMeta = useStore((s) => s.updateCompositionMeta);
  const updateFlowParams = useStore((s) => s.updateFlowParams);
  const toggleFlow = useStore((s) => s.toggleFlow);
  const addFlow = useStore((s) => s.addFlow);
  const removeFlow = useStore((s) => s.removeFlow);
  const resetComposition = useStore((s) => s.resetComposition);

  const selectedFlow = composition.flows.find((f) => f.id === selectedFlowId);

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

      {/* Composition-level controls */}
      <div className="p-3 border-b border-gray-100 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-400">Composition</div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 flex-1 text-xs text-gray-600">
            <span>Background</span>
            <input
              type="color"
              value={composition.bgColor}
              onChange={(e) => updateCompositionMeta({ bgColor: e.target.value })}
              className="h-7 w-10 border border-gray-300 rounded cursor-pointer"
              title="Canvas background color"
            />
            <span className="font-mono text-[10px] text-gray-400">{composition.bgColor}</span>
          </label>
        </div>
        <Slider
          label="Loop duration (s)"
          value={composition.loopDuration}
          min={1}
          max={30}
          step={0.5}
          fmt={1}
          onChange={(v) => updateCompositionMeta({ loopDuration: v })}
        />
      </div>

      {/* Flow list */}
      <div className="p-3 border-b border-gray-100 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Flows</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => addFlow('row')}
              className="text-xs px-1.5 py-0.5 bg-gray-900 text-white rounded hover:bg-gray-700"
              title="Add a new row flow"
            >
              + Row
            </button>
            <button
              onClick={() => addFlow('circle')}
              className="text-xs px-1.5 py-0.5 bg-gray-900 text-white rounded hover:bg-gray-700"
              title="Add a new circle flow"
            >
              + Circle
            </button>
          </div>
        </div>
        {composition.flows.map((f) => {
          const isSelected = f.id === selectedFlowId;
          return (
            <div
              key={f.id}
              className={`flex items-center gap-2 px-2 py-1 rounded ${
                isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={f.enabled}
                onChange={() => toggleFlow(f.id)}
                className="cursor-pointer"
                title={f.enabled ? 'Disable flow' : 'Enable flow'}
              />
              <span
                className="text-[10px] font-mono uppercase text-gray-400 w-3 shrink-0"
                title={f.kind === 'row' ? 'Row flow' : 'Circle flow'}
              >
                {f.kind === 'row' ? 'R' : 'C'}
              </span>
              <input
                type="text"
                value={f.params.word}
                onChange={(e) => updateFlowParams(f.id, { word: e.target.value })}
                onFocus={() => selectFlow(f.id)}
                placeholder="(empty)"
                className={`flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none px-1 py-0.5 rounded focus:bg-white focus:ring-1 focus:ring-blue-400 ${
                  f.enabled ? 'text-gray-800' : 'text-gray-400 line-through'
                }`}
              />
              <button
                onClick={() => removeFlow(f.id)}
                className="text-gray-400 hover:text-red-500 text-xs"
                title="Remove flow"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Params for selected flow — kind-specific editor */}
      {selectedFlow ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {selectedFlow.kind === 'row' ? (
            <RowFlowEditor
              flow={selectedFlow}
              update={(patch) => updateFlowParams(selectedFlow.id, patch)}
            />
          ) : (
            <CircleFlowEditor
              flow={selectedFlow}
              update={(patch) => updateFlowParams(selectedFlow.id, patch)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 p-4 text-center">
          Select a flow above to edit its parameters.
        </div>
      )}
    </aside>
  );
}
