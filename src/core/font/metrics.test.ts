import { describe, it, expect } from 'vitest';
import { measureMonospaceCell } from './metrics';

describe('measureMonospaceCell', () => {
  it('returns positive width and height', () => {
    const m = measureMonospaceCell({
      fontFamily: 'monospace',
      fontSize: 40,
      sampleChar: 'M',
    });
    expect(m.width).toBeGreaterThan(0);
    expect(m.height).toBeGreaterThan(0);
  });

  it('produces larger measurements for larger font sizes', () => {
    const small = measureMonospaceCell({ fontFamily: 'monospace', fontSize: 20, sampleChar: 'M' });
    const large = measureMonospaceCell({ fontFamily: 'monospace', fontSize: 60, sampleChar: 'M' });
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);
  });
});
