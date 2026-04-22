import type { Cell } from '../types';
import type { Treatment } from './types';

export type DriftAxis = 'x' | 'y' | 'both';
export type DriftScope = 'character' | 'word';

export interface DriftParams {
  axis: DriftAxis;
  amplitude: number;
  frequency: number;
  scope: DriftScope;
}

/**
 * Drift treatment: offsets each cell's position by a sine wave.
 *
 * - axis 'x': x-position shifts, varying down rows (same X offset per row).
 * - axis 'y': y-position shifts, varying across the grid.
 * - axis 'both': both.
 *
 * - scope 'character': y-axis drift varies per-cell (col-based) — letters
 *   within a word end up at different vertical offsets.
 * - scope 'word': y-axis drift varies per-word-repetition (wordIndex-based) —
 *   every letter of a given word shares the same offset, so within-word
 *   tracking stays rigid and words bob as units.
 *
 * Scope only changes behavior for the y-axis component. The x-axis drift
 * is row-based and is already word-consistent (same offset for every
 * letter in a row).
 */
export function createDrift(params: DriftParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'drift',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      const wordLen = Math.max(1, ctx.config.input.length);
      const yIndex = params.scope === 'word' ? Math.floor(col / wordLen) : col;

      const offsetX = (params.axis === 'x' || params.axis === 'both')
        ? Math.sin(row * params.frequency) * params.amplitude
        : 0;
      const offsetY = (params.axis === 'y' || params.axis === 'both')
        ? Math.sin(yIndex * params.frequency) * params.amplitude
        : 0;
      return {
        ...cell,
        position: {
          x: cell.position.x + offsetX,
          y: cell.position.y + offsetY,
        },
      };
    },
  };
}
