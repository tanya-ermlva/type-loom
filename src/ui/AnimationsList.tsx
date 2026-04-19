import { useState } from 'react';
import { useStore } from '../state/store';
import { Slider } from './controls/Slider';
import type { TreatmentType } from '../core/treatments/types';
import type { AnimationSpec, AnimationCurve, StaggerAxis } from '../core/animation/types';
import type { MaskParams } from '../core/mask/types';

export interface AnimatableParam {
  key: string;
  min: number;
  max: number;
  step: number;
}

interface AnimationsListProps {
  treatmentId: string;
  treatmentType: TreatmentType;
  /** Animatable params on this treatment (excluding mask). Each carries its slider range. */
  animatableParams: AnimatableParam[];
  /** Current values, used to seed `from` and `to` when adding. */
  currentParams: Record<string, unknown>;
  /** Optional mask — when present, mask.* keys join the animatable list. */
  mask?: MaskParams | null;
}

const MASK_PARAM_RANGES: Record<string, { min: number; max: number; step: number }> = {
  'mask.centerX':  { min: 0,    max: 1, step: 0.01 },
  'mask.centerY':  { min: 0,    max: 1, step: 0.01 },
  'mask.sizeX':    { min: 0.01, max: 1, step: 0.01 },
  'mask.sizeY':    { min: 0.01, max: 1, step: 0.01 },
  'mask.softness': { min: 0,    max: 1, step: 0.01 },
};

function buildMaskParams(mask: MaskParams): AnimatableParam[] {
  const keys = mask.shape === 'rect'
    ? ['mask.centerX', 'mask.centerY', 'mask.sizeX', 'mask.sizeY', 'mask.softness']
    : ['mask.centerX', 'mask.centerY', 'mask.sizeX', 'mask.softness'];
  return keys.map((k) => ({ key: k, ...MASK_PARAM_RANGES[k] }));
}

function buildMaskValues(mask: MaskParams): Record<string, unknown> {
  return {
    'mask.centerX': mask.centerX,
    'mask.centerY': mask.centerY,
    'mask.sizeX':   mask.sizeX,
    'mask.sizeY':   mask.sizeY,
    'mask.softness': mask.softness,
  };
}

const SELECT_CLS =
  'w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400';

/**
 * Per-treatment animation list. Each row uses sliders (with the param's
 * native range) for from / to / duration / stagger, plus dropdowns for
 * curve and stagger axis.
 */
export function AnimationsList({
  treatmentId,
  treatmentType,
  animatableParams,
  currentParams,
  mask,
}: AnimationsListProps) {
  const allParams = mask ? [...animatableParams, ...buildMaskParams(mask)] : animatableParams;
  const allValues = mask ? { ...currentParams, ...buildMaskValues(mask) } : currentParams;
  const allKeys = allParams.map((p) => p.key);

  const animations = useStore((s) => s.animations);
  const addAnimation = useStore((s) => s.addAnimation);
  const removeAnimation = useStore((s) => s.removeAnimation);
  const updateAnimation = useStore((s) => s.updateAnimation);

  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState(allKeys[0] ?? '');

  const myAnims = animations.filter((a) => a.treatmentId === treatmentId);

  const findRange = (key: string): AnimatableParam =>
    allParams.find((p) => p.key === key) ?? { key, min: 0, max: 1, step: 0.01 };

  const duplicateAnimation = (source: AnimationSpec) => {
    addAnimation({ ...source, id: crypto.randomUUID() });
  };

  const handleAdd = () => {
    if (!newKey) return;
    const seedValue = Number(allValues[newKey] ?? 0);
    const range = findRange(newKey);
    const span = Math.max(0.05, (range.max - range.min) * 0.3);
    const spec: AnimationSpec = {
      id: crypto.randomUUID(),
      treatmentId,
      treatmentType,
      paramKey: newKey,
      from: Math.max(range.min, seedValue - span / 2),
      to: Math.min(range.max, seedValue + span / 2),
      curve: 'sine',
      duration: 4,
      delay: 0,
      staggerAmount: 0,
      staggerAxis: 'x',
    };
    addAnimation(spec);
    setAdding(false);
  };

  return (
    <div className="border-t border-gray-100 pt-2 mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-gray-400">Animations</span>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
          >
            + Animate
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-1 items-center mb-2">
          <select
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className={`${SELECT_CLS} flex-1`}
          >
            {allKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            Add
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs px-2 py-1 text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      )}

      {myAnims.length === 0 && !adding && (
        <p className="text-[11px] text-gray-400">No animations yet.</p>
      )}

      <div className="space-y-2">
        {myAnims.map((a) => {
          const range = findRange(a.paramKey);
          const staggerDisabled = a.staggerAmount === 0;
          return (
            <div key={a.id} className="border border-gray-200 rounded-md p-2.5 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">
                  animating <code className="text-blue-600 bg-blue-50 px-1 rounded">{a.paramKey}</code>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateAnimation(a)}
                    className="text-gray-400 hover:text-blue-500 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                    aria-label="Duplicate animation"
                    title="Duplicate this animation"
                  >⧉</button>
                  <button
                    onClick={() => removeAnimation(a.id)}
                    className="text-gray-400 hover:text-red-500 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                    aria-label="Remove animation"
                  >✕</button>
                </div>
              </div>

              <Slider
                label="from" value={a.from}
                min={range.min} max={range.max} step={range.step}
                onChange={(v) => updateAnimation(a.id, { from: v })}
              />
              <Slider
                label="to" value={a.to}
                min={range.min} max={range.max} step={range.step}
                onChange={(v) => updateAnimation(a.id, { to: v })}
              />
              <Slider
                label="duration (s)" value={a.duration}
                min={0.1} max={20} step={0.1}
                onChange={(v) => updateAnimation(a.id, { duration: Math.max(0.1, v) })}
              />
              <Slider
                label="stagger (s)" value={a.staggerAmount}
                min={0} max={10} step={0.1}
                onChange={(v) => updateAnimation(a.id, { staggerAmount: Math.max(0, v) })}
              />

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <label className="block text-xs">
                  <div className="text-gray-500 mb-0.5">curve</div>
                  <select
                    value={a.curve}
                    onChange={(e) => updateAnimation(a.id, { curve: e.target.value as AnimationCurve })}
                    className={SELECT_CLS}
                  >
                    <option value="sine">sine</option>
                    <option value="ease-in-out">ease-in-out</option>
                    <option value="triangle">triangle</option>
                    <option value="sawtooth">sawtooth</option>
                  </select>
                </label>
                <label className="block text-xs">
                  <div className="text-gray-500 mb-0.5">stagger axis</div>
                  <select
                    value={a.staggerAxis}
                    onChange={(e) => updateAnimation(a.id, { staggerAxis: e.target.value as StaggerAxis })}
                    disabled={staggerDisabled}
                    className={`${SELECT_CLS} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={staggerDisabled ? 'Set stagger > 0 to enable' : ''}
                  >
                    <option value="x">x</option>
                    <option value="y">y</option>
                    <option value="radial">radial</option>
                    <option value="diagonal">diagonal</option>
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
