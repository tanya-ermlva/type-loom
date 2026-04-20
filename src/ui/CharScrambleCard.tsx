import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createCharScramble, type CharScrambleParams, type CharScrambleMode } from '../core/treatments/charScramble';
import { DEFAULT_CHAR_SCRAMBLE_PARAMS } from '../core/treatments/defaults';
import type { StaggerAxis } from '../core/animation/types';
import { Slider } from './controls/Slider';
import { PoolField } from './controls/PoolField';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';

interface CharScrambleCardProps {
  treatment: Treatment;
  params: CharScrambleParams;
}

export function CharScrambleCard({ treatment, params }: CharScrambleCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'charScramble');

  const updateParams = (patch: Partial<CharScrambleParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createCharScramble(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: CharScrambleParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  const animatableParams = params.mode === 'settle'
    ? [
        { key: 'flipsPerSecond', min: 1, max: 60, step: 1 },
        { key: 'settleStart', min: 0, max: 10, step: 0.1 },
        { key: 'staggerAmount', min: 0, max: 10, step: 0.1 },
      ]
    : [{ key: 'flipsPerSecond', min: 1, max: 60, step: 1 }];

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          <span className="text-gray-400">Char:</span> Scramble
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
            onChange={(e) => updateParams({ mode: e.target.value as CharScrambleMode })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="settle">Settle (locks to original)</option>
            <option value="continuous">Continuous (never settles)</option>
          </select>
        </label>
        <Slider
          label="Flips/second" value={params.flipsPerSecond} min={1} max={60} step={1}
          onChange={(v) => updateParams({ flipsPerSecond: v })}
          onAnimate={() => quickAnimate('flipsPerSecond', DEFAULT_CHAR_SCRAMBLE_PARAMS.flipsPerSecond, params.flipsPerSecond)}
        />
        {params.mode === 'settle' && (
          <>
            <Slider
              label="Settle start (s)" value={params.settleStart} min={0} max={10} step={0.1}
              onChange={(v) => updateParams({ settleStart: v })}
              onAnimate={() => quickAnimate('settleStart', DEFAULT_CHAR_SCRAMBLE_PARAMS.settleStart, params.settleStart)}
            />
            <Slider
              label="Stagger (s)" value={params.staggerAmount} min={0} max={10} step={0.1}
              onChange={(v) => updateParams({ staggerAmount: v })}
              onAnimate={() => quickAnimate('staggerAmount', DEFAULT_CHAR_SCRAMBLE_PARAMS.staggerAmount, params.staggerAmount)}
            />
            <label className="block text-sm">
              <div className="text-gray-700 mb-1">Stagger axis</div>
              <select
                value={params.staggerAxis}
                onChange={(e) => updateParams({ staggerAxis: e.target.value as StaggerAxis })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
              >
                <option value="x">x</option>
                <option value="y">y</option>
                <option value="radial">radial</option>
                <option value="diagonal">diagonal</option>
              </select>
            </label>
          </>
        )}

        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="charScramble"
          animatableParams={animatableParams}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
