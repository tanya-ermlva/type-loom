import type { Cell } from '../types';
import type { Treatment } from './types';
import { pickFromPool } from '../util/hash';

export type CharFieldPattern = 'radial' | 'linear-x' | 'linear-y' | 'diagonal';

export interface CharFieldParams {
  pool: string;
  pattern: CharFieldPattern;
  scroll: number;  // cycles per loop; integer step yields seamless loop
}

/**
 * Pick chars from a pool string by 2D field — like Tint/Scale but for letters.
 * Field value 0..1 picks an index into pool. `scroll != 0` shifts the
 * field-to-pool mapping over time (cycles per loop).
 */
export function createCharField(params: CharFieldParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'charField',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      if (params.pool.length === 0) return cell;

      let f: number;
      switch (params.pattern) {
        case 'radial': {
          const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          f = Math.min(1, Math.sqrt(nx * nx + ny * ny));
          break;
        }
        case 'linear-x':
          f = ctx.columns <= 1 ? 0 : col / (ctx.columns - 1);
          break;
        case 'linear-y':
          f = ctx.rows <= 1 ? 0 : row / (ctx.rows - 1);
          break;
        case 'diagonal': {
          const xf = ctx.columns <= 1 ? 0 : col / (ctx.columns - 1);
          const yf = ctx.rows <= 1 ? 0 : row / (ctx.rows - 1);
          f = (xf + yf) / 2;
          break;
        }
      }

      const loop = Math.max(0.0001, ctx.loopDuration);
      const phaseShift = (ctx.t / loop) * params.scroll;
      const index = Math.floor((f + phaseShift) * params.pool.length);
      return { ...cell, char: pickFromPool(params.pool, index) };
    },
  };
}
