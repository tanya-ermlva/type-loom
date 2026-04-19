import type { Cell } from '../types';
import type { Treatment } from './types';
import type { StaggerAxis } from '../animation/types';
import { staggerFraction } from '../animation/evaluate';
import { deterministicHash, pickFromPool } from '../util/hash';

export type CharScrambleMode = 'settle' | 'continuous';

export interface CharScrambleParams {
  pool: string;
  mode: CharScrambleMode;
  settleStart: number;     // sec; settle mode only
  flipsPerSecond: number;
  staggerAmount: number;   // sec; settle mode only
  staggerAxis: StaggerAxis;
}

/**
 * Each cell flickers through random chars from the pool.
 * - Settle mode: cells start scrambled, then lock to their original char
 *   at a per-cell settle time = settleStart + staggerAmount * fraction.
 * - Continuous mode: cells never settle; keep flickering.
 */
export function createCharScramble(params: CharScrambleParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'charScramble',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      if (params.pool.length === 0) return cell;

      const cellHash = deterministicHash(row, col, 0);

      if (params.mode === 'settle') {
        const settleTime =
          params.settleStart +
          (params.staggerAmount > 0
            ? params.staggerAmount * staggerFraction(row, col, ctx.rows, ctx.columns, params.staggerAxis)
            : 0);
        if (ctx.t >= settleTime) return cell; // settled — keep original char
      }

      const flipIndex = Math.floor(ctx.t * params.flipsPerSecond + cellHash * params.pool.length);
      return { ...cell, char: pickFromPool(params.pool, flipIndex) };
    },
  };
}
