import type { Cell } from '../types';
import type { Treatment } from './types';

export type DriftAxis = 'x' | 'y' | 'both';

export interface DriftParams {
  axis: DriftAxis;
  amplitude: number;   // px
  frequency: number;   // cycles per unit (rad/index)
}

/**
 * Drift treatment: offsets each cell's position by a sine wave function
 * of its (row, col) index.
 *
 * - axis 'x': x positions shift, varying with row index (waves down each column)
 * - axis 'y': y positions shift, varying with column index (waves across each row)
 * - axis 'both': both effects combined
 */
export function createDrift(params: DriftParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'drift',
    enabled: true,
    apply(cell: Cell, row: number, col: number) {
      const offsetX = (params.axis === 'x' || params.axis === 'both')
        ? Math.sin(row * params.frequency) * params.amplitude
        : 0;
      const offsetY = (params.axis === 'y' || params.axis === 'both')
        ? Math.sin(col * params.frequency) * params.amplitude
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
