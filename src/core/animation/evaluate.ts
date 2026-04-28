import type { AnimationSpec, StaggerAxis } from './types';

/**
 * Compute the per-cell stagger fraction (0..1) for the given (row, col)
 * within a grid of (rows, columns). Used to delay each cell's animation
 * proportionally to its position along the chosen axis.
 */
export function staggerFraction(
  row: number,
  col: number,
  rows: number,
  columns: number,
  axis: StaggerAxis,
): number {
  const xf = columns <= 1 ? 0 : col / (columns - 1);
  const yf = rows <= 1 ? 0 : row / (rows - 1);
  switch (axis) {
    case 'x':
      return xf;
    case 'x-reverse':
      return 1 - xf;
    case 'y':
      return yf;
    case 'y-reverse':
      return 1 - yf;
    case 'diagonal':
      return (xf + yf) / 2;
    case 'anti-diagonal':
      // Top-right (xf=1, yf=0) → bottom-left (xf=0, yf=1)
      return ((1 - xf) + yf) / 2;
    case 'radial': {
      const nx = xf * 2 - 1;
      const ny = yf * 2 - 1;
      return Math.min(1, Math.sqrt(nx * nx + ny * ny) / Math.SQRT2);
    }
    case 'radial-in': {
      const nx = xf * 2 - 1;
      const ny = yf * 2 - 1;
      return 1 - Math.min(1, Math.sqrt(nx * nx + ny * ny) / Math.SQRT2);
    }
    case 'random': {
      // Deterministic per-cell hash — same row/col always picks the same fraction,
      // so the chaotic burst is stable across frames (no flicker).
      const seed = row * 73856093 ^ col * 19349663;
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    }
  }
}

/**
 * Evaluate the current value of an animated parameter at time `t` (seconds).
 *
 * - sine / ease-in-out: smooth back-and-forth between `from` and `to`
 * - triangle: linear up to `to` at half-duration, linear back to `from`
 * - sawtooth: linear from `from` to `to`, then snap back
 *
 * `delay` shifts the phase. The animation cycles with period `duration`.
 */
export function evaluateAnimation(spec: AnimationSpec, t: number): number {
  if (spec.duration <= 0) return spec.from;

  const adjustedT = t - spec.delay;
  // Wrap into [0, duration) — handles negative delay too
  const wrapped = ((adjustedT % spec.duration) + spec.duration) % spec.duration;
  const phase = wrapped / spec.duration;  // 0..1

  let progress: number;
  switch (spec.curve) {
    case 'sine':
    case 'ease-in-out':
      // 0 at phase=0, 1 at phase=0.5, 0 at phase=1
      progress = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      break;
    case 'triangle':
      progress = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      break;
    case 'sawtooth':
      progress = phase;
      break;
  }

  return spec.from + (spec.to - spec.from) * progress;
}

/**
 * Compute the smallest seamless loop duration: the LCM of all active
 * animation durations. Because each cell's phase is purely a function of
 * `t % duration`, the loop wraps without visible jumps as long as
 * `loopDuration` is a multiple of every animation's `duration`.
 *
 * Stagger doesn't enter the calculation — it shifts per-cell *phase*, but
 * the per-cell phase repeats every `duration` regardless of stagger.
 *
 * Float durations are quantized to 0.05s before LCM so the math stays
 * stable. Returns 4s when no animations are active.
 */
export function computeLoopDuration(specs: AnimationSpec[]): number {
  if (specs.length === 0) return 4;
  const PRECISION = 20; // units per second (0.05s granularity)
  const ints = specs.map((s) => Math.max(1, Math.round(s.duration * PRECISION)));
  let result = ints[0];
  for (let i = 1; i < ints.length; i++) {
    result = lcm(result, ints[i]);
    if (!Number.isFinite(result)) return Math.max(...specs.map((s) => s.duration));
  }
  return result / PRECISION;
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}
