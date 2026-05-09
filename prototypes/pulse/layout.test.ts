import { describe, expect, it } from 'vitest';
import { layoutLine } from './layout';

const w = (id: string, width: number) => ({ id, width });

describe('layoutLine', () => {
  it('centered: places three equal tokens with even spacing, centered on canvas', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100)];
    const positions = layoutLine(tokens, 'centered', {
      canvasWidth: 1000,
      edgePadding: 0,
      tokenSpacingTight: 50,
    });
    // Total content width = 100*3 + 50*2 = 400. Start x = (1000 - 400)/2 = 300.
    expect(positions).toEqual([
      { id: 'a', x: 300, width: 100 },
      { id: 'b', x: 450, width: 100 },
      { id: 'c', x: 600, width: 100 },
    ]);
  });

  it('left: anchors first token at edgePadding', () => {
    const tokens = [w('a', 100), w('b', 100)];
    const positions = layoutLine(tokens, 'left', {
      canvasWidth: 1000, edgePadding: 20, tokenSpacingTight: 30,
    });
    expect(positions).toEqual([
      { id: 'a', x: 20, width: 100 },
      { id: 'b', x: 150, width: 100 },
    ]);
  });

  it('right: ends last token at canvasWidth - edgePadding', () => {
    const tokens = [w('a', 100), w('b', 100)];
    const positions = layoutLine(tokens, 'right', {
      canvasWidth: 1000, edgePadding: 20, tokenSpacingTight: 30,
    });
    // contentW = 100+30+100 = 230. startX = 1000-20-230 = 750.
    expect(positions).toEqual([
      { id: 'a', x: 750, width: 100 },
      { id: 'b', x: 880, width: 100 },
    ]);
    // Last token's right edge: 880 + 100 = 980 = 1000 - 20 ✓
  });

  it('justified: distributes gap evenly between tokens', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100), w('d', 100)];
    const positions = layoutLine(tokens, 'justified', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 999, // ignored
    });
    // inner = 1000, sumWidths = 400, gap = (1000-400)/3 = 200.
    expect(positions).toEqual([
      { id: 'a', x: 0,   width: 100 },
      { id: 'b', x: 300, width: 100 },
      { id: 'c', x: 600, width: 100 },
      { id: 'd', x: 900, width: 100 },
    ]);
  });

  it('justified with 1 token falls back to centered', () => {
    const tokens = [w('a', 100)];
    const positions = layoutLine(tokens, 'justified', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 0,
    });
    expect(positions).toEqual([{ id: 'a', x: 450, width: 100 }]);
  });

  it('empty token list returns empty array', () => {
    expect(layoutLine([], 'centered', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 0,
    })).toEqual([]);
  });

  it('justified respects edgePadding', () => {
    const tokens = [w('a', 100), w('b', 100)];
    const positions = layoutLine(tokens, 'justified', {
      canvasWidth: 1000, edgePadding: 50, tokenSpacingTight: 0,
    });
    // inner = 900, sumWidths = 200, gap = 700.
    // a at x=50, b at x=50+100+700=850. Last token right edge: 850+100=950 = canvasWidth-edgePadding ✓
    expect(positions).toEqual([
      { id: 'a', x: 50,  width: 100 },
      { id: 'b', x: 850, width: 100 },
    ]);
  });
});
