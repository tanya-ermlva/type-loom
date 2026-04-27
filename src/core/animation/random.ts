import type { Treatment, TreatmentType } from '../treatments/types';
import type { AnimationSpec, AnimationCurve, StaggerAxis } from './types';

interface AnimatableParam {
  key: string;
  min: number;
  max: number;
  step: number;
}

/**
 * Animatable params per treatment type — a snapshot mirroring what each
 * treatment's UI card exposes via <AnimationsList animatableParams=... />.
 * The random generator picks one of these to animate.
 *
 * Mode-dependent params (like Spacing's frequency / scroll, only valid in
 * 'sine' mode) are intentionally omitted — animating them on a non-sine
 * spacing would silently no-op. The broadly-valid params for every type
 * are sufficient for surprise.
 */
const ANIMATABLE_BY_TYPE: Record<TreatmentType, AnimatableParam[]> = {
  silhouette: [
    { key: 'size',     min: 0.05, max: 1.5, step: 0.01 },
    { key: 'softness', min: 0,    max: 1,   step: 0.01 },
  ],
  drift: [
    { key: 'amplitude', min: 0, max: 200, step: 1 },
    { key: 'frequency', min: 0, max: 2,   step: 0.01 },
    { key: 'phase',     min: 0, max: 1,   step: 0.01 },
  ],
  spacing: [
    { key: 'amplitude', min: 0, max: 1, step: 0.01 },
  ],
  scale: [
    { key: 'min', min: 0.05, max: 3, step: 0.05 },
    { key: 'max', min: 0.05, max: 3, step: 0.05 },
  ],
  rotation: [
    { key: 'minDegrees', min: -180, max: 180, step: 1 },
    { key: 'maxDegrees', min: -180, max: 180, step: 1 },
  ],
  tint: [
    { key: 'minOpacity', min: 0, max: 1, step: 0.01 },
    { key: 'maxOpacity', min: 0, max: 1, step: 0.01 },
  ],
  charSwap: [
    { key: 'seed', min: 0, max: 100, step: 1 },
  ],
  charScramble: [
    { key: 'flipsPerSecond', min: 1, max: 60, step: 1 },
    { key: 'settleStart',    min: 0, max: 10, step: 0.1 },
  ],
  charField: [
    { key: 'scroll', min: 0, max: 1, step: 0.01 },
  ],
};

/** Base-grid (config) params that are also animatable via treatmentId='config'. */
const CONFIG_ANIMATABLE: AnimatableParam[] = [
  { key: 'charSize',      min: 8, max: 200, step: 1 },
  { key: 'rowSpacing',    min: 4, max: 200, step: 1 },
  { key: 'columnSpacing', min: 0, max: 300, step: 1 },
  { key: 'charSpacing',   min: 4, max: 200, step: 1 },
  { key: 'edgePadding',   min: 0, max: 300, step: 1 },
];

const CURVES: readonly AnimationCurve[] = ['sine', 'triangle', 'sawtooth', 'ease-in-out'];
const STAGGER_AXES: readonly StaggerAxis[] = ['x', 'y', 'radial', 'diagonal'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Snap a value to the param's step grid. */
function snap(value: number, step: number, min: number, max: number): number {
  const snapped = Math.round(value / step) * step;
  // Avoid floating-point drift like 0.30000000000000004
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const cleaned = Number(snapped.toFixed(decimals));
  return Math.max(min, Math.min(max, cleaned));
}

/**
 * Build a random animation spec.
 *
 * Picks a random target — either an enabled treatment or the base config —
 * then a random animatable param on it, then random from/to spanning roughly
 * 40-90% of the param's range somewhere inside it. Curve and stagger are
 * also randomized. Returns null only if there are zero possible targets
 * (effectively never, since 'config' is always available).
 *
 * Constraints:
 * - from ≠ to (we ensure visible movement by sizing span to 40%+)
 * - Both clamped + snapped to the param's step grid
 * - 50% chance of stagger when target is a treatment (config doesn't stagger)
 */
export function buildRandomAnimation(treatments: Treatment[]): AnimationSpec | null {
  type Target = {
    treatmentId: string;
    treatmentType?: TreatmentType;
    params: AnimatableParam[];
  };
  const targets: Target[] = [];

  for (const t of treatments) {
    if (!t.enabled) continue;
    const params = ANIMATABLE_BY_TYPE[t.type];
    if (params && params.length > 0) {
      targets.push({ treatmentId: t.id, treatmentType: t.type, params });
    }
  }
  // Config is always a valid target — it's animatable even with zero treatments.
  targets.push({ treatmentId: 'config', params: CONFIG_ANIMATABLE });

  if (targets.length === 0) return null;

  const target = pick(targets);
  const param = pick(target.params);

  // Span 40-90% of the param's range. Center placed so [center ± span/2] fits.
  const range = param.max - param.min;
  const spanFrac = 0.4 + Math.random() * 0.5;
  const span = range * spanFrac;
  const halfSpan = span / 2;
  // Pick a center such that from/to don't both clamp to one edge.
  const center = param.min + halfSpan + Math.random() * (range - span);

  const from = snap(center - halfSpan, param.step, param.min, param.max);
  const to = snap(center + halfSpan, param.step, param.min, param.max);

  const wantStagger = target.treatmentId !== 'config' && Math.random() < 0.5;
  const staggerAmount = wantStagger ? Number((0.5 + Math.random() * 3.5).toFixed(1)) : 0;
  const staggerAxis = pick(STAGGER_AXES);

  return {
    id: crypto.randomUUID(),
    treatmentId: target.treatmentId,
    treatmentType: target.treatmentType,
    paramKey: param.key,
    from,
    to,
    curve: pick(CURVES),
    duration: Number((1.5 + Math.random() * 6.5).toFixed(1)),
    delay: 0,
    staggerAmount,
    staggerAxis,
  };
}
