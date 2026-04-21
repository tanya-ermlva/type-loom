import { describe, it, expect } from 'vitest';
import { createCharScramble } from './charScramble';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
  silhouetteCoverage: 1,
};
const ctx = (rows: number, cols: number, t: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t, loopDuration: 4,
});

describe('Char: Scramble (Settle mode)', () => {
  it('returns the original char once t exceeds the cell-specific settle time', () => {
    // settleStart=0, staggerAmount=0 → all cells settle at t=0
    const t = createCharScramble({
      pool: 'ABC', mode: 'settle', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5, 0.001)).char).toBe('X');
  });

  it('returns a pool char while still scrambling (t < settleTime)', () => {
    // settleStart=2, no stagger → no cell settles before t=2
    const t = createCharScramble({
      pool: 'ABC', mode: 'settle', settleStart: 2, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5, 1));
    expect(['A', 'B', 'C']).toContain(result.char);
  });

  it('staggerAmount delays settle for cells further along the axis', () => {
    // staggerAmount=2 along y. Row 4 of 5 → fraction 1.0 → settles 2s after row 0.
    const t = createCharScramble({
      pool: 'ABC', mode: 'settle', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 2, staggerAxis: 'y',
    });
    // At t=0.5: row 0 has settled (settle time = 0); row 4 hasn't (settle time = 2)
    expect(t.apply(baseCell, 0, 0, ctx(5, 5, 0.5)).char).toBe('X');
    expect(['A', 'B', 'C']).toContain(t.apply(baseCell, 4, 0, ctx(5, 5, 0.5)).char);
  });
});

describe('Char: Scramble (Continuous mode)', () => {
  it('always returns a pool char regardless of t', () => {
    const t = createCharScramble({
      pool: 'ABC', mode: 'continuous', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    for (const time of [0, 1, 2, 5, 100]) {
      expect(['A', 'B', 'C']).toContain(t.apply(baseCell, 0, 0, ctx(5, 5, time)).char);
    }
  });

  it('changes the displayed char over time', () => {
    const t = createCharScramble({
      pool: 'ABCDEFGH', mode: 'continuous', settleStart: 0, flipsPerSecond: 30,
      staggerAmount: 0, staggerAxis: 'x',
    });
    const chars = new Set<string>();
    for (let i = 0; i < 30; i++) {
      chars.add(t.apply(baseCell, 0, 0, ctx(5, 5, i / 30)).char);
    }
    expect(chars.size).toBeGreaterThan(1);
  });
});

describe('Char: Scramble (general)', () => {
  it('returns the cell unchanged when pool is empty', () => {
    const t = createCharScramble({
      pool: '', mode: 'continuous', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5, 1)).char).toBe('X');
  });
});
