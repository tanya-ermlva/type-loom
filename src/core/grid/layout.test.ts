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

  it('computes the expected number of rows and columns from canvas size', () => {
    const config = { ...DEFAULT_BASE_CONFIG, canvas: { width: 100, height: 100 }, hDistance: 20, vDistance: 25, input: 'A' };
    const cells = computeLayout(config);
    // 100/20 = 5 cols, 100/25 = 4 rows -> 20 cells
    expect(cells.length).toBe(20);
  });

  it('starts cells at half-cell offset so they sit centered', () => {
    const config = { ...DEFAULT_BASE_CONFIG, canvas: { width: 100, height: 100 }, hDistance: 20, vDistance: 20, input: 'A' };
    const cells = computeLayout(config);
    expect(cells[0].position.x).toBe(10); // half of 20
    expect(cells[0].position.y).toBe(10);
  });

  it('assigns the right character to each cell using fillRow per row', () => {
    const config = { ...DEFAULT_BASE_CONFIG, canvas: { width: 80, height: 40 }, hDistance: 20, vDistance: 20, input: 'OK' };
    const cells = computeLayout(config);
    // 4 cols, 2 rows. Row content = "OK O" (truncated to 4 chars).
    expect(cells.slice(0, 4).map(c => c.char)).toEqual(['O', 'K', ' ', 'O']);
    expect(cells.slice(4, 8).map(c => c.char)).toEqual(['O', 'K', ' ', 'O']);
  });

  it('initializes each cell with identity values (visible, scale 1, etc)', () => {
    const cells = computeLayout(DEFAULT_BASE_CONFIG);
    expect(cells[0].scale).toBe(1);
    expect(cells[0].rotation).toBe(0);
    expect(cells[0].opacity).toBe(1);
    expect(cells[0].visible).toBe(true);
    expect(cells[0].color).toBe(DEFAULT_BASE_CONFIG.fgColor);
  });
});
