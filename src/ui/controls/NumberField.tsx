import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';

interface NumberFieldProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
  className?: string;
  scrub?: boolean;
  /** Pixels of horizontal drag per `step` of value change. Default 2. */
  scrubSensitivity?: number;
  ariaLabel?: string;
  title?: string;
}

/**
 * A styled number input with two professional input affordances:
 *
 * - **Click-and-drag horizontally** on the input to scrub the value
 *   (Figma-style). One step per `scrubSensitivity` pixels (default 2).
 *   No-drag click focuses + selects for typing.
 * - **Arrow keys**: ±1 step. **Shift+Arrow**: ±10 steps.
 *
 * Cursor stays `ew-resize` when scrub is enabled to hint at the gesture.
 */
export function NumberField({
  value,
  min = -Infinity,
  max = Infinity,
  step = 1,
  onChange,
  className = '',
  scrub = true,
  scrubSensitivity = 2,
  ariaLabel,
  title,
}: NumberFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (v: number) => {
    if (!Number.isFinite(v)) return value;
    return Math.max(min, Math.min(max, v));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const mult = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(clamp(value + step * mult));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(clamp(value - step * mult));
    }
  };

  const handleMouseDown = (downEvent: MouseEvent<HTMLInputElement>) => {
    if (!scrub) return;
    // If the input is already focused, treat mousedown as a normal text caret
    // interaction (don't hijack into scrubbing).
    if (document.activeElement === inputRef.current) return;

    downEvent.preventDefault();
    const startX = downEvent.clientX;
    const startValue = value;
    let moved = false;

    const onMove = (ev: globalThis.MouseEvent) => {
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) > 3) {
        moved = true;
        setIsDragging(true);
      }
      if (moved) {
        const stepsMoved = Math.round(dx / scrubSensitivity);
        onChange(clamp(startValue + stepsMoved * step));
      }
    };

    const onUp = () => {
      if (!moved) {
        // No drag — treat as click. Focus and select all so the user can type.
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Keep the displayed value tidy: if step is integer-ish, show no decimals.
  const isIntStep = step >= 1 && Number.isInteger(step);
  const displayed = isIntStep ? Math.round(value) : value;

  return (
    <input
      ref={inputRef}
      type="number"
      value={displayed}
      step={step}
      min={min === -Infinity ? undefined : min}
      max={max === Infinity ? undefined : max}
      onChange={(e) => onChange(clamp(Number(e.target.value)))}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      aria-label={ariaLabel}
      title={title ?? (scrub ? 'Drag to scrub · click to type · ↑/↓: ±1 · Shift+↑/↓: ±10' : undefined)}
      className={`${className} tabular-nums focus:outline-none focus:border-blue-400 ${
        scrub ? (isDragging ? 'cursor-ew-resize' : 'cursor-ew-resize') : ''
      }`}
    />
  );
}
