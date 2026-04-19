import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createRotation, type RotationParams, type RotationPattern } from '../core/treatments/rotation';
import { Slider } from './controls/Slider';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';

interface RotationCardProps {
  treatment: Treatment;
  params: RotationParams;
}

export function RotationCard({ treatment, params }: RotationCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);

  const updateParams = (patch: Partial<RotationParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createRotation(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: RotationParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">Rotation</span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Pattern</div>
          <select
            value={params.pattern}
            onChange={(e) => updateParams({ pattern: e.target.value as RotationPattern })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="radial">Radial (swirl)</option>
            <option value="linear-x">Linear X</option>
            <option value="linear-y">Linear Y</option>
            <option value="random">Random</option>
          </select>
        </label>
        <Slider
          label="Min degrees" value={params.minDegrees} min={-180} max={180} step={1}
          onChange={(v) => updateParams({ minDegrees: v })}
        />
        <Slider
          label="Max degrees" value={params.maxDegrees} min={-180} max={180} step={1}
          onChange={(v) => updateParams({ maxDegrees: v })}
        />
        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="rotation"
          numericParamKeys={['minDegrees', 'maxDegrees']}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
