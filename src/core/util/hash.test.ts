import { describe, it, expect } from 'vitest';
import { deterministicHash, pickFromPool } from './hash';

describe('deterministicHash', () => {
  it('returns a value in [0, 1)', () => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const h = deterministicHash(r, c, 0);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
    }
  });

  it('is stable for the same (row, col, seed)', () => {
    expect(deterministicHash(3, 7, 42)).toBe(deterministicHash(3, 7, 42));
  });

  it('produces different values for different (row, col)', () => {
    expect(deterministicHash(0, 0, 0)).not.toBe(deterministicHash(0, 1, 0));
    expect(deterministicHash(0, 0, 0)).not.toBe(deterministicHash(1, 0, 0));
  });

  it('seed shifts the value', () => {
    expect(deterministicHash(0, 0, 0)).not.toBe(deterministicHash(0, 0, 1));
  });
});

describe('pickFromPool', () => {
  it('picks the char at index modulo pool length', () => {
    expect(pickFromPool('abcd', 0)).toBe('a');
    expect(pickFromPool('abcd', 3)).toBe('d');
    expect(pickFromPool('abcd', 4)).toBe('a');
    expect(pickFromPool('abcd', 7)).toBe('d');
  });

  it('handles negative indices via modulo', () => {
    expect(pickFromPool('abcd', -1)).toBe('d');
  });

  it('returns empty string for empty pool', () => {
    expect(pickFromPool('', 0)).toBe('');
  });

  it('floors fractional indices', () => {
    expect(pickFromPool('abcd', 1.7)).toBe('b');
  });
});
