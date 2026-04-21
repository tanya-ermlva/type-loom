import { describe, it, expect } from 'vitest';
import { createTint } from './tint';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const cell = (overrides: Partial<Cell> = {}): Cell => ({
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#ff0000', opacity: 1, visible: true,
  silhouetteCoverage: 1,
  ...overrides,
});

const ctx = (rows: number, cols: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t: 0, loopDuration: 4,
});

describe('Tint — color blend modes', () => {
  it('normal overrides the prior color', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'normal',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#00ff00', colorB: '#00ff00',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#00ff00');
  });

  it('multiply darkens: red × green = black', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'multiply',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#00ff00', colorB: '#00ff00',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#000000');
  });

  it('multiply: red × red = red', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'multiply',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#ff0000', colorB: '#ff0000',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ff0000');
  });

  it('screen lightens: red screen green = yellow', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'screen',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#00ff00', colorB: '#00ff00',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ffff00');
  });

  it('add clamps at white: white + anything = white', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'add',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#808080', colorB: '#808080',
    });
    const result = t.apply(cell({ color: '#ffffff' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ffffff');
  });

  it('opacity mode ignores blendMode', () => {
    const t = createTint({
      mode: 'opacity', pattern: 'linear-x', blendMode: 'multiply',
      minOpacity: 0.5, maxOpacity: 0.5,
      colorA: '#000', colorB: '#000',
    });
    const result = t.apply(cell({ color: '#ff0000', opacity: 1 }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ff0000');
    expect(result.opacity).toBeCloseTo(0.5);
  });
});
