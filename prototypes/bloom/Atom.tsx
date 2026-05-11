/**
 * Bloom atom — two filled SVG circles centered at the same point that swap:
 *   1. BIG (rendered first, behind) — invisible at rest, grows past the
 *      small's radius and becomes the dominant visual at full activity.
 *   2. SMALL (rendered on top) — fully visible at rest, shrinks toward 0
 *      as the big takes over.
 *
 * The atom owns its preview RAF: when `playing` is true it loops `g`
 * 0 → 1 → 0 over `cycleDuration` seconds (ping-pong). When `gOverride` is
 * supplied, it bypasses the loop and uses that value verbatim — that's how
 * the manual slider works and how the bloom-stack pipes per-atom
 * field-strength values down without owning RAF.
 */
import { useEffect, useRef, useState } from 'react';
import type { BloomState, BlendMode, CircleTransition } from './store';
import { easings } from '../pulse/animation';

interface Props {
  stateA: BloomState;
  stateB: BloomState;
  /** Per-circle transition shape — speed (via range) + easing curve. */
  smallTransition: CircleTransition;
  bigTransition: CircleTransition;
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

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Map the bloom's overall g into ONE circle's progress 0..1.
 *
 *   g < start          → 0 (circle pinned to State A)
 *   start ≤ g ≤ end    → ease(localProgress)
 *   g > end            → 1 (circle pinned to State B)
 *
 * Degenerate case start ≥ end: instant flip at g >= start (mimics a step).
 */
export function applyTransition(g: number, t: CircleTransition): number {
  if (t.end <= t.start) return g >= t.start ? 1 : 0;
  const local = clamp01((g - t.start) / (t.end - t.start));
  if (t.easing === 'cubic-bezier') return local; // bezier needs a curve param we don't pipe here
  const fn = easings[t.easing] ?? easings.linear;
  return fn(local);
}

// ---------- Component ----------

export function Atom({
  stateA, stateB, smallTransition, bigTransition, playing, cycleDuration,
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

  // Each circle gets its own local progress through A → B: a [start, end]
  // sub-range of g plus an easing curve. Outside that range the circle
  // pins to A (below start) or B (above end).
  const gSmall = applyTransition(g, smallTransition);
  const gBig = applyTransition(g, bigTransition);

  const smallR = lerp(stateA.smallRadius, stateB.smallRadius, gSmall);
  const smallColor = lerpColor(stateA.smallColor, stateB.smallColor, gSmall);
  const smallOpacity = lerp(stateA.smallOpacity, stateB.smallOpacity, gSmall);

  const bigR = lerp(stateA.bigRadius, stateB.bigRadius, gBig);
  const bigColor = lerpColor(stateA.bigColor, stateB.bigColor, gBig);
  const bigOpacity = lerp(stateA.bigOpacity, stateB.bigOpacity, gBig);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      style={{ background: bgColor, display: 'block' }}
    >
      <g style={{ mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'] }}>
        {/* Big circle — drawn first so it sits BEHIND the small. Invisible at
            rest (radius 0), grows past the small at active. */}
        {bigOpacity > 0.001 && bigR > 0.001 && (
          <circle
            cx={cx} cy={cy} r={Math.max(0, bigR)}
            fill={bigColor}
            opacity={bigOpacity}
          />
        )}

        {/* Small circle — drawn on top. Full size at rest, shrinks to 0
            as the big takes over. */}
        {smallOpacity > 0.001 && smallR > 0.001 && (
          <circle
            cx={cx} cy={cy} r={Math.max(0, smallR)}
            fill={smallColor}
            opacity={smallOpacity}
          />
        )}
      </g>
    </svg>
  );
}
