import type { EasingMode } from './store';

export const easings: Record<EasingMode, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) ** 2,
  easeInOut: (t) =>
    t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeOutQuart: (t) => 1 - (1 - t) ** 4,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/**
 * Per-token progress with stagger.
 * - First token always starts at progress=0.
 * - Last token always finishes at progress=1.
 * - Active window length per token: 1 - stagger.
 */
export function tokenProgress(
  progress: number,
  stagger: number,
  totalTokens: number,
  tokenIndex: number,
): number {
  const denom = Math.max(1, totalTokens - 1);
  const tokenOffset = (stagger * tokenIndex) / denom;
  const windowLength = Math.max(1e-9, 1 - stagger);
  const local = (progress - tokenOffset) / windowLength;
  return Math.min(1, Math.max(0, local));
}

/**
 * Deterministic, seeded "noise" in [-1, 1] for token jitter.
 * Mulberry32-derived; cheap and stable.
 */
export function jitterFor(seed: number, index: number): number {
  let s = (seed * 1_103_515_245 + index * 12_345 + 1) >>> 0;
  s ^= s >>> 13;
  s = (s * 1_274_126_177) >>> 0;
  s ^= s >>> 15;
  s = s >>> 0; // re-coerce to uint32 (xor produces signed int32 in JS)
  // Map uint32 → [-1, 1]
  return (s / 0xffffffff) * 2 - 1;
}

/** Simple linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
