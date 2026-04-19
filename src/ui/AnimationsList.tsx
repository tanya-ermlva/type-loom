import { useState } from 'react';
import { useStore } from '../state/store';
import type { TreatmentType } from '../core/treatments/types';
import type { AnimationSpec, AnimationCurve, StaggerAxis } from '../core/animation/types';
import type { MaskParams } from '../core/mask/types';

interface AnimationsListProps {
  treatmentId: string;
  treatmentType: TreatmentType;
  /** Numeric param keys on this treatment that can be animated (excluding mask). */
  numericParamKeys: string[];
  /** Current values, used to seed `from` and `to` when adding. */
  currentParams: Record<string, unknown>;
  /** Optional mask — when present, mask.* keys join the animatable list. */
  mask?: MaskParams | null;
}

const MASK_KEYS_COMMON = ['mask.centerX', 'mask.centerY', 'mask.sizeX', 'mask.softness'];
const MASK_KEYS_RECT_EXTRA = ['mask.sizeY'];

function buildMaskKeys(mask: MaskParams): string[] {
  return mask.shape === 'rect'
    ? [...MASK_KEYS_COMMON.slice(0, 3), ...MASK_KEYS_RECT_EXTRA, 'mask.softness']
    : MASK_KEYS_COMMON;
}

function buildMaskValues(mask: MaskParams): Record<string, unknown> {
  return {
    'mask.centerX': mask.centerX,
    'mask.centerY': mask.centerY,
    'mask.sizeX': mask.sizeX,
    'mask.sizeY': mask.sizeY,
    'mask.softness': mask.softness,
  };
}

/**
 * UI inside each treatment card for managing animations on that treatment's
 * numeric parameters. Lists active animations and provides an add-form.
 */
export function AnimationsList({
  treatmentId,
  treatmentType,
  numericParamKeys,
  currentParams,
  mask,
}: AnimationsListProps) {
  const allKeys = mask ? [...numericParamKeys, ...buildMaskKeys(mask)] : numericParamKeys;
  const allValues = mask ? { ...currentParams, ...buildMaskValues(mask) } : currentParams;
  const animations = useStore((s) => s.animations);
  const addAnimation = useStore((s) => s.addAnimation);
  const removeAnimation = useStore((s) => s.removeAnimation);
  const updateAnimation = useStore((s) => s.updateAnimation);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState(allKeys[0] ?? '');

  const myAnims = animations.filter((a) => a.treatmentId === treatmentId);

  const duplicateAnimation = (source: AnimationSpec) => {
    addAnimation({ ...source, id: crypto.randomUUID() });
  };

  const handleAdd = () => {
    if (!newKey) return;
    const seedValue = Number(allValues[newKey] ?? 0);
    const spec: AnimationSpec = {
      id: crypto.randomUUID(),
      treatmentId,
      treatmentType,
      paramKey: newKey,
      from: seedValue,
      to: seedValue === 0 ? 1 : seedValue * 2,
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
            className="text-xs text-blue-600 hover:underline"
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
            className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
          >
            {allKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="text-xs px-2 py-0.5 bg-gray-900 text-white rounded"
          >
            Add
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      )}

      {myAnims.length === 0 && !adding && (
        <p className="text-[11px] text-gray-400">No animations yet.</p>
      )}

      <div className="space-y-2">
        {myAnims.map((a) => (
          <div key={a.id} className="bg-blue-50/40 border border-blue-100 rounded p-2 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-gray-800">animating <code className="text-blue-700">{a.paramKey}</code></span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => duplicateAnimation(a)}
                  className="text-gray-400 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                  aria-label="Duplicate animation"
                  title="Duplicate this animation"
                >⧉</button>
                <button
                  onClick={() => removeAnimation(a.id)}
                  className="text-gray-400 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                  aria-label="Remove animation"
                >✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <div className="text-gray-500">from</div>
                <input
                  type="number"
                  step={0.01}
                  value={a.from}
                  onChange={(e) => updateAnimation(a.id, { from: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-1 py-0.5"
                />
              </label>
              <label className="block">
                <div className="text-gray-500">to</div>
                <input
                  type="number"
                  step={0.01}
                  value={a.to}
                  onChange={(e) => updateAnimation(a.id, { to: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-1 py-0.5"
                />
              </label>
              <label className="block">
                <div className="text-gray-500">curve</div>
                <select
                  value={a.curve}
                  onChange={(e) => updateAnimation(a.id, { curve: e.target.value as AnimationCurve })}
                  className="w-full border border-gray-300 rounded px-1 py-0.5"
                >
                  <option value="sine">sine</option>
                  <option value="ease-in-out">ease-in-out</option>
                  <option value="triangle">triangle</option>
                  <option value="sawtooth">sawtooth</option>
                </select>
              </label>
              <label className="block">
                <div className="text-gray-500">duration (s)</div>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={a.duration}
                  onChange={(e) => updateAnimation(a.id, { duration: Math.max(0.1, Number(e.target.value)) })}
                  className="w-full border border-gray-300 rounded px-1 py-0.5"
                />
              </label>
              <label className="block">
                <div className="text-gray-500">stagger (s)</div>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={a.staggerAmount}
                  onChange={(e) => updateAnimation(a.id, { staggerAmount: Math.max(0, Number(e.target.value)) })}
                  className="w-full border border-gray-300 rounded px-1 py-0.5"
                  title="Per-cell time offset across the grid. 0 = no stagger (all cells in unison)."
                />
              </label>
              <label className="block">
                <div className="text-gray-500">stagger axis</div>
                <select
                  value={a.staggerAxis}
                  onChange={(e) => updateAnimation(a.id, { staggerAxis: e.target.value as StaggerAxis })}
                  disabled={a.staggerAmount === 0}
                  className="w-full border border-gray-300 rounded px-1 py-0.5 disabled:opacity-50"
                >
                  <option value="x">x</option>
                  <option value="y">y</option>
                  <option value="radial">radial</option>
                  <option value="diagonal">diagonal</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
