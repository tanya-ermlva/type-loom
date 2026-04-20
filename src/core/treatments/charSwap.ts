import type { Cell } from '../types';
import type { Treatment } from './types';
import { deterministicHash, pickFromPool } from '../util/hash';

export type CharSwapMode = 'random' | 'cycle';

export interface CharSwapParams {
  pool: string;
  mode: CharSwapMode;
  seed: number;       // for 'random' mode; integer; animatable
  poolIndex: number;  // for 'cycle' mode; pool index; animatable
}

/**
 * Replace each cell's character with one from the pool.
 *
 * - Random: each cell deterministically picks a char from the pool based
 *   on (row, col, seed). Stable across frames at fixed seed.
 * - Cycle: every cell shows the same char from the pool at the current
 *   poolIndex. Animate poolIndex to scroll through the pool.
 */
export function createCharSwap(params: CharSwapParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'charSwap',
    enabled: true,
    apply(cell: Cell, row: number, col: number) {
      if (params.pool.length === 0) return cell;
      let next: string;
      if (params.mode === 'cycle') {
        next = pickFromPool(params.pool, params.poolIndex);
      } else {
        const h = deterministicHash(row, col, params.seed);
        next = pickFromPool(params.pool, Math.floor(h * params.pool.length));
      }
      return { ...cell, char: next };
    },
  };
}
