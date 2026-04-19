import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createCharSwap, type CharSwapParams, type CharSwapMode } from '../core/treatments/charSwap';
import { DEFAULT_CHAR_SWAP_PARAMS } from '../core/treatments/defaults';
import { Slider } from './controls/Slider';
import { PoolField } from './controls/PoolField';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';

interface CharSwapCardProps {
  treatment: Treatment;
  params: CharSwapParams;
}

export function CharSwapCard({ treatment, params }: CharSwapCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'charSwap');

  const updateParams = (patch: Partial<CharSwapParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createCharSwap(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: CharSwapParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  const animatableParams = params.mode === 'random'
    ? [{ key: 'seed', min: 0, max: 100, step: 1 }]
    : [{ key: 'poolIndex', min: 0, max: Math.max(1, params.pool.length - 1), step: 1 }];

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          <span className="text-gray-400">Char:</span> Swap
        </span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <PoolField
          label="Pool"
          value={params.pool}
          onChange={(v) => updateParams({ pool: v })}
        />
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Mode</div>
          <select
            value={params.mode}
            onChange={(e) => updateParams({ mode: e.target.value as CharSwapMode })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="random">Random (per cell)</option>
            <option value="cycle">Cycle (all same char)</option>
          </select>
        </label>
        {params.mode === 'random' ? (
          <Slider
            label="Seed" value={params.seed} min={0} max={100} step={1}
            onChange={(v) => updateParams({ seed: v })}
            onAnimate={() => quickAnimate('seed', DEFAULT_CHAR_SWAP_PARAMS.seed, params.seed)}
          />
        ) : (
          <Slider
            label="Pool index" value={params.poolIndex} min={0} max={Math.max(1, params.pool.length - 1)} step={1}
            onChange={(v) => updateParams({ poolIndex: v })}
            onAnimate={() => quickAnimate('poolIndex', DEFAULT_CHAR_SWAP_PARAMS.poolIndex, params.poolIndex)}
          />
        )}

        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="charSwap"
          animatableParams={animatableParams}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
