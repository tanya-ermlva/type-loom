import { describe, it, expect } from 'vitest';
import { createSilhouette } from './silhouette';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
  silhouetteCoverage: 1,
};

const ctx = (rows: number, cols: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t: 0, loopDuration: 4,
});

describe('Silhouette — shape: lens', () => {
  it('center cell has full coverage at size=1', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });

  it('far corner has zero coverage at size=0.5', () => {
    const t = createSilhouette({ shape: 'lens', size: 0.5, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 0, 0, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(0);
  });
});

describe('Silhouette — shape: diamond', () => {
  it('center has full coverage', () => {
    const t = createSilhouette({ shape: 'diamond', size: 1.0, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });

  it('diagonal corner is farther than cardinal edge at same radius', () => {
    const t = createSilhouette({ shape: 'diamond', size: 1.5, softness: 0, invert: false, blendMode: 'replace' });
    expect(t.apply(baseCell, 5, 10, ctx(11, 11)).silhouetteCoverage).toBe(1);
    expect(t.apply(baseCell, 0, 0, ctx(11, 11)).silhouetteCoverage).toBe(0);
  });
});

describe('Silhouette — shape: hourglass', () => {
  it('top region has higher or equal coverage than middle', () => {
    const t = createSilhouette({ shape: 'hourglass', size: 0.3, softness: 0, invert: false, blendMode: 'replace' });
    const top = t.apply(baseCell, 0, 5, ctx(11, 11));
    const mid = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(top.silhouetteCoverage).toBeGreaterThanOrEqual(mid.silhouetteCoverage);
  });
});

describe('Silhouette — shape: wave', () => {
  it('cells along the sinusoidal centerline have full coverage', () => {
    const t = createSilhouette({ shape: 'wave', size: 0.2, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });
});

describe('Silhouette — shape: x', () => {
  it('cells on the main diagonal have full coverage', () => {
    const t = createSilhouette({ shape: 'x', size: 0.1, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 0, 0, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });

  it('cells off the diagonals have zero coverage at small size', () => {
    const t = createSilhouette({ shape: 'x', size: 0.1, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 0, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(0);
  });
});

describe('Silhouette — shape: circle', () => {
  it('matches lens for the same cell', () => {
    const lens = createSilhouette({ shape: 'lens', size: 0.5, softness: 0, invert: false, blendMode: 'replace' });
    const circle = createSilhouette({ shape: 'circle', size: 0.5, softness: 0, invert: false, blendMode: 'replace' });
    const a = lens.apply(baseCell, 3, 3, ctx(11, 11));
    const b = circle.apply(baseCell, 3, 3, ctx(11, 11));
    expect(a.silhouetteCoverage).toBe(b.silhouetteCoverage);
  });
});

describe('Silhouette — blend modes', () => {
  const fullCov: Cell = { ...baseCell, silhouetteCoverage: 0.8 };
  const halfCov: Cell = { ...baseCell, silhouetteCoverage: 0.5 };

  it('replace overrides prior coverage', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'replace' });
    expect(t.apply(fullCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBe(1);
  });

  it('intersect multiplies with prior coverage', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'intersect' });
    expect(t.apply(fullCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBeCloseTo(0.8);
  });

  it('union combines prior and current via probabilistic OR', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'union' });
    expect(t.apply(halfCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBe(1);
  });

  it('subtract removes current from prior', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'subtract' });
    expect(t.apply(fullCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBe(0);
  });
});

describe('Silhouette — invert', () => {
  it('flips coverage per cell before blending', () => {
    const normal = createSilhouette({ shape: 'lens', size: 0.3, softness: 0, invert: false, blendMode: 'replace' });
    const inverted = createSilhouette({ shape: 'lens', size: 0.3, softness: 0, invert: true, blendMode: 'replace' });
    const a = normal.apply(baseCell, 5, 5, ctx(11, 11));
    const b = inverted.apply(baseCell, 5, 5, ctx(11, 11));
    expect(a.silhouetteCoverage + b.silhouetteCoverage).toBe(1);
  });
});
