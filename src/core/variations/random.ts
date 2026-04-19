import type { Treatment, TreatmentType } from '../treatments/types';
import type { AnimationSpec, AnimationCurve, StaggerAxis } from '../animation/types';
import { recreateTreatment, type TreatmentParams } from '../treatments/factory';

export interface Variation {
  id: string;
  treatment: Treatment;
  animation: AnimationSpec | null;
}

const TREATMENT_TYPES: TreatmentType[] = [
  'silhouette', 'drift', 'spacing', 'scale', 'rotation', 'tint',
];

const CURVES: AnimationCurve[] = ['sine', 'triangle', 'sawtooth', 'ease-in-out'];
const STAGGER_AXES: StaggerAxis[] = ['x', 'y', 'radial', 'diagonal'];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function maybe(chance: number): boolean {
  return Math.random() < chance;
}

interface SeededTreatment {
  params: TreatmentParams;
  animatableKeys: string[];
}

function seedTreatment(type: TreatmentType): SeededTreatment {
  switch (type) {
    case 'silhouette':
      return {
        params: {
          shape: 'lens',
          size: rand(0.4, 1.2),
          softness: rand(0, 0.4),
          invert: maybe(0.25),
        },
        animatableKeys: ['size', 'softness'],
      };
    case 'drift':
      return {
        params: {
          axis: pick(['x', 'y', 'both'] as const),
          amplitude: rand(15, 70),
          frequency: rand(0.2, 1.0),
        },
        animatableKeys: ['amplitude', 'frequency'],
      };
    case 'spacing':
      return {
        params: {
          pattern: pick(['tight-middle', 'tight-edges', 'sine'] as const),
          amplitude: rand(0.2, 0.7),
          frequency: rand(0.5, 3),
        },
        animatableKeys: ['amplitude', 'frequency'],
      };
    case 'scale':
      return {
        params: {
          pattern: pick(['radial', 'linear-x', 'linear-y'] as const),
          min: rand(0.4, 0.8),
          max: rand(1.1, 2.0),
        },
        animatableKeys: ['min', 'max'],
      };
    case 'rotation':
      return {
        params: {
          pattern: pick(['radial', 'linear-x', 'linear-y', 'random'] as const),
          minDegrees: rand(-90, -10),
          maxDegrees: rand(10, 90),
        },
        animatableKeys: ['minDegrees', 'maxDegrees'],
      };
    case 'tint':
      return {
        params: {
          mode: 'opacity',
          pattern: pick(['radial', 'linear-x', 'linear-y'] as const),
          minOpacity: rand(0.1, 0.4),
          maxOpacity: rand(0.7, 1),
          colorA: '#1a1a4d',
          colorB: '#f0bb44',
        },
        animatableKeys: ['minOpacity', 'maxOpacity'],
      };
  }
}

function makeRandomAnimation(
  treatmentId: string,
  treatmentType: TreatmentType,
  paramKey: string,
  baseValue: number,
): AnimationSpec {
  const span = Math.max(0.05, Math.abs(baseValue) || 1);
  return {
    id: crypto.randomUUID(),
    treatmentId,
    treatmentType,
    paramKey,
    from: baseValue - span * rand(0.2, 0.6),
    to: baseValue + span * rand(0.2, 0.8),
    curve: pick(CURVES),
    duration: rand(2, 5),
    delay: 0,
    staggerAmount: maybe(0.7) ? rand(0.5, 3) : 0,
    staggerAxis: pick(STAGGER_AXES),
  };
}

/**
 * Generate one randomly-parameterized treatment with one random animation
 * on one of its numeric params. If `forcedType` is given, uses that
 * treatment type; otherwise picks one at random.
 */
export function generateRandomVariation(forcedType?: TreatmentType): Variation {
  const type = forcedType ?? pick(TREATMENT_TYPES);
  const seeded = seedTreatment(type);
  const treatmentId = crypto.randomUUID();
  const treatment = recreateTreatment(type, seeded.params, treatmentId, true);

  const paramKey = pick(seeded.animatableKeys);
  const baseValue = Number((seeded.params as unknown as Record<string, unknown>)[paramKey] ?? 1);
  const animation = makeRandomAnimation(treatmentId, type, paramKey, baseValue);

  return { id: crypto.randomUUID(), treatment, animation };
}

/**
 * Generate four variations, biased to give each cell a different
 * treatment type (so the user sees a varied palette of effects).
 */
export function generateFourVariations(): Variation[] {
  const shuffled = [...TREATMENT_TYPES].sort(() => Math.random() - 0.5).slice(0, 4);
  return shuffled.map((t) => generateRandomVariation(t));
}
