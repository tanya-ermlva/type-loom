import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createSpacing, type SpacingParams, type SpacingPattern } from '../core/treatments/spacing';
import { Slider } from './controls/Slider';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';
import { DEFAULT_SPACING_PARAMS } from '../core/treatments/defaults';

interface SpacingCardProps {
  treatment: Treatment;
  params: SpacingParams;
}

export function SpacingCard({ treatment, params }: SpacingCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'spacing');

  const updateParams = (patch: Partial<SpacingParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createSpacing(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: SpacingParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">Spacing rhythm</span>
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
            onChange={(e) => updateParams({ pattern: e.target.value as SpacingPattern })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="tight-middle">Tight middle</option>
            <option value="tight-edges">Tight edges</option>
            <option value="sine">Sine wave</option>
          </select>
        </label>
        <Slider
          label="Amplitude" value={params.amplitude} min={0} max={1} step={0.01}
          onChange={(v) => updateParams({ amplitude: v })}
          onAnimate={() => quickAnimate('amplitude', DEFAULT_SPACING_PARAMS.amplitude, params.amplitude)}
        />
        {params.pattern === 'sine' && (
          <Slider
            label="Frequency" value={params.frequency} min={0.1} max={5} step={0.1}
            onChange={(v) => updateParams({ frequency: v })}
            onAnimate={() => quickAnimate('frequency', DEFAULT_SPACING_PARAMS.frequency, params.frequency)}
          />
        )}
        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="spacing"
          numericParamKeys={params.pattern === 'sine' ? ['amplitude', 'frequency'] : ['amplitude']}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
