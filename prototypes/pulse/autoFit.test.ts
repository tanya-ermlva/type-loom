import { describe, expect, it } from 'vitest';
import { fitTextBlock, fitAtomsToStack } from './autoFit';

describe('fitTextBlock', () => {
  it('returns raw values when text already fills canvas exactly (padding 0)', () => {
    const r = fitTextBlock(270, 2, 135, 0, 0);
    expect(r.lineHeight).toBeCloseTo(135, 5);
    expect(r.interLineGap).toBeCloseTo(0, 5);
    expect(r.topOffset).toBeCloseTo(0, 5);
  });

  it('shrinks overflowing text to fit (padding 0)', () => {
    // 2 lines × 138.5 = 277, canvas 270 → scale ≈ 0.9747
    const r = fitTextBlock(270, 2, 138.5, 0, 0);
    expect(r.lineHeight).toBeCloseTo(135, 5);
    expect(r.interLineGap).toBeCloseTo(0, 5);
    expect(r.topOffset).toBeCloseTo(0, 5);
    // verify block height equals canvas
    const blockH = 2 * r.lineHeight + 1 * r.interLineGap;
    expect(blockH).toBeCloseTo(270, 5);
  });

  it('grows underfilling text to fit (padding 0)', () => {
    // 2 lines × 100 + 1 × 10 = 210, canvas 400 → scale ≈ 1.905
    const r = fitTextBlock(400, 2, 100, 10, 0);
    const blockH = 2 * r.lineHeight + 1 * r.interLineGap;
    expect(blockH).toBeCloseTo(400, 5);
    expect(r.topOffset).toBeCloseTo(0, 5);
  });

  it('applies padding by reserving equal empty space top and bottom', () => {
    // canvas 270, padding 0.05 → target 270 × 0.9 = 243. topOffset = 13.5.
    const r = fitTextBlock(270, 2, 135, 0, 0.05);
    const blockH = 2 * r.lineHeight + 1 * r.interLineGap;
    expect(blockH).toBeCloseTo(243, 5);
    expect(r.topOffset).toBeCloseTo(13.5, 5);
  });

  it('preserves the ratio between lineHeight and interLineGap', () => {
    // gap / lineHeight = 20/100 = 0.2 — should hold after scaling
    const r = fitTextBlock(500, 3, 100, 20, 0);
    expect(r.interLineGap / r.lineHeight).toBeCloseTo(0.2, 5);
    // also: 3 lines + 2 gaps = 500 exactly
    const blockH = 3 * r.lineHeight + 2 * r.interLineGap;
    expect(blockH).toBeCloseTo(500, 5);
  });

  it('handles a single line (no gap math)', () => {
    const r = fitTextBlock(300, 1, 100, 50, 0);
    expect(r.lineHeight).toBeCloseTo(300, 5);
    expect(r.topOffset).toBeCloseTo(0, 5);
  });

  it('handles zero lines without crashing (returns raw, topOffset centered)', () => {
    const r = fitTextBlock(270, 0, 100, 10, 0.05);
    expect(r.lineHeight).toBe(100);
    expect(r.interLineGap).toBe(10);
    expect(Number.isFinite(r.topOffset)).toBe(true);
  });

  it('handles zero canvasHeight without crashing', () => {
    const r = fitTextBlock(0, 2, 100, 10, 0);
    expect(Number.isFinite(r.lineHeight)).toBe(true);
    expect(Number.isFinite(r.interLineGap)).toBe(true);
    expect(Number.isFinite(r.topOffset)).toBe(true);
  });

  it('clamps padding >= 0.5 so target height stays positive', () => {
    // padding 0.5 would make target = 0; clamp to 0.49.
    const r = fitTextBlock(270, 2, 100, 0, 0.5);
    expect(r.lineHeight).toBeGreaterThan(0);
    const target = 2 * r.lineHeight + 1 * r.interLineGap;
    expect(target).toBeGreaterThan(0);
    expect(target).toBeLessThan(270 * 0.05); // <5% of canvas
  });

  it('preserves negative interLineGap ratio (allowed by current slider range)', () => {
    // gap is negative — should stay negative after scaling
    const r = fitTextBlock(400, 2, 200, -20, 0);
    expect(r.interLineGap).toBeLessThan(0);
    expect(r.interLineGap / r.lineHeight).toBeCloseTo(-0.1, 5);
  });
});

describe('fitAtomsToStack', () => {
  it('exact divisor: stack 1920×1080, atom 1920×270 → 4 atoms, no flex', () => {
    const r = fitAtomsToStack(1920, 1080, 1920, 270);
    expect(r.atomCount).toBe(4);
    expect(r.atomDisplayH).toBeCloseTo(270, 5);
    expect(r.adjustedAtomCanvasH).toBeCloseTo(270, 5);
  });

  it('non-divisor: stack 1000×1000, atom 1920×270 → 7 atoms, flexed up', () => {
    // naturalDisplay = 1000 × 270/1920 ≈ 140.625; round(1000/140.625) = round(7.111) = 7
    // adjustedDisplay = 1000/7 ≈ 142.857
    // adjustedCanvasH = 1920 × 142.857/1000 ≈ 274.286
    const r = fitAtomsToStack(1000, 1000, 1920, 270);
    expect(r.atomCount).toBe(7);
    expect(r.atomDisplayH).toBeCloseTo(1000 / 7, 5);
    expect(r.adjustedAtomCanvasH).toBeCloseTo(1920 * (1000 / 7) / 1000, 5);
  });

  it('keeps atom viewBox aspect equal to slot aspect (no letterbox)', () => {
    const r = fitAtomsToStack(1000, 1000, 1920, 270);
    const slotAspect = r.atomDisplayH / 1000;             // displayH per stack-width
    const atomAspect = r.adjustedAtomCanvasH / 1920;      // canvasH per canvasW
    expect(atomAspect).toBeCloseTo(slotAspect, 5);
  });

  it('clamps atomCount to at least 1 when stack is shorter than natural atom', () => {
    // stack 1000×100, atom 1920×270 → natural display ≈ 140; 100/140 < 1
    const r = fitAtomsToStack(1000, 100, 1920, 270);
    expect(r.atomCount).toBe(1);
    expect(r.atomDisplayH).toBeCloseTo(100, 5);
  });

  it('handles zero-width stack without crashing', () => {
    const r = fitAtomsToStack(0, 1000, 1920, 270);
    expect(r.atomCount).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(r.atomDisplayH)).toBe(true);
    expect(Number.isFinite(r.adjustedAtomCanvasH)).toBe(true);
  });

  it('handles zero atom canvas without crashing', () => {
    const r = fitAtomsToStack(1000, 1000, 0, 0);
    expect(r.atomCount).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(r.atomDisplayH)).toBe(true);
    expect(Number.isFinite(r.adjustedAtomCanvasH)).toBe(true);
  });

  it('rounds to nearest (not floor) so partial-atom remainder distributes evenly', () => {
    // stack 1000, natural display 141 → 7.09 atoms. round = 7 (would be floor too)
    // stack 1000, natural display 152 → 6.58 atoms. round = 7, but floor = 6.
    const r = fitAtomsToStack(1000, 1000, 1000, 152);
    expect(r.atomCount).toBe(7);
  });
});
