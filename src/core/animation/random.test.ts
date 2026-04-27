import { describe, it, expect } from 'vitest';
import { buildRandomAnimation, hasRandomTarget } from './random';
import type { Treatment } from '../treatments/types';

const ITERATIONS = 200;

const mockTreatment = (id: string, type: Treatment['type'], enabled: boolean): Treatment =>
  ({ id, type, enabled, apply: () => ({} as never) }) as Treatment;

describe('buildRandomAnimation', () => {
  it('returns null when there are no enabled treatments', () => {
    expect(buildRandomAnimation([])).toBeNull();
  });

  it('returns null when only disabled treatments exist', () => {
    const treatments = [mockTreatment('d1', 'drift', false)];
    for (let i = 0; i < ITERATIONS; i++) {
      expect(buildRandomAnimation(treatments)).toBeNull();
    }
  });

  it('returns a valid spec when at least one enabled treatment is present', () => {
    const treatments = [mockTreatment('d1', 'drift', true)];
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation(treatments);
      expect(spec).not.toBeNull();
      expect(spec!.id).toBeTruthy();
      expect(spec!.paramKey).toBeTruthy();
      expect(spec!.duration).toBeGreaterThan(0);
      expect(spec!.treatmentId).toBe('d1');
    }
  });

  it('produces from ≠ to (visible movement)', () => {
    const treatments = [mockTreatment('d1', 'drift', true)];
    let differCount = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation(treatments)!;
      if (spec.from !== spec.to) differCount++;
    }
    // Allow a few snap-to-step collisions on tiny ranges.
    expect(differCount).toBeGreaterThan(ITERATIONS * 0.9);
  });

  it('never picks a disabled treatment when mixed with enabled ones', () => {
    const treatments = [
      mockTreatment('d1', 'drift', true),
      mockTreatment('d2', 'drift', false),
      mockTreatment('t1', 'tint',  true),
    ];
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation(treatments)!;
      expect(['d1', 't1']).toContain(spec.treatmentId);
    }
  });

  it('never targets the base config (config animations stay manual-only)', () => {
    const treatments = [
      mockTreatment('d1', 'drift', true),
      mockTreatment('t1', 'tint',  true),
    ];
    for (let i = 0; i < ITERATIONS; i++) {
      const spec = buildRandomAnimation(treatments)!;
      expect(spec.treatmentId).not.toBe('config');
    }
  });
});

describe('hasRandomTarget', () => {
  it('false on empty input', () => {
    expect(hasRandomTarget([])).toBe(false);
  });

  it('false when all treatments are disabled', () => {
    expect(hasRandomTarget([mockTreatment('d1', 'drift', false)])).toBe(false);
  });

  it('true when at least one enabled treatment with animatable params exists', () => {
    expect(hasRandomTarget([mockTreatment('d1', 'drift', true)])).toBe(true);
  });
});
