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

  // ---------- justified-chars ----------

  it('justified-chars: every character has equal gap (intra and inter token)', () => {
    // 2 tokens: "ab" (letters [40, 40]) and "cde" (letters [30, 30, 30]).
    // totalChars = 5, totalInk = 80 + 90 = 170, inner = 1000.
    // gap = (1000 - 170) / (5 - 1) = 207.5
    // tok 0 width = 80 + (2-1)*207.5 = 287.5
    // tok 1 width = 90 + (3-1)*207.5 = 505
    // tok 0 starts at 0, tok 1 starts at 0 + 287.5 + 207.5 = 495
    // last char ends at 495 + 505 = 1000 ✓
    const tokens = [
      { id: 'a', width: 80, letterWidths: [40, 40] },
      { id: 'b', width: 90, letterWidths: [30, 30, 30] },
    ];
    const positions = layoutLine(tokens, 'justified-chars', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 999, // ignored
    });
    expect(positions).toEqual([
      { id: 'a', x: 0,   width: 287.5, letterSpacingPx: 207.5 },
      { id: 'b', x: 495, width: 505,   letterSpacingPx: 207.5 },
    ]);
  });

  it('justified-chars respects edgePadding', () => {
    // inner = 800, totalChars = 4, totalInk = 200. gap = 600/3 = 200.
    // tok 0 = "ab" (100+100): width = 200 + 200 = 400, starts at 50.
    // tok 1 = "cd" (50+50):   width = 100 + 200 = 300, starts at 50+400+200 = 650.
    // last char ends at 650+300 = 950 = canvasWidth - edgePadding ✓
    const tokens = [
      { id: 'a', width: 200, letterWidths: [100, 100] },
      { id: 'b', width: 100, letterWidths: [50, 50] },
    ];
    const positions = layoutLine(tokens, 'justified-chars', {
      canvasWidth: 1000, edgePadding: 50, tokenSpacingTight: 0,
    });
    expect(positions).toEqual([
      { id: 'a', x: 50,  width: 400, letterSpacingPx: 200 },
      { id: 'b', x: 650, width: 300, letterSpacingPx: 200 },
    ]);
  });

  it('justified-chars: single char in line falls back to centered (no gaps to spread)', () => {
    const tokens = [{ id: 'a', width: 100, letterWidths: [100] }];
    const positions = layoutLine(tokens, 'justified-chars', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 0,
    });
    expect(positions).toEqual([{ id: 'a', x: 450, width: 100 }]);
  });

  it('justified-chars: missing letterWidths falls back to centered packing', () => {
    // Simulates the brief moment after a font change where measurement is in flight.
    const tokens = [
      { id: 'a', width: 100 },
      { id: 'b', width: 100 },
    ];
    const positions = layoutLine(tokens, 'justified-chars', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 50,
    });
    // contentW = 100+50+100 = 250, startX = (1000-250)/2 = 375.
    expect(positions).toEqual([
      { id: 'a', x: 375, width: 100 },
      { id: 'b', x: 525, width: 100 },
    ]);
  });

  // ---------- New alignment modes ----------

  it('stretched: scales each token width to fill the line', () => {
    const tokens = [w('a', 100), w('b', 200), w('c', 100)];
    const positions = layoutLine(tokens, 'stretched', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 0,
    });
    // naturalSum = 400, inner = 1000, stretch = 2.5.
    // a stretched to 250 at x=0, b stretched to 500 at x=250, c stretched to 250 at x=750.
    expect(positions).toEqual([
      { id: 'a', x: 0,   width: 250, scaleX: 2.5 },
      { id: 'b', x: 250, width: 500, scaleX: 2.5 },
      { id: 'c', x: 750, width: 250, scaleX: 2.5 },
    ]);
  });

  it('gravity-left: tokens cluster at left with exponentially growing gaps', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100)];
    const positions = layoutLine(tokens, 'gravity-left', {
      canvasWidth: 700, edgePadding: 0, tokenSpacingTight: 0,
    });
    // sumWidths=300, totalGap=400, N=2, denom=2^2-1=3, baseGap=400/3≈133.33.
    // gaps: [baseGap, 2*baseGap] = [133.33, 266.67]. Total: 400 ✓
    expect(positions[0].x).toBeCloseTo(0);
    expect(positions[1].x).toBeCloseTo(100 + 400 / 3);     // ≈233.33
    expect(positions[2].x).toBeCloseTo(200 + 400);          // ≈600
    // last token right edge = 600 + 100 = 700 = canvasWidth ✓
  });

  it('gravity-right: mirror — tokens cluster at right', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100)];
    const positions = layoutLine(tokens, 'gravity-right', {
      canvasWidth: 700, edgePadding: 0, tokenSpacingTight: 0,
    });
    // mirrored gravity-left: c at right (x=600), b before with small gap, a far left
    expect(positions[2].x).toBeCloseTo(600);
    expect(positions[1].x).toBeCloseTo(600 - 100 - 400 / 3); // ≈366.67
    expect(positions[0].x).toBeCloseTo(0);
  });

  it('hugging-edges: first/last at edges, middle centered', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100), w('d', 100)];
    const positions = layoutLine(tokens, 'hugging-edges', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 20,
    });
    // first at x=0; last at x=900. Middle (b, c): contentW = 100+20+100=220, startX=(1000-220)/2=390.
    expect(positions).toEqual([
      { id: 'a', x: 0,   width: 100 },
      { id: 'b', x: 390, width: 100 },
      { id: 'c', x: 510, width: 100 },
      { id: 'd', x: 900, width: 100 },
    ]);
  });

  it('hugging-edges: with 2 tokens falls back to justified', () => {
    const tokens = [w('a', 100), w('b', 100)];
    const positions = layoutLine(tokens, 'hugging-edges', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 0,
    });
    expect(positions).toEqual([
      { id: 'a', x: 0,   width: 100 },
      { id: 'b', x: 900, width: 100 },
    ]);
  });

  it('scattered: positions are deterministic for the same seed', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100)];
    const opts = { canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 0, scatterSeed: 42 };
    const a = layoutLine(tokens, 'scattered', opts);
    const b = layoutLine(tokens, 'scattered', opts);
    expect(a).toEqual(b);
    // every position must lie within canvas
    for (const p of a) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(1000);
    }
  });

  it('mirrored: token 0 lands at the rightmost slot', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100)];
    const positions = layoutLine(tokens, 'mirrored', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 50,
    });
    // Centered packed [c, b, a]: contentW = 400, startX = 300.
    // c at x=300, b at x=450, a at x=600. After remap: a→600, b→450, c→300.
    expect(positions).toEqual([
      { id: 'a', x: 600, width: 100 },
      { id: 'b', x: 450, width: 100 },
      { id: 'c', x: 300, width: 100 },
    ]);
  });

  it('offset-justified: gaps grow quadratically across the line', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100), w('d', 100)];
    const positions = layoutLine(tokens, 'offset-justified', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 0,
    });
    // sumWidths=400, totalGap=600, N=3. weightSum = 3*4*7/6 = 14. unit = 600/14 ≈ 42.86.
    // gaps: 1²·u, 2²·u, 3²·u = u, 4u, 9u → 42.86, 171.43, 385.71. Sum = 600 ✓
    const u = 600 / 14;
    expect(positions[0].x).toBeCloseTo(0);
    expect(positions[1].x).toBeCloseTo(100 + u);
    expect(positions[2].x).toBeCloseTo(200 + u + 4 * u);
    expect(positions[3].x).toBeCloseTo(300 + u + 4 * u + 9 * u);
    // Last token's right edge respects the justified invariant.
    expect(positions[3].x + 100).toBeCloseTo(1000);
  });

  it('exploded: uses fixed large gaps regardless of canvas width', () => {
    const tokens = [w('a', 100), w('b', 100), w('c', 100)];
    const positions = layoutLine(tokens, 'exploded', {
      canvasWidth: 1000, edgePadding: 0, tokenSpacingTight: 30,
    });
    // explodeGap = max(80, 30*5) = 150. Tokens placed sequentially with 150 gaps.
    expect(positions).toEqual([
      { id: 'a', x: 0,   width: 100 },
      { id: 'b', x: 250, width: 100 },
      { id: 'c', x: 500, width: 100 },
    ]);
  });
});
