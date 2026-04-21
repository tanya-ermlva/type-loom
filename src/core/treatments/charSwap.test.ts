import { describe, it, expect } from 'vitest';
import { createCharSwap } from './charSwap';
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

describe('Char: Swap (Random mode)', () => {
  it('replaces cell.char with a char from the pool', () => {
    const t = createCharSwap({ pool: 'AB', mode: 'random', seed: 0, poolIndex: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5));
    expect(['A', 'B']).toContain(result.char);
  });

  it('is stable for the same (row, col, seed)', () => {
    const t = createCharSwap({ pool: 'ABCDEF', mode: 'random', seed: 7, poolIndex: 0 });
    const r1 = t.apply(baseCell, 2, 3, ctx(5, 5));
    const r2 = t.apply(baseCell, 2, 3, ctx(5, 5));
    expect(r1.char).toBe(r2.char);
  });

  it('produces different chars for different cells (mostly)', () => {
    const t = createCharSwap({ pool: 'ABCDEFGH', mode: 'random', seed: 0, poolIndex: 0 });
    const chars = new Set<string>();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      chars.add(t.apply(baseCell, r, c, ctx(8, 8)).char);
    }
    expect(chars.size).toBeGreaterThan(1);
  });
});

describe('Char: Swap (Cycle mode)', () => {
  it('returns the same char for every cell', () => {
    const t = createCharSwap({ pool: 'AB', mode: 'cycle', seed: 0, poolIndex: 1 });
    const a = t.apply(baseCell, 0, 0, ctx(5, 5));
    const b = t.apply(baseCell, 4, 4, ctx(5, 5));
    expect(a.char).toBe(b.char);
    expect(a.char).toBe('B');
  });

  it('poolIndex picks the char modulo pool length', () => {
    const t = createCharSwap({ pool: 'ABCD', mode: 'cycle', seed: 0, poolIndex: 5 });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5)).char).toBe('B');
  });
});

describe('Char: Swap (general)', () => {
  it('does not change visibility / position / scale / rotation', () => {
    const t = createCharSwap({ pool: 'ABC', mode: 'random', seed: 0, poolIndex: 0 });
    const cell = { ...baseCell, position: { x: 100, y: 50 }, scale: 2, rotation: 0.3 };
    const result = t.apply(cell, 0, 0, ctx(5, 5));
    expect(result.position).toEqual(cell.position);
    expect(result.scale).toBe(cell.scale);
    expect(result.rotation).toBe(cell.rotation);
    expect(result.visible).toBe(cell.visible);
  });

  it('returns the cell unchanged when pool is empty', () => {
    const t = createCharSwap({ pool: '', mode: 'random', seed: 0, poolIndex: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5));
    expect(result.char).toBe('X');
  });
});
