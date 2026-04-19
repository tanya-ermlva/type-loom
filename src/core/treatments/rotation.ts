import type { Cell } from '../types';
import type { Treatment } from './types';
import { deterministicHash } from '../util/hash';

export type RotationPattern = 'radial' | 'linear-x' | 'linear-y' | 'random';

export interface RotationParams {
  pattern: RotationPattern;
  minDegrees: number;
  maxDegrees: number;
}

/**
 * Rotation treatment: varies per-cell rotation angle by a function of
 * cell position in the grid.
 *
 * - radial: angle is the cell's polar angle from canvas center (creates a swirl)
 * - linear-x: angle ramps from min on left to max on right
 * - linear-y: angle ramps from min on top to max on bottom
 * - random: pseudo-random angle per cell (deterministic from row+col)
 */
export function createRotation(params: RotationParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'rotation',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      let factor: number; // -1..1
      switch (params.pattern) {
        case 'radial': {
          const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          factor = Math.atan2(ny, nx) / Math.PI;
          break;
        }
        case 'linear-x':
          factor = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          break;
        case 'linear-y':
          factor = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          break;
        case 'random': {
          factor = deterministicHash(row, col, 0) * 2 - 1;
          break;
        }
      }
      const t = (factor + 1) / 2; // 0..1
      const degrees = params.minDegrees + t * (params.maxDegrees - params.minDegrees);
      return { ...cell, rotation: cell.rotation + (degrees * Math.PI / 180) };
    },
  };
}
