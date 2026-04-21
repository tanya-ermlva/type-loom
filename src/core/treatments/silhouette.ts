import type { Cell } from '../types';
import type { Treatment } from './types';

export type SilhouetteShape = 'lens' | 'diamond' | 'hourglass' | 'wave' | 'x' | 'circle';

export type SilhouetteBlendMode = 'replace' | 'union' | 'intersect' | 'subtract';

export interface SilhouetteParams {
  shape: SilhouetteShape;
  size: number;       // 0..1
  softness: number;   // 0..1
  invert: boolean;
  blendMode: SilhouetteBlendMode;
}

/**
 * Normalized distance for each shape. `distance ≤ size` means fully inside;
 * `distance ≥ size * (1 + softness)` means fully outside.
 */
function shapeDistance(shape: SilhouetteShape, nx: number, ny: number): number {
  switch (shape) {
    case 'lens':
      return Math.sqrt(nx * nx + ny * ny);
    case 'circle':
      return Math.sqrt(nx * nx + ny * ny);
    case 'diamond':
      return Math.abs(nx) + Math.abs(ny);
    case 'hourglass': {
      const offset = 0.5;
      const top = Math.sqrt(nx * nx + (ny - offset) * (ny - offset));
      const bot = Math.sqrt(nx * nx + (ny + offset) * (ny + offset));
      return Math.min(top, bot);
    }
    case 'wave': {
      const centerline = 0.6 * Math.sin(nx * Math.PI * 2);
      return Math.abs(ny - centerline);
    }
    case 'x': {
      return Math.min(Math.abs(nx - ny), Math.abs(nx + ny));
    }
  }
}

function computeCoverage(
  params: SilhouetteParams,
  row: number,
  col: number,
  rows: number,
  columns: number,
): number {
  const nx = columns <= 1 ? 0 : (col / (columns - 1)) * 2 - 1;
  const ny = rows <= 1 ? 0 : (row / (rows - 1)) * 2 - 1;
  const dist = shapeDistance(params.shape, nx, ny);
  const size = Math.max(0.0001, params.size);

  let alpha: number;
  if (params.softness <= 0) {
    alpha = dist <= size ? 1 : 0;
  } else {
    const fadeStart = size * (1 - params.softness);
    const fadeEnd = size * (1 + params.softness);
    if (dist <= fadeStart) alpha = 1;
    else if (dist >= fadeEnd) alpha = 0;
    else alpha = 1 - (dist - fadeStart) / (fadeEnd - fadeStart);
  }

  return params.invert ? 1 - alpha : alpha;
}

function blend(prev: number, next: number, mode: SilhouetteBlendMode): number {
  switch (mode) {
    case 'replace':   return next;
    case 'union':     return 1 - (1 - prev) * (1 - next);
    case 'intersect': return prev * next;
    case 'subtract':  return prev * (1 - next);
  }
}

export function createSilhouette(params: SilhouetteParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'silhouette',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      const coverage = computeCoverage(params, row, col, ctx.rows, ctx.columns);
      const next = blend(cell.silhouetteCoverage, coverage, params.blendMode);
      return { ...cell, silhouetteCoverage: next };
    },
  };
}
