import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createScale, type ScaleParams, type ScalePattern } from '../core/treatments/scale';
import { Slider } from './controls/Slider';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';
import { DEFAULT_SCALE_PARAMS } from '../core/treatments/defaults';

interface ScaleCardProps {
  treatment: Treatment;
  params: ScaleParams;
}

export function ScaleCard({ treatment, params }: ScaleCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'scale');

  const updateParams = (patch: Partial<ScaleParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createScale(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: ScaleParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">Scale</span>
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
            onChange={(e) => updateParams({ pattern: e.target.value as ScalePattern })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="radial">Radial (big in middle)</option>
            <option value="linear-x">Linear X</option>
            <option value="linear-y">Linear Y</option>
          </select>
        </label>
        <Slider
          label="Min scale" value={params.min} min={0.05} max={3} step={0.05}
          onChange={(v) => updateParams({ min: v })}
          onAnimate={() => quickAnimate('min', DEFAULT_SCALE_PARAMS.min, params.min)}
        />
        <Slider
          label="Max scale" value={params.max} min={0.05} max={3} step={0.05}
          onChange={(v) => updateParams({ max: v })}
          onAnimate={() => quickAnimate('max', DEFAULT_SCALE_PARAMS.max, params.max)}
        />
        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="scale"
          numericParamKeys={['min', 'max']}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
