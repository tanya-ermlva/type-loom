import { describe, it, expect } from 'vitest';
import { evaluateAnimation, computeLoopDuration } from './evaluate';
import type { AnimationSpec } from './types';

const base: Omit<AnimationSpec, 'curve'> = {
  id: 'a', treatmentId: 't', treatmentType: 'silhouette',
  paramKey: 'size', from: 0, to: 1, duration: 4, delay: 0,
  staggerAmount: 0, staggerAxis: 'x',
};

describe('evaluateAnimation', () => {
  it('sine: starts at from, peaks at half-duration, returns to from at full duration', () => {
    const spec: AnimationSpec = { ...base, curve: 'sine' };
    expect(evaluateAnimation(spec, 0)).toBeCloseTo(0);
    expect(evaluateAnimation(spec, 2)).toBeCloseTo(1);
    expect(evaluateAnimation(spec, 4)).toBeCloseTo(0);
  });

  it('triangle: linear up then down', () => {
    const spec: AnimationSpec = { ...base, curve: 'triangle' };
    expect(evaluateAnimation(spec, 0)).toBeCloseTo(0);
    expect(evaluateAnimation(spec, 1)).toBeCloseTo(0.5);
    expect(evaluateAnimation(spec, 2)).toBeCloseTo(1);
    expect(evaluateAnimation(spec, 3)).toBeCloseTo(0.5);
  });

  it('sawtooth: linear ramp 0->1 then jumps back', () => {
    const spec: AnimationSpec = { ...base, curve: 'sawtooth' };
    expect(evaluateAnimation(spec, 0)).toBeCloseTo(0);
    expect(evaluateAnimation(spec, 2)).toBeCloseTo(0.5);
    expect(evaluateAnimation(spec, 3.99)).toBeCloseTo(0.9975);
  });

  it('respects from/to range', () => {
    const spec: AnimationSpec = { ...base, curve: 'triangle', from: 10, to: 20 };
    expect(evaluateAnimation(spec, 0)).toBeCloseTo(10);
    expect(evaluateAnimation(spec, 2)).toBeCloseTo(20);
  });

  it('returns from when duration is 0', () => {
    const spec: AnimationSpec = { ...base, curve: 'sine', duration: 0 };
    expect(evaluateAnimation(spec, 5)).toBe(0);
  });

  it('wraps t past duration (loops)', () => {
    const spec: AnimationSpec = { ...base, curve: 'sine' };
    // t=8 == t=0 for a 4s cycle
    expect(evaluateAnimation(spec, 8)).toBeCloseTo(evaluateAnimation(spec, 0));
  });
});

describe('computeLoopDuration', () => {
  it('returns 4 by default with no animations', () => {
    expect(computeLoopDuration([])).toBe(4);
  });

  it('returns the longest duration', () => {
    const a: AnimationSpec = { ...base, curve: 'sine', duration: 2 };
    const b: AnimationSpec = { ...base, id: 'b', curve: 'sine', duration: 6 };
    expect(computeLoopDuration([a, b])).toBe(6);
  });
});
