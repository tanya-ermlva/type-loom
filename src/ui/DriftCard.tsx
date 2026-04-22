import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createDrift, type DriftParams, type DriftAxis, type DriftScope } from '../core/treatments/drift';
import { Slider } from './controls/Slider';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';
import { DEFAULT_DRIFT_PARAMS } from '../core/treatments/defaults';

interface DriftCardProps {
  treatment: Treatment;
  params: DriftParams;
}

export function DriftCard({ treatment, params }: DriftCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'drift');

  const updateParams = (patch: Partial<DriftParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createDrift(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: DriftParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">Drift</span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Axis</div>
          <select
            value={params.axis}
            onChange={(e) => updateParams({ axis: e.target.value as DriftAxis })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="x">X (horizontal wave)</option>
            <option value="y">Y (vertical wave)</option>
            <option value="both">Both</option>
          </select>
        </label>
        <Slider
          label="Amplitude" value={params.amplitude} min={0} max={200} step={1}
          onChange={(v) => updateParams({ amplitude: v })}
          onAnimate={() => quickAnimate('amplitude', DEFAULT_DRIFT_PARAMS.amplitude, params.amplitude)}
        />
        <Slider
          label="Frequency" value={params.frequency} min={0} max={2} step={0.01}
          onChange={(v) => updateParams({ frequency: v })}
          onAnimate={() => quickAnimate('frequency', DEFAULT_DRIFT_PARAMS.frequency, params.frequency)}
        />
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Apply per</div>
          <select
            value={params.scope}
            onChange={(e) => updateParams({ scope: e.target.value as DriftScope })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
            title="Character: each letter drifts independently. Word: every letter of a word drifts together as a unit."
          >
            <option value="character">Character (each letter)</option>
            <option value="word">Word (letters locked together)</option>
          </select>
        </label>
        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="drift"
          animatableParams={[
            { key: 'amplitude', min: 0, max: 200, step: 1 },
            { key: 'frequency', min: 0, max: 2,   step: 0.01 },
          ]}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
