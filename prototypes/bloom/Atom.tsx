/**
 * Bloom atom — two SVG circles centered at the same point:
 *   1. The DOT (rendered first) — the permanent identity. Stays visible
 *      across both states; never shrinks or fades by default.
 *   2. The OUTLINE (rendered on top) — a stroked circle whose geometric
 *      radius AND stroke width both grow from State A → State B. With a
 *      wide enough stroke, it visually covers the dot and extends beyond.
 *
 * The atom owns its preview RAF: when `playing` is true it loops `g`
 * 0 → 1 → 0 over `cycleDuration` seconds (ping-pong). When `gOverride` is
 * supplied, it bypasses the loop and uses that value verbatim — that's how
 * the manual slider works and how the bloom-stack will pipe per-atom
 * proximity-derived `g` values down without owning RAF.
 */
import { useEffect, useRef, useState } from 'react';
import type { BloomState, BlendMode } from './store';

interface Props {
  stateA: BloomState;
  stateB: BloomState;
  /** When true and gOverride is null, run the auto A↔B loop. */
  playing: boolean;
  cycleDuration: number;
  /** When set (not null), use this `g` directly and skip the loop. */
  gOverride?: number | null;
  blendMode?: BlendMode;
  bgColor?: string;
  /** SVG viewBox edge length. Atom is centered at (size/2, size/2). */
  size?: number;
}

// ---------- Color + numeric helpers ----------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hexToRgb(hex: string | undefined | null): [number, number, number] {
  // Defensive: a stale localStorage shape or HMR mid-edit can briefly leave
  // a color field as undefined. Fall back to black rather than crashing.
  if (typeof hex !== 'string') return [0, 0, 0];
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim().replace(/^#/, ''));
  if (!m) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

// ---------- Component ----------

export function Atom({
  stateA, stateB, playing, cycleDuration,
  gOverride = null, blendMode = 'normal', bgColor = '#FAFAFA', size = 200,
}: Props) {
  const [g, setG] = useState(0);
  const startRef = useRef(performance.now());

  useEffect(() => {
    // Override path: used by sidebar's manual slider, and later by bloom-stack.
    if (gOverride !== null) {
      setG(gOverride);
      return;
    }
    if (!playing) return;

    let raf = 0;
    startRef.current = performance.now();
    const loop = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const cyc = Math.max(0.1, cycleDuration);
      const phase = (elapsed % cyc) / cyc;             // 0..1
      // Ping-pong: 0 → 1 → 0 within one cycle.
      const next = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      setG(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, cycleDuration, gOverride]);

  // Interpolate every numeric field; lerp colors via RGB.
  const cx = size / 2;
  const cy = size / 2;

  const dotR = lerp(stateA.dotRadius, stateB.dotRadius, g);
  const dotColor = lerpColor(stateA.dotColor, stateB.dotColor, g);
  const dotOpacity = lerp(stateA.dotOpacity, stateB.dotOpacity, g);

  const outlineR = lerp(stateA.outlineRadius, stateB.outlineRadius, g);
  const outlineW = lerp(stateA.outlineStroke, stateB.outlineStroke, g);
  const outlineColor = lerpColor(stateA.outlineColor, stateB.outlineColor, g);
  const outlineOpacity = lerp(stateA.outlineOpacity, stateB.outlineOpacity, g);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      style={{ background: bgColor, display: 'block' }}
    >
      <g style={{ mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'] }}>
        {/* Dot — the permanent identity. Drawn first (under the outline). */}
        {dotOpacity > 0.001 && (
          <circle
            cx={cx} cy={cy} r={Math.max(0, dotR)}
            fill={dotColor}
            opacity={dotOpacity}
          />
        )}

        {/* Outline — the growing stroke. Drawn on top so a thick stroke
            visually covers the dot. */}
        {outlineOpacity > 0.001 && outlineW > 0.001 && (
          <circle
            cx={cx} cy={cy} r={Math.max(0, outlineR)}
            fill="none"
            stroke={outlineColor}
            strokeWidth={Math.max(0, outlineW)}
            opacity={outlineOpacity}
          />
        )}
      </g>
    </svg>
  );
}
