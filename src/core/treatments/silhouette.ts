import type { Cell } from '../types';
import type { Treatment } from './types';

export type SilhouetteShape = 'lens';
// Other shapes (diamond, hourglass, wave, x, circle, custom) deferred to plan 2.

export interface SilhouetteParams {
  shape: SilhouetteShape;
  size: number;       // 0..1, fraction of canvas filled by the shape
  softness: number;   // 0..1, edge fade range (as fraction of size)
  invert: boolean;
}

/**
 * Create a Silhouette treatment with the given parameters.
 * Returns a Treatment whose apply() either hides cells outside the shape
 * or fades them via opacity if softness > 0.
 */
export function createSilhouette(params: SilhouetteParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'silhouette',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      // Normalize (row, col) to (-1..1, -1..1) centered grid.
      const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
      const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Lens: a circle of radius `size`. Inside = full coverage; edge = soft fade.
      const size = Math.max(0.0001, params.size);
      let alpha: number;

      if (params.softness <= 0) {
        // Binary: inside circle or outside
        alpha = dist <= size ? 1 : 0;
      } else {
        // Soft fade: interpolate from fadeStart to fadeEnd
        const fadeStart = size * (1 - params.softness);
        const fadeEnd = size * (1 + params.softness);
        if (dist <= fadeStart) {
          alpha = 1;
        } else if (dist >= fadeEnd) {
          alpha = 0;
        } else {
          alpha = 1 - (dist - fadeStart) / (fadeEnd - fadeStart);
        }
      }

      if (params.invert) alpha = 1 - alpha;

      if (alpha <= 0) {
        return { ...cell, visible: false };
      }
      return { ...cell, visible: true, opacity: cell.opacity * alpha };
    },
  };
}
