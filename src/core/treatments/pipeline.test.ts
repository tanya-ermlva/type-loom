import { describe, it, expect } from 'vitest';
import { runPipeline } from './pipeline';
import type { Treatment } from './types';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';
import { computeLayout } from '../grid/layout';

const cfg = { ...DEFAULT_BASE_CONFIG, canvas: { width: 100, height: 100 }, charSpacing: 20, columnSpacing: 0, rowSpacing: 20, input: 'A' };

const makeCells = (): Cell[] => computeLayout(cfg);

const dimAll: Treatment = {
  id: 'a', type: 'silhouette', enabled: true,
  apply: (cell) => ({ ...cell, opacity: cell.opacity * 0.5 }),
};

const hideAll: Treatment = {
  id: 'b', type: 'silhouette', enabled: true,
  apply: (cell) => ({ ...cell, visible: false }),
};

const disabled: Treatment = {
  id: 'c', type: 'silhouette', enabled: false,
  apply: (cell) => ({ ...cell, color: '#ff0000' }),
};

describe('runPipeline', () => {
  it('returns cells unchanged when no treatments are active', () => {
    const cells = makeCells();
    const result = runPipeline(cells, [], { config: cfg, rows: 5, columns: 5, t: 0 });
    expect(result).toEqual(cells);
  });

  it('applies a single enabled treatment to every cell', () => {
    const cells = makeCells();
    const result = runPipeline(cells, [dimAll], { config: cfg, rows: 5, columns: 5, t: 0 });
    expect(result.every(c => c.opacity === 0.5)).toBe(true);
  });

  it('applies multiple treatments in order', () => {
    const cells = makeCells();
    const result = runPipeline(cells, [dimAll, hideAll], { config: cfg, rows: 5, columns: 5, t: 0 });
    expect(result.every(c => c.opacity === 0.5 && c.visible === false)).toBe(true);
  });

  it('skips disabled treatments', () => {
    const cells = makeCells();
    const result = runPipeline(cells, [disabled], { config: cfg, rows: 5, columns: 5, t: 0 });
    expect(result.every(c => c.color === cfg.fgColor)).toBe(true);
  });
});
