import { describe, it, expect } from 'vitest';
import { applyConfigAnimations } from './configAnim';
import { DEFAULT_BASE_CONFIG } from '../types';
import type { AnimationSpec } from './types';

const baseConfig = { ...DEFAULT_BASE_CONFIG, charSize: 40, rowSpacing: 50 };

const makeAnim = (paramKey: string, from: number, to: number): AnimationSpec => ({
  id: 'a',
  treatmentId: 'config',
  paramKey,
  from,
  to,
  curve: 'sine',
  duration: 4,
  delay: 0,
  staggerAmount: 0,
  staggerAxis: 'x',
});

describe('applyConfigAnimations', () => {
  it('returns config unchanged when no animations target it', () => {
    const anims: AnimationSpec[] = [];
    expect(applyConfigAnimations(baseConfig, anims, 0, 4)).toEqual(baseConfig);
  });

  it('returns config unchanged when no animations have treatmentId="config"', () => {
    const anims: AnimationSpec[] = [{ ...makeAnim('charSize', 20, 80), treatmentId: 'silhouette' }];
    expect(applyConfigAnimations(baseConfig, anims, 0, 4)).toEqual(baseConfig);
  });

  it('overlays animated value on the matching config field at t=0 (=from)', () => {
    const anims = [makeAnim('charSize', 20, 80)];
    const out = applyConfigAnimations(baseConfig, anims, 0, 4);
    expect(out.charSize).toBeCloseTo(20);
  });

  it('overlays animated value at midpoint (=to for sine)', () => {
    const anims = [makeAnim('charSize', 20, 80)];
    const out = applyConfigAnimations(baseConfig, anims, 2, 4);
    expect(out.charSize).toBeCloseTo(80);
  });

  it('handles multiple config animations on different fields', () => {
    const anims = [makeAnim('charSize', 20, 80), makeAnim('rowSpacing', 30, 90)];
    const out = applyConfigAnimations(baseConfig, anims, 0, 4);
    expect(out.charSize).toBeCloseTo(20);
    expect(out.rowSpacing).toBeCloseTo(30);
  });

  it('ignores config animations whose paramKey is not a numeric BaseGridConfig field', () => {
    const anims = [makeAnim('input', 0, 1)];  // not a numeric field
    const out = applyConfigAnimations(baseConfig, anims, 0, 4);
    expect(out.input).toBe(baseConfig.input);  // unchanged
  });
});
