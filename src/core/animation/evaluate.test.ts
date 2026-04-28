import { describe, it, expect } from 'vitest';
import { evaluateAnimation, computeLoopDuration, staggerFraction } from './evaluate';
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

describe('staggerFraction', () => {
  // Use a 5x5 grid: corners are (0,0), (0,4), (4,0), (4,4); center is (2,2).
  const G = { rows: 5, cols: 5 };
  const at = (axis: Parameters<typeof staggerFraction>[4], r: number, c: number) =>
    staggerFraction(r, c, G.rows, G.cols, axis);

  it('x: leftmost cells fire first, rightmost last', () => {
    expect(at('x', 2, 0)).toBe(0);
    expect(at('x', 2, 4)).toBe(1);
  });

  it('x-reverse: mirror of x', () => {
    expect(at('x-reverse', 2, 0)).toBe(1);
    expect(at('x-reverse', 2, 4)).toBe(0);
  });

  it('y: topmost first, bottom last', () => {
    expect(at('y', 0, 2)).toBe(0);
    expect(at('y', 4, 2)).toBe(1);
  });

  it('y-reverse: mirror of y', () => {
    expect(at('y-reverse', 0, 2)).toBe(1);
    expect(at('y-reverse', 4, 2)).toBe(0);
  });

  it('diagonal: top-left first, bottom-right last', () => {
    expect(at('diagonal', 0, 0)).toBe(0);
    expect(at('diagonal', 4, 4)).toBe(1);
  });

  it('anti-diagonal: top-right first, bottom-left last', () => {
    expect(at('anti-diagonal', 0, 4)).toBe(0);
    expect(at('anti-diagonal', 4, 0)).toBe(1);
  });

  it('radial: center fires first, corners last', () => {
    expect(at('radial', 2, 2)).toBe(0);
    // Corner is the farthest point — fraction is exactly 1.
    expect(at('radial', 0, 0)).toBeCloseTo(1, 6);
  });

  it('radial-in: corners first, center last', () => {
    expect(at('radial-in', 0, 0)).toBeCloseTo(0, 6);
    expect(at('radial-in', 2, 2)).toBe(1);
  });

  it('random: fractions are deterministic per (row, col) and lie in [0, 1]', () => {
    for (let r = 0; r < G.rows; r++) {
      for (let c = 0; c < G.cols; c++) {
        const v1 = at('random', r, c);
        const v2 = at('random', r, c);
        expect(v1).toBe(v2);
        expect(v1).toBeGreaterThanOrEqual(0);
        expect(v1).toBeLessThanOrEqual(1);
      }
    }
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
