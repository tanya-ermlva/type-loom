import { describe, it, expect } from 'vitest';
import { fillRow } from './input';

describe('fillRow', () => {
  it('repeats the input string with single-space separators to fill the column count', () => {
    expect(fillRow('OK', 8)).toBe('OK OK OK');
  });

  it('truncates the result to exactly columnCount characters', () => {
    expect(fillRow('OK', 5)).toBe('OK OK');
    expect(fillRow('OK', 4)).toBe('OK O');
  });

  it('handles single-character input', () => {
    expect(fillRow('X', 5)).toBe('X X X');
  });

  it('returns empty string when columnCount is 0', () => {
    expect(fillRow('TYPE', 0)).toBe('');
  });

  it('handles input longer than columnCount by truncating', () => {
    expect(fillRow('HELLO', 3)).toBe('HEL');
  });
});
