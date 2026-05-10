/**
 * CurveEditor — interactive cubic-bezier curve editor.
 *
 * Two draggable control points (P1, P2). Curve interpolates between fixed
 * P0 = (0, 0) and P3 = (1, 1). Y values can go outside [0, 1] for overshoot
 * (Back / Elastic-style curves). X values clamp to [0, 1].
 *
 * The editor stores its value as { x1, y1, x2, y2 } — same shape as CSS
 * cubic-bezier(). Compatible with `cubicBezierFn` in animation.ts.
 */
import { useEffect, useRef, useState } from 'react';
import type { CubicBezierCurve } from './store';

interface CurveEditorProps {
  value: CubicBezierCurve;
  onChange: (next: CubicBezierCurve) => void;
  /** Editor pixel size (square). Default 220. */
  size?: number;
}

const Y_MIN = -0.5; // allow overshoot below 0
const Y_MAX = 1.5;  // and above 1

export function CurveEditor({ value, onChange, size = 220 }: CurveEditorProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<null | 'p1' | 'p2'>(null);

  // Map from value-space (x ∈ [0,1], y ∈ [Y_MIN, Y_MAX]) to SVG coords.
  const padding = 16;
  const w = size - padding * 2;
  const h = size - padding * 2;
  const xToSvg = (x: number) => padding + x * w;
  const yToSvg = (y: number) => padding + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * h;
  const svgToX = (sx: number) => Math.min(1, Math.max(0, (sx - padding) / w));
  const svgToY = (sy: number) => Math.min(Y_MAX, Math.max(Y_MIN, Y_MIN + (1 - (sy - padding) / h) * (Y_MAX - Y_MIN)));

  // Build the bezier path: M (0,0) C (P1) (P2) (1,1)
  const path =
    `M ${xToSvg(0)} ${yToSvg(0)} ` +
    `C ${xToSvg(value.x1)} ${yToSvg(value.y1)}, ` +
    `${xToSvg(value.x2)} ${yToSvg(value.y2)}, ` +
    `${xToSvg(1)} ${yToSvg(1)}`;

  // Drag handlers (mousemove on document so dragging continues outside SVG).
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const svg = ref.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const x = svgToX(sx);
      const y = svgToY(sy);
      onChange(dragging === 'p1' ? { ...value, x1: x, y1: y } : { ...value, x2: x, y2: y });
    };
    const onUp = () => setDragging(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, value]);

  // Numeric inputs.
  const NumInput = ({ label, val, onSet, min, max }: {
    label: string; val: number; onSet: (v: number) => void; min: number; max: number;
  }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
      <span style={{ width: 18, color: '#a1a1aa', fontFamily: 'ui-monospace, monospace' }}>{label}</span>
      <input type="number" step={0.01} min={min} max={max} value={val.toFixed(2)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onSet(Math.min(max, Math.max(min, n)));
        }}
        style={{
          width: 50, fontSize: 10, fontFamily: 'ui-monospace, monospace',
          background: '#0a0a0a', color: '#e4e4e7',
          border: '1px solid #3f3f46', borderRadius: 3, padding: '1px 4px',
        }} />
    </label>
  );

  return (
    <div>
      <svg
        ref={ref} width={size} height={size}
        style={{ background: '#0a0a0a', borderRadius: 4, border: '1px solid #27272a', display: 'block' }}
      >
        {/* Background grid: y = 0, 1 (the unit cell) */}
        <line x1={padding} y1={yToSvg(0)} x2={size - padding} y2={yToSvg(0)}
          stroke="#3f3f46" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={padding} y1={yToSvg(1)} x2={size - padding} y2={yToSvg(1)}
          stroke="#3f3f46" strokeWidth={1} strokeDasharray="3 3" />

        {/* Control handles (lines from anchors to P1/P2) */}
        <line x1={xToSvg(0)} y1={yToSvg(0)} x2={xToSvg(value.x1)} y2={yToSvg(value.y1)}
          stroke="#71717a" strokeWidth={1} />
        <line x1={xToSvg(1)} y1={yToSvg(1)} x2={xToSvg(value.x2)} y2={yToSvg(value.y2)}
          stroke="#71717a" strokeWidth={1} />

        {/* The curve itself */}
        <path d={path} stroke="#60a5fa" strokeWidth={2} fill="none" />

        {/* P0 & P3 (fixed anchors) */}
        <circle cx={xToSvg(0)} cy={yToSvg(0)} r={3} fill="#71717a" />
        <circle cx={xToSvg(1)} cy={yToSvg(1)} r={3} fill="#71717a" />

        {/* P1 (red) — draggable */}
        <circle cx={xToSvg(value.x1)} cy={yToSvg(value.y1)} r={7}
          fill="#ef4444" stroke="#fff" strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={(e) => { e.preventDefault(); setDragging('p1'); }} />
        {/* P2 (blue) — draggable */}
        <circle cx={xToSvg(value.x2)} cy={yToSvg(value.y2)} r={7}
          fill="#3b82f6" stroke="#fff" strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={(e) => { e.preventDefault(); setDragging('p2'); }} />
      </svg>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        marginTop: 8, fontSize: 10,
      }}>
        <NumInput label="x1" val={value.x1} onSet={(v) => onChange({ ...value, x1: v })} min={0} max={1} />
        <NumInput label="y1" val={value.y1} onSet={(v) => onChange({ ...value, y1: v })} min={Y_MIN} max={Y_MAX} />
        <NumInput label="x2" val={value.x2} onSet={(v) => onChange({ ...value, x2: v })} min={0} max={1} />
        <NumInput label="y2" val={value.y2} onSet={(v) => onChange({ ...value, y2: v })} min={Y_MIN} max={Y_MAX} />
      </div>

      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Drag <span style={{ color: '#ef4444' }}>P1</span> /{' '}
        <span style={{ color: '#3b82f6' }}>P2</span>. Y can go below 0 / above 1 for overshoot
        (Back / Elastic-style). X clamps to [0, 1].
      </p>
    </div>
  );
}
