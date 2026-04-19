import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createSilhouette, type SilhouetteParams } from '../core/treatments/silhouette';
import { DEFAULT_SILHOUETTE_PARAMS } from '../core/treatments/defaults';
import { Slider } from './controls/Slider';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';

interface SilhouetteCardProps {
  treatment: Treatment;
  params: SilhouetteParams;
}

export function SilhouetteCard({ treatment, params }: SilhouetteCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'silhouette');

  const updateParams = (patch: Partial<SilhouetteParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createSilhouette(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: SilhouetteParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">Silhouette</span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-500">Shape: Lens</div>
        <Slider
          label="Size" value={params.size} min={0.05} max={1.5} step={0.01}
          onChange={(v) => updateParams({ size: v })}
          onAnimate={() => quickAnimate('size', DEFAULT_SILHOUETTE_PARAMS.size, params.size)}
        />
        <Slider
          label="Softness" value={params.softness} min={0} max={1} step={0.01}
          onChange={(v) => updateParams({ softness: v })}
          onAnimate={() => quickAnimate('softness', DEFAULT_SILHOUETTE_PARAMS.softness, params.softness)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.invert}
            onChange={(e) => updateParams({ invert: e.target.checked })}
          />
          <span className="text-gray-700">Invert</span>
        </label>

        <MaskControls treatment={treatment} />

        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="silhouette"
          animatableParams={[
            { key: 'size',     min: 0.05, max: 1.5, step: 0.01 },
            { key: 'softness', min: 0,    max: 1,   step: 0.01 },
          ]}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
