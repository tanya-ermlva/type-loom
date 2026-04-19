import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import type { MaskParams, MaskShape } from '../core/mask/types';
import { DEFAULT_MASK } from '../core/mask/types';
import { Slider } from './controls/Slider';

interface MaskControlsProps {
  treatment: Treatment;
}

/**
 * UI inside each treatment card for managing the optional spatial mask.
 * Toggling enables/disables the mask; collapsed when disabled.
 */
export function MaskControls({ treatment }: MaskControlsProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeAnimation = useStore((s) => s.removeAnimation);
  const animations = useStore((s) => s.animations);

  const mask = treatment.mask ?? null;
  const enabled = mask !== null;

  const setMask = (next: MaskParams | null) => {
    const updated = { ...treatment, mask: next };
    updateTreatment(treatment.id, updated);
    // If turning the mask off, also drop any mask.* animations on this treatment
    // so they don't dangle.
    if (next === null) {
      animations
        .filter((a) => a.treatmentId === treatment.id && a.paramKey.startsWith('mask.'))
        .forEach((a) => removeAnimation(a.id));
    }
  };

  const updateMask = (patch: Partial<MaskParams>) => {
    if (!mask) return;
    setMask({ ...mask, ...patch });
  };

  return (
    <div className="border-t border-gray-100 pt-2 mt-2">
      <label className="flex items-center justify-between text-[11px] uppercase tracking-wider text-gray-400 cursor-pointer">
        <span>Mask</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setMask(e.target.checked ? { ...DEFAULT_MASK } : null)}
        />
      </label>
      {enabled && mask && (
        <div className="space-y-2 mt-2">
          <label className="block text-sm">
            <div className="text-gray-700 mb-1">Shape</div>
            <select
              value={mask.shape}
              onChange={(e) => updateMask({ shape: e.target.value as MaskShape })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="circle">Circle</option>
              <option value="rect">Rectangle</option>
            </select>
          </label>
          <Slider label="Center X" value={mask.centerX} min={0} max={1} step={0.01}
            onChange={(v) => updateMask({ centerX: v })} />
          <Slider label="Center Y" value={mask.centerY} min={0} max={1} step={0.01}
            onChange={(v) => updateMask({ centerY: v })} />
          <Slider label="Size X" value={mask.sizeX} min={0.01} max={1} step={0.01}
            onChange={(v) => updateMask({ sizeX: v })} />
          {mask.shape === 'rect' && (
            <Slider label="Size Y" value={mask.sizeY} min={0.01} max={1} step={0.01}
              onChange={(v) => updateMask({ sizeY: v })} />
          )}
          <Slider label="Softness" value={mask.softness} min={0} max={1} step={0.01}
            onChange={(v) => updateMask({ softness: v })} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mask.invert}
              onChange={(e) => updateMask({ invert: e.target.checked })}
            />
            <span className="text-gray-700">Invert</span>
          </label>
        </div>
      )}
    </div>
  );
}
