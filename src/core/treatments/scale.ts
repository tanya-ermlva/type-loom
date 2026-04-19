import type { Cell } from '../types';
import type { Treatment } from './types';

export type ScalePattern = 'radial' | 'linear-x' | 'linear-y';

export interface ScaleParams {
  pattern: ScalePattern;
  min: number;   // smallest scale factor
  max: number;   // largest scale factor
}

/**
 * Scale treatment: varies per-cell font size by a smooth function of
 * cell position in the grid.
 *
 * - radial: max at center, min at corners
 * - linear-x: min on left, max on right
 * - linear-y: min on top, max on bottom
 */
export function createScale(params: ScaleParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'scale',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      let factor: number; // 0..1
      switch (params.pattern) {
        case 'radial': {
          const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          const dist = Math.min(1, Math.sqrt(nx * nx + ny * ny));
          factor = 1 - dist;
          break;
        }
        case 'linear-x':
          factor = ctx.columns <= 1 ? 0.5 : col / (ctx.columns - 1);
          break;
        case 'linear-y':
          factor = ctx.rows <= 1 ? 0.5 : row / (ctx.rows - 1);
          break;
      }
      const scale = params.min + (params.max - params.min) * factor;
      return { ...cell, scale: cell.scale * scale };
    },
  };
}
