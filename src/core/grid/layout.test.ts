import { describe, it, expect } from 'vitest';
import { computeLayout } from './layout';
import { DEFAULT_BASE_CONFIG } from '../types';

describe('computeLayout', () => {
  it('produces cells that all fit inside the canvas', () => {
    const cells = computeLayout(DEFAULT_BASE_CONFIG);
    const { width, height } = DEFAULT_BASE_CONFIG.canvas;
    for (const cell of cells) {
      expect(cell.position.x).toBeGreaterThanOrEqual(0);
      expect(cell.position.x).toBeLessThanOrEqual(width);
      expect(cell.position.y).toBeGreaterThanOrEqual(0);
      expect(cell.position.y).toBeLessThanOrEqual(height);
    }
  });

  it('produces cells = wordsPerRow * input.length * rows', () => {
    const config = {
      ...DEFAULT_BASE_CONFIG,
      canvas: { width: 200, height: 100 },
      charSpacing: 20, columnSpacing: 20, rowSpacing: 50,
      input: 'OK',
    };
    // word_width = 2*20 = 40. period = 60. wordsPerRow = floor(200/60) = 3.
    // columns = 3*2 = 6. rows = floor(100/50) = 2. total = 12 cells.
    const cells = computeLayout(config);
    expect(cells.length).toBe(12);
  });

  it('positions letters within a word adjacent (no gap within word)', () => {
    const config = {
      ...DEFAULT_BASE_CONFIG,
      canvas: { width: 200, height: 50 },
      charSpacing: 20, columnSpacing: 20, rowSpacing: 50,
      input: 'OK',
    };
    const cells = computeLayout(config);
    // First word: O at x=10, K at x=30 (charSpacing apart)
    expect(cells[0].position.x).toBe(10);
    expect(cells[1].position.x).toBe(30);
    // Second word starts at period + charSpacing/2 = 60 + 10 = 70
    expect(cells[2].position.x).toBe(70);
    expect(cells[3].position.x).toBe(90);
  });

  it('repeats the input word in correct order across the row', () => {
    const config = {
      ...DEFAULT_BASE_CONFIG,
      canvas: { width: 200, height: 100 },
      charSpacing: 20, columnSpacing: 20, rowSpacing: 50,
      input: 'OK',
    };
    const cells = computeLayout(config);
    // 6 cells per row. Row 1 chars:
    expect(cells.slice(0, 6).map(c => c.char)).toEqual(['O', 'K', 'O', 'K', 'O', 'K']);
    // Row 2 chars same:
    expect(cells.slice(6, 12).map(c => c.char)).toEqual(['O', 'K', 'O', 'K', 'O', 'K']);
  });

  it('initializes each cell with identity render values', () => {
    const cells = computeLayout(DEFAULT_BASE_CONFIG);
    expect(cells[0].scale).toBe(1);
    expect(cells[0].rotation).toBe(0);
    expect(cells[0].opacity).toBe(1);
    expect(cells[0].visible).toBe(true);
    expect(cells[0].color).toBe(DEFAULT_BASE_CONFIG.fgColor);
  });

  it('returns no cells when input is empty', () => {
    const config = { ...DEFAULT_BASE_CONFIG, input: '' };
    expect(computeLayout(config)).toEqual([]);
  });
});
