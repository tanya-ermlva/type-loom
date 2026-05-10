import type { CharacterEffect, EasingMode } from './store';

/** Per-letter transformation result. dx/dy are pixels; rotate is degrees; scaleY is a multiplier. */
export interface CharacterDelta {
  dx: number;
  dy: number;
  rotate: number;
  scaleY: number;
}

const NEUTRAL: CharacterDelta = { dx: 0, dy: 0, rotate: 0, scaleY: 1 };

/**
 * Per-letter transformation for a given character within a token.
 *
 * @param effect      which visual effect to apply
 * @param charIdx     index of this character in the token
 * @param totalChars  total number of characters in the token
 * @param localProg   0..1 progress within this character's stagger window
 * @param amplitude   strength of the effect (px for translation, degrees for rotate, factor for scale)
 *
 * The effect is enveloped via sin(localProg·π) so each character returns to neutral
 * at the start and end of its window — the cycle reads as a smooth ripple.
 */
export function characterEffect(
  effect: CharacterEffect,
  charIdx: number,
  totalChars: number,
  localProg: number,
  amplitude: number,
): CharacterDelta {
  if (effect === 'none' || amplitude === 0 || totalChars <= 0) return NEUTRAL;
  const envelope = Math.sin(localProg * Math.PI); // 0 → 1 → 0 across the window
  const denom = Math.max(1, totalChars - 1);

  switch (effect) {
    case 'bow': {
      // Word arches: y offset shaped like sin(π · charIdx/N)
      const arcShape = Math.sin((charIdx / denom) * Math.PI);
      return { dx: 0, dy: -amplitude * arcShape * envelope, rotate: 0, scaleY: 1 };
    }
    case 'fan': {
      // Each char rotates, sign opposite on each side of word centre
      const center = denom / 2;
      const offset = charIdx - center;
      const angle = center > 0 ? (offset / center) * amplitude : 0;
      return { dx: 0, dy: 0, rotate: angle * envelope, scaleY: 1 };
    }
    case 'stretch': {
      // Vertical scale pulses through 1 + amplitude/100 (amplitude treated as percent)
      const factor = 1 + (amplitude / 100) * envelope;
      return { dx: 0, dy: 0, rotate: 0, scaleY: factor };
    }
    case 'wave': {
      // Continuous sine wave that travels through the word; localProg drives phase
      const phase = (charIdx / denom) * Math.PI * 2;
      const wave = Math.sin(phase + localProg * Math.PI * 2);
      return { dx: 0, dy: -amplitude * wave, rotate: 0, scaleY: 1 };
    }
    default:
      return NEUTRAL;
  }
}

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
