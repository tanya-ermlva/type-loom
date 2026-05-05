import { useMemo } from 'react';
import type { FalloffKind } from '../types';
import { falloff } from '../compress';

interface Props {
  kind: FalloffKind;
  width?: number;
  height?: number;
}

// Tiny SVG sparkline showing the selected falloff curve. Lives next to the
// dropdown so the user sees curve shape change in sync with the selection.
// X = normalized distance from field center (0 → 1).
// Y = force multiplier (1 → 0).
export function FalloffPreview({ kind, width = 88, height = 56 }: Props) {
  const path = useMemo(() => {
    const samples = 40;
    const pad = 4;
    const w = width - pad * 2;
    const h = height - pad * 2;
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const f = falloff(t, kind);
      const px = pad + t * w;
      const py = pad + (1 - f) * h;
      d += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)} `;
    }
    return d;
  }, [kind, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="rounded bg-zinc-950 border border-zinc-800"
    >
      {/* Dotted axis baseline at y=0 (force=0) */}
      <line
        x1={4}
        x2={width - 4}
        y1={height - 4}
        y2={height - 4}
        stroke="#3f3f46"
        strokeDasharray="2 2"
      />
      <path d={path} stroke="#60a5fa" strokeWidth={1.5} fill="none" />
    </svg>
  );
}
