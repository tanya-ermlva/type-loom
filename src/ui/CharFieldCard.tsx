import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createCharField, type CharFieldParams, type CharFieldPattern } from '../core/treatments/charField';
import { DEFAULT_CHAR_FIELD_PARAMS } from '../core/treatments/defaults';
import { Slider } from './controls/Slider';
import { PoolField } from './controls/PoolField';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';

interface CharFieldCardProps {
  treatment: Treatment;
  params: CharFieldParams;
}

export function CharFieldCard({ treatment, params }: CharFieldCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'charField');

  const updateParams = (patch: Partial<CharFieldParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createCharField(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: CharFieldParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          <span className="text-gray-400">Char:</span> Field
        </span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <PoolField
          label="Pool (sequence)"
          value={params.pool}
          onChange={(v) => updateParams({ pool: v })}
        />
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Pattern</div>
          <select
            value={params.pattern}
            onChange={(e) => updateParams({ pattern: e.target.value as CharFieldPattern })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="radial">Radial</option>
            <option value="linear-x">Linear X</option>
            <option value="linear-y">Linear Y</option>
            <option value="diagonal">Diagonal</option>
          </select>
        </label>
        <Slider
          label="Scroll (phase 0–1)" value={params.scroll} min={0} max={1} step={0.01}
          onChange={(v) => updateParams({ scroll: v })}
          onAnimate={() => quickAnimate('scroll', DEFAULT_CHAR_FIELD_PARAMS.scroll, params.scroll)}
        />

        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="charField"
          animatableParams={[{ key: 'scroll', min: 0, max: 1, step: 0.01 }]}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
