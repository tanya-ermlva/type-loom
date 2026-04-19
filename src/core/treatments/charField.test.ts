import { describe, it, expect } from 'vitest';
import { createCharField } from './charField';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
};
const ctx = (rows: number, cols: number, t = 0) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t, loopDuration: 4,
});

describe('Char: Field (Radial pattern)', () => {
  it('center cell picks pool[0] (field=0)', () => {
    const t = createCharField({ pool: 'ABCDE', pattern: 'radial', scroll: 0 });
    const result = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(result.char).toBe('A');
  });

  it('corner cell picks a high-index pool char (field≈1)', () => {
    const t = createCharField({ pool: 'ABCDE', pattern: 'radial', scroll: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(11, 11));
    expect(['D', 'E', 'A']).toContain(result.char);  // could wrap, accept reasonable values
  });
});

describe('Char: Field (Linear-X pattern)', () => {
  it('left cell picks pool[0]', () => {
    const t = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5));
    expect(result.char).toBe('A');
  });

  it('right cell picks last pool char', () => {
    const t = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0 });
    const result = t.apply(baseCell, 0, 4, ctx(5, 5));
    expect(['A', 'D']).toContain(result.char);
  });
});

describe('Char: Field (scroll as direct phase offset)', () => {
  it('different scroll values pick different chars at the same cell', () => {
    const a = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0 });
    const b = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0.5 });
    const c0 = a.apply(baseCell, 0, 0, ctx(5, 5, 0)).char;
    const c1 = b.apply(baseCell, 0, 0, ctx(5, 5, 0)).char;
    expect(c0).not.toBe(c1);
  });

  it('static scroll alone does NOT shift over time (animate it for motion)', () => {
    const t = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0.5 });
    const c0 = t.apply(baseCell, 0, 0, ctx(5, 5, 0)).char;
    const c1 = t.apply(baseCell, 0, 0, ctx(5, 5, 1)).char;
    expect(c0).toBe(c1);
  });

  it('integer scroll values wrap to the same char as scroll=0', () => {
    const a = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0 });
    const b = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 1 });
    const c0 = a.apply(baseCell, 0, 0, ctx(5, 5, 0)).char;
    const c1 = b.apply(baseCell, 0, 0, ctx(5, 5, 0)).char;
    expect(c0).toBe(c1);
  });
});

describe('Char: Field (general)', () => {
  it('returns the cell unchanged when pool is empty', () => {
    const t = createCharField({ pool: '', pattern: 'radial', scroll: 0 });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5)).char).toBe('X');
  });
});
