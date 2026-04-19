import { useId, type KeyboardEvent } from 'react';
import { NumberField } from './NumberField';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  /** When provided, render a small ✨ button to convert the current value into an animation. */
  onAnimate?: () => void;
}

/**
 * A range slider with an inline editable, scrubbable numeric value.
 *
 * Keyboard on the range slider:
 * - Arrow keys: ±1 step (browser default)
 * - Shift+Arrow: ±10 steps
 *
 * The numeric value to the right is a NumberField — drag it to scrub,
 * click to type, ±1/±10 with arrow keys.
 */
export function Slider({ label, value, min, max, step = 1, onChange, onAnimate }: SliderProps) {
  const id = useId();
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleRangeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey) return;
    let delta = 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step * 9;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step * 9;
    if (delta !== 0) onChange(clamp(value + delta));
  };

  return (
    <div className="block text-sm">
      <div className="flex justify-between items-center mb-1 gap-1">
        <label htmlFor={id} className="text-gray-700 truncate flex-1">{label}</label>
        {onAnimate && (
          <button
            type="button"
            onClick={onAnimate}
            className="text-gray-300 hover:text-blue-500 text-xs leading-none px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            title="Animate this from default → current value"
            aria-label={`Animate ${label}`}
          >
            ✨
          </button>
        )}
        <NumberField
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={onChange}
          className="w-16 text-right border border-transparent hover:border-gray-300 rounded px-1 text-gray-700 text-xs"
          ariaLabel={label}
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={handleRangeKeyDown}
        className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded accent-gray-900"
        title="Arrow keys: ±1 step. Shift+Arrow: ±10 steps."
      />
    </div>
  );
}
