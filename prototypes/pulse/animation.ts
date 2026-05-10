/**
 * Animation helpers — easings (full Penner set per easings.net + custom
 * cubic-bezier), per-token stagger, deterministic jitter, and lerp.
 */
import type { CharacterEffect, EasingMode } from './store';

// ---------- Standard easings (30 from easings.net) ----------

const c1 = 1.70158;          // Back tension constant
const c2 = c1 * 1.525;       // InOutBack tension
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3; // Elastic period
const c5 = (2 * Math.PI) / 4.5;

const n1 = 7.5625;            // Bounce coefficients
const d1 = 2.75;
const easeOutBounce = (t: number) => {
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { const u = t - 1.5 / d1; return n1 * u * u + 0.75; }
  if (t < 2.5 / d1) { const u = t - 2.25 / d1; return n1 * u * u + 0.9375; }
  const u = t - 2.625 / d1;
  return n1 * u * u + 0.984375;
};

/**
 * Named easing functions. Excludes 'cubic-bezier' which depends on params —
 * use `easingFn(mode, curve)` to resolve a function for any mode including bezier.
 */
export const easings: Record<Exclude<EasingMode, 'cubic-bezier'>, (t: number) => number> = {
  linear: (t) => t,

  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),

  easeInCubic:    (t) => t ** 3,
  easeOutCubic:   (t) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2),

  easeInQuart:    (t) => t ** 4,
  easeOutQuart:   (t) => 1 - (1 - t) ** 4,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - ((-2 * t + 2) ** 4) / 2),

  easeInQuint:    (t) => t ** 5,
  easeOutQuint:   (t) => 1 - (1 - t) ** 5,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - ((-2 * t + 2) ** 5) / 2),

  easeInExpo:    (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo:   (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) =>
    t === 0 ? 0
    : t === 1 ? 1
    : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2,

  easeInCirc:    (t) => 1 - Math.sqrt(1 - t ** 2),
  easeOutCirc:   (t) => Math.sqrt(1 - (t - 1) ** 2),
  easeInOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
      : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2,

  easeInBack:    (t) => c3 * t ** 3 - c1 * t ** 2,
  easeOutBack:   (t) => 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2,
  easeInOutBack: (t) =>
    t < 0.5
      ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2
      : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,

  easeInElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1
    : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4),
  easeOutElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1,
  easeInOutElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1
    : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1,

  easeInBounce:    (t) => 1 - easeOutBounce(1 - t),
  easeOutBounce:   easeOutBounce,
  easeInOutBounce: (t) =>
    t < 0.5
      ? (1 - easeOutBounce(1 - 2 * t)) / 2
      : (1 + easeOutBounce(2 * t - 1)) / 2,

  // ---------- Legacy aliases (preserve persisted state from earlier versions) ----------
  easeIn:    (t) => t * t,
  easeOut:   (t) => 1 - (1 - t) ** 2,
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
};

// ---------- Custom cubic bezier ----------

export interface CubicBezier {
  x1: number; y1: number; x2: number; y2: number;
}

export const DEFAULT_BEZIER: CubicBezier = { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 }; // CSS "ease"

/**
 * Build an easing function from a CSS-style cubic-bezier (P0=0,0; P1; P2; P3=1,1).
 * Uses bisection to find the parameter `u` such that x(u) = t, then evaluates y(u).
 */
export function cubicBezierFn(curve: CubicBezier): (t: number) => number {
  const { x1, y1, x2, y2 } = curve;
  const bezier = (a: number, b: number, u: number) =>
    3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u ** 2 * b + u ** 3;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
      const u = (lo + hi) / 2;
      const x = bezier(x1, x2, u);
      if (x < t) lo = u; else hi = u;
    }
    return bezier(y1, y2, (lo + hi) / 2);
  };
}

/** Resolve any easing mode (named or cubic-bezier) to a concrete function. */
export function easingFn(mode: EasingMode, curve?: CubicBezier): (t: number) => number {
  if (mode === 'cubic-bezier') return cubicBezierFn(curve ?? DEFAULT_BEZIER);
  return easings[mode] ?? easings.linear;
}

// ---------- Other helpers ----------

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
  return (s / 0xffffffff) * 2 - 1;
}

/** Simple linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------- Character effects (unchanged) ----------

export interface CharacterDelta {
  dx: number;
  dy: number;
  rotate: number;
  scaleY: number;
}

const NEUTRAL: CharacterDelta = { dx: 0, dy: 0, rotate: 0, scaleY: 1 };

export function characterEffect(
  effect: CharacterEffect,
  charIdx: number,
  totalChars: number,
  localProg: number,
  amplitude: number,
): CharacterDelta {
  if (effect === 'none' || amplitude === 0 || totalChars <= 0) return NEUTRAL;
  const envelope = Math.sin(localProg * Math.PI);
  const denom = Math.max(1, totalChars - 1);

  switch (effect) {
    case 'bow': {
      const arcShape = Math.sin((charIdx / denom) * Math.PI);
      return { dx: 0, dy: -amplitude * arcShape * envelope, rotate: 0, scaleY: 1 };
    }
    case 'fan': {
      const center = denom / 2;
      const offset = charIdx - center;
      const angle = center > 0 ? (offset / center) * amplitude : 0;
      return { dx: 0, dy: 0, rotate: angle * envelope, scaleY: 1 };
    }
    case 'stretch': {
      const factor = 1 + (amplitude / 100) * envelope;
      return { dx: 0, dy: 0, rotate: 0, scaleY: factor };
    }
    case 'wave': {
      const phase = (charIdx / denom) * Math.PI * 2;
      const wave = Math.sin(phase + localProg * Math.PI * 2);
      return { dx: 0, dy: -amplitude * wave, rotate: 0, scaleY: 1 };
    }
    default:
      return NEUTRAL;
  }
}
