import { useId, type KeyboardEvent } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
}

/**
 * A range slider with an inline editable numeric value.
 *
 * Keyboard:
 * - Arrow keys: ±1 step (browser default)
 * - Shift+Arrow: ±10 steps
 * - Type into the numeric field for direct entry
 */
export function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  const id = useId();
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey) return;
    let delta = 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step * 9;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step * 9;
    if (delta !== 0) {
      // Browser already moved by 1×step; we add 9× more to land on a clean 10× shift.
      onChange(clamp(value + delta));
    }
  };

  return (
    <div className="block text-sm">
      <div className="flex justify-between items-center mb-1 gap-2">
        <label htmlFor={id} className="text-gray-700 truncate">{label}</label>
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="w-16 text-right border border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none rounded px-1 text-gray-700 tabular-nums text-xs"
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
        onKeyDown={handleKeyDown}
        className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
        title="Arrow keys: ±1 step. Shift+Arrow: ±10 steps."
      />
    </div>
  );
}
