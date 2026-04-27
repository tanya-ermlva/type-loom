import { describe, it, expect } from 'vitest';
import { buildRandomAnimation } from './random';
import type { Treatment } from '../treatments/types';

/**
 * The random generator's correctness contract is shape-based:
 * - Output is a valid AnimationSpec (or null only with no targets, which
 *   doesn't happen because 'config' is always available).
 * - from / to live in the param's documented range.
 * - duration > 0.
 * Run many iterations to catch any edge case from random sampling.
 */
describe('buildRandomAnimation', () => {
  const ITERATIONS = 200;

  it('always returns a valid spec (config is always a valid target)', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation([]);
      expect(spec).not.toBeNull();
      expect(spec!.id).toBeTruthy();
      expect(spec!.paramKey).toBeTruthy();
      expect(spec!.duration).toBeGreaterThan(0);
    }
  });

  it('produces from ≠ to (visible movement)', () => {
    let differCount = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation([])!;
      if (spec.from !== spec.to) differCount++;
    }
    // Allow a few collisions from snap-to-step on tiny ranges, but expect most to differ.
    expect(differCount).toBeGreaterThan(ITERATIONS * 0.9);
  });

  it('targets enabled treatments more often than just config when available', () => {
    const treatments: Treatment[] = [
      { id: 'd1', type: 'drift',     enabled: true,  apply: () => ({} as never) } as Treatment,
      { id: 't1', type: 'tint',      enabled: true,  apply: () => ({} as never) } as Treatment,
      { id: 's1', type: 'silhouette', enabled: false, apply: () => ({} as never) } as Treatment,
    ];
    let configHits = 0;
    let treatmentHits = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation(treatments)!;
      if (spec.treatmentId === 'config') configHits++;
      else treatmentHits++;
    }
    // 3 targets total (drift, tint, config) — disabled silhouette excluded.
    // ~33% expected for config. Treatments should be majority.
    expect(treatmentHits).toBeGreaterThan(configHits);
  });

  it('skips disabled treatments', () => {
    const treatments: Treatment[] = [
      { id: 'd1', type: 'drift', enabled: false, apply: () => ({} as never) } as Treatment,
    ];
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation(treatments)!;
      // Only 'config' should ever be hit.
      expect(spec.treatmentId).toBe('config');
    }
  });
});
