import { describe, expect, it } from 'vitest';
import { tokenize } from './tokens';

const stripIds = (toks: { id: string; text: string }[]) => toks.map((t) => t.text);

describe('tokenize', () => {
  it('splits plain words on whitespace', () => {
    expect(stripIds(tokenize('Digital Freedom Dialogue', 'l1'))).toEqual([
      'Digital', 'Freedom', 'Dialogue',
    ]);
  });
  it('extracts en-dash as its own token', () => {
    expect(stripIds(tokenize('8 — 11 June', 'l2'))).toEqual([
      '8', '—', '11', 'June',
    ]);
  });
  it('extracts en-dash even when adjacent to a word', () => {
    expect(stripIds(tokenize('8—11', 'l2'))).toEqual([
      '8', '—', '11',
    ]);
  });
  it('produces stable line-prefixed ids', () => {
    const toks = tokenize('a b c', 'lineX');
    expect(toks.map((t) => t.id)).toEqual(['lineX-0', 'lineX-1', 'lineX-2']);
  });
  it('collapses multiple whitespace', () => {
    expect(stripIds(tokenize('  a   b\n c ', 'l1'))).toEqual(['a', 'b', 'c']);
  });
  it('returns empty array for whitespace-only string', () => {
    expect(tokenize('   ', 'l1')).toEqual([]);
  });
});
