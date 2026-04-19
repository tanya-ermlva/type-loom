import { describe, it, expect } from 'vitest';
import { createSilhouette } from './silhouette';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
};

const ctx = (rows: number, cols: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t: 0,
});

describe('Silhouette treatment (Lens)', () => {
  it('always draws the center cell when size is 1.0', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false });
    const result = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(result.visible).toBe(true);
  });

  it('hides cells outside the lens radius', () => {
    const t = createSilhouette({ shape: 'lens', size: 0.5, softness: 0, invert: false });
    // far corner should be hidden
    const result = t.apply(baseCell, 0, 0, ctx(11, 11));
    expect(result.visible).toBe(false);
  });

  it('inverts the mask when invert is true', () => {
    const t = createSilhouette({ shape: 'lens', size: 0.5, softness: 0, invert: true });
    // far corner now visible
    const corner = t.apply(baseCell, 0, 0, ctx(11, 11));
    expect(corner.visible).toBe(true);
    // center now hidden
    const center = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(center.visible).toBe(false);
  });

  it('uses opacity for soft edges instead of binary visibility', () => {
    const t = createSilhouette({ shape: 'lens', size: 0.6, softness: 0.4, invert: false });
    // a cell near the lens edge: visible but with reduced opacity
    const result = t.apply(baseCell, 2, 5, ctx(11, 11));
    expect(result.visible).toBe(true);
    expect(result.opacity).toBeGreaterThan(0);
    expect(result.opacity).toBeLessThan(1);
  });

  it('is enabled by default and can be disabled by setting enabled=false', () => {
    const t = createSilhouette({ shape: 'lens', size: 0.5, softness: 0, invert: false });
    expect(t.enabled).toBe(true);
  });
});
