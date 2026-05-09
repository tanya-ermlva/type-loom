import { describe, expect, it } from 'vitest';
import { easings, jitterFor, tokenProgress } from './animation';

describe('easings', () => {
  it('all easings map 0 → 0 and 1 → 1', () => {
    for (const fn of Object.values(easings)) {
      expect(fn(0)).toBeCloseTo(0, 6);
      expect(fn(1)).toBeCloseTo(1, 6);
    }
  });
  it('linear is identity', () => {
    expect(easings.linear(0.3)).toBeCloseTo(0.3);
    expect(easings.linear(0.7)).toBeCloseTo(0.7);
  });
  it('easeOut is monotonic-increasing', () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easings.easeOut(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('tokenProgress', () => {
  it('with stagger=0, all tokens share progress', () => {
    expect(tokenProgress(0.5, 0, 5, 0)).toBeCloseTo(0.5);
    expect(tokenProgress(0.5, 0, 5, 4)).toBeCloseTo(0.5);
  });
  it('with stagger=0.5 and 5 tokens, last token starts at progress=0.5 and ends at 1.0', () => {
    // tokenOffset for last (idx=4) of 5: 0.5 * 4/4 = 0.5
    // window = 1 - 0.5 = 0.5
    expect(tokenProgress(0.5,  0.5, 5, 4)).toBeCloseTo(0); // just starting
    expect(tokenProgress(1.0,  0.5, 5, 4)).toBeCloseTo(1); // just finished
  });
  it('with stagger=0.5 and 5 tokens, first token starts at 0', () => {
    expect(tokenProgress(0.0, 0.5, 5, 0)).toBeCloseTo(0);
    expect(tokenProgress(0.5, 0.5, 5, 0)).toBeCloseTo(1); // window 0..0.5
  });
  it('clamps outside the active window', () => {
    expect(tokenProgress(-0.5, 0,   5, 0)).toBe(0);
    expect(tokenProgress(2.0,  0,   5, 0)).toBe(1);
  });
  it('with stagger=0 and totalTokens=1 does not divide by zero', () => {
    expect(tokenProgress(0.5, 0, 1, 0)).toBeCloseTo(0.5);
  });
});

describe('jitterFor', () => {
  it('is deterministic for the same seed/index', () => {
    const a = jitterFor(42, 5);
    const b = jitterFor(42, 5);
    expect(a).toBe(b);
  });
  it('varies with seed', () => {
    expect(jitterFor(1, 5)).not.toBe(jitterFor(2, 5));
  });
  it('returns a value in [-1, 1]', () => {
    for (let s = 1; s < 100; s++) {
      for (let i = 0; i < 20; i++) {
        const v = jitterFor(s, i);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
