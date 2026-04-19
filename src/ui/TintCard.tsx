import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createTint, type TintParams, type TintMode, type TintPattern } from '../core/treatments/tint';
import { Slider } from './controls/Slider';
import { ColorSwatch } from './controls/ColorSwatch';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';
import { DEFAULT_TINT_PARAMS } from '../core/treatments/defaults';

interface TintCardProps {
  treatment: Treatment;
  params: TintParams;
}

export function TintCard({ treatment, params }: TintCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'tint');

  const updateParams = (patch: Partial<TintParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createTint(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: TintParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">Tint</span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Mode</div>
          <select
            value={params.mode}
            onChange={(e) => updateParams({ mode: e.target.value as TintMode })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="opacity">Opacity gradient</option>
            <option value="color">Color gradient</option>
          </select>
        </label>
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Pattern</div>
          <select
            value={params.pattern}
            onChange={(e) => updateParams({ pattern: e.target.value as TintPattern })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="radial">Radial</option>
            <option value="linear-x">Linear X</option>
            <option value="linear-y">Linear Y</option>
          </select>
        </label>

        {params.mode === 'opacity' ? (
          <>
            <Slider
              label="Min opacity" value={params.minOpacity} min={0} max={1} step={0.01}
              onChange={(v) => updateParams({ minOpacity: v })}
              onAnimate={() => quickAnimate('minOpacity', DEFAULT_TINT_PARAMS.minOpacity, params.minOpacity)}
            />
            <Slider
              label="Max opacity" value={params.maxOpacity} min={0} max={1} step={0.01}
              onChange={(v) => updateParams({ maxOpacity: v })}
              onAnimate={() => quickAnimate('maxOpacity', DEFAULT_TINT_PARAMS.maxOpacity, params.maxOpacity)}
            />
          </>
        ) : (
          <div className="space-y-2">
            <ColorSwatch label="From" value={params.colorA} onChange={(v) => updateParams({ colorA: v })} />
            <ColorSwatch label="To" value={params.colorB} onChange={(v) => updateParams({ colorB: v })} />
          </div>
        )}

        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="tint"
          numericParamKeys={params.mode === 'opacity' ? ['minOpacity', 'maxOpacity'] : []}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
