import { describe, expect, it } from 'vitest';
import { characterEffect, easings, jitterFor, tokenProgress } from './animation';

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

describe('characterEffect', () => {
  it("'none' always returns the neutral delta", () => {
    expect(characterEffect('none', 0, 5, 0.5, 100)).toEqual({ dx: 0, dy: 0, rotate: 0, scaleY: 1 });
  });

  it('amplitude=0 always returns the neutral delta regardless of effect', () => {
    for (const eff of ['bow', 'fan', 'stretch', 'wave'] as const) {
      expect(characterEffect(eff, 2, 7, 0.5, 0)).toEqual({ dx: 0, dy: 0, rotate: 0, scaleY: 1 });
    }
  });

  it("'bow': peaks the y-arc at the middle character when localProg=0.5", () => {
    const middleChar = 3;
    const result = characterEffect('bow', middleChar, 7, 0.5, 30);
    // arcShape at middle: sin(π * 3/6) = 1; envelope at 0.5: sin(π/2) = 1
    expect(result.dy).toBeCloseTo(-30); // negative = up
    expect(result.dx).toBe(0);
    expect(result.rotate).toBe(0);
    expect(result.scaleY).toBe(1);
  });

  it("'bow': end characters (idx 0 and N-1) have no y offset", () => {
    expect(characterEffect('bow', 0, 7, 0.5, 30).dy).toBeCloseTo(0);
    expect(characterEffect('bow', 6, 7, 0.5, 30).dy).toBeCloseTo(0);
  });

  it("'bow' returns to neutral at localProg=0 and localProg=1", () => {
    const r0 = characterEffect('bow', 3, 7, 0, 30);
    const r1 = characterEffect('bow', 3, 7, 1, 30);
    expect(r0.dy).toBeCloseTo(0);
    expect(r1.dy).toBeCloseTo(0);
  });

  it("'fan': rotates with opposite signs around the centre", () => {
    const left = characterEffect('fan', 0, 5, 0.5, 30); // left edge
    const right = characterEffect('fan', 4, 5, 0.5, 30); // right edge
    expect(left.rotate).toBeCloseTo(-30);
    expect(right.rotate).toBeCloseTo(30);
  });

  it("'fan': centre character has no rotation", () => {
    expect(characterEffect('fan', 2, 5, 0.5, 30).rotate).toBeCloseTo(0);
  });

  it("'stretch': scaleY peaks at localProg=0.5", () => {
    const result = characterEffect('stretch', 0, 5, 0.5, 50); // amplitude as percent
    expect(result.scaleY).toBeCloseTo(1.5); // 1 + 50/100 * 1
    expect(result.dy).toBe(0);
  });

  it("'wave': continuous sine — values vary across characters at any localProg", () => {
    const at0 = characterEffect('wave', 0, 5, 0.5, 20).dy;
    const at1 = characterEffect('wave', 1, 5, 0.5, 20).dy;
    const at2 = characterEffect('wave', 2, 5, 0.5, 20).dy;
    // No two adjacent chars should yield identical y unless on a period boundary
    expect(at0).not.toBeCloseTo(at1);
    expect(at1).not.toBeCloseTo(at2);
  });

  it('handles single-char tokens without dividing by zero', () => {
    for (const eff of ['bow', 'fan', 'stretch', 'wave'] as const) {
      const r = characterEffect(eff, 0, 1, 0.5, 30);
      expect(Number.isFinite(r.dx)).toBe(true);
      expect(Number.isFinite(r.dy)).toBe(true);
      expect(Number.isFinite(r.rotate)).toBe(true);
      expect(Number.isFinite(r.scaleY)).toBe(true);
    }
  });
});
