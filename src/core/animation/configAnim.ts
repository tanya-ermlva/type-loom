import type { BaseGridConfig } from '../types';
import type { AnimationSpec } from './types';
import { evaluateAnimation } from './evaluate';

const ANIMATABLE_KEYS = ['charSize', 'rowSpacing', 'columnSpacing', 'charSpacing'] as const;
type AnimatableKey = (typeof ANIMATABLE_KEYS)[number];

const isAnimatableKey = (k: string): k is AnimatableKey =>
  (ANIMATABLE_KEYS as readonly string[]).includes(k);

/**
 * Return an "effective" BaseGridConfig with any active 'config'-targeted
 * animations overlaid. Stagger has no meaning for config animations
 * (config values aren't per-cell), so it's not applied here.
 */
export function applyConfigAnimations(
  config: BaseGridConfig,
  animations: AnimationSpec[],
  t: number,
  _loopDuration: number,
): BaseGridConfig {
  const configAnims = animations.filter((a) => a.treatmentId === 'config' && isAnimatableKey(a.paramKey));
  if (configAnims.length === 0) return config;

  const next: BaseGridConfig = { ...config };
  for (const anim of configAnims) {
    const key = anim.paramKey as AnimatableKey;
    const value = evaluateAnimation(anim, t);
    next[key] = Math.max(0.01, value);
  }
  return next;
}
