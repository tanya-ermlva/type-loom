import type { Cell } from '../types';
import type { Treatment } from './types';

export type SpacingPattern =
  | 'uniform'        // no variation (multiplier = 1 everywhere)
  | 'tight-middle'   // V-shape: middle tight, edges loose (linear)
  | 'tight-edges'    // Λ-shape: middle loose, edges tight (linear)
  | 'bell'           // smooth gaussian peak in middle (softer V)
  | 'valley'         // smooth gaussian valley in middle (softer Λ)
  | 'linear-down'    // top tight → bottom loose
  | 'linear-up'      // top loose → bottom tight
  | 'stepped'        // 3 plateaus going from loose to tight
  | 'sine'           // sine wave (uses frequency + scroll params)
  | 'spike'          // single tight row in the middle, rest loose
  | 'zebra'          // alternating tight / loose per row
  | 'random';        // deterministic per-row noise

export interface SpacingParams {
  pattern: SpacingPattern;
  amplitude: number;   // 0..1, how strong the variation is
  frequency: number;   // for 'sine' pattern only, cycles down the canvas
  scroll: number;      // for 'sine' pattern only, full sine cycles per loop; +down, -up. Integer values produce seamless loops.
}

/**
 * Deterministic 0..1 hash from an integer seed. Same as the prototype's
 * trick — cheap, stable per-frame, perfect for visual noise.
 */
function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Returns a 0..1 "tightness" value for a row.
 *   0 = loose (multiplier = 1 + amp)
 *   1 = tight (multiplier = 1 - amp)
 *   0.5 = neutral (multiplier = 1)
 *
 * The pattern functions all share this output range so a single mapping
 * formula at the call site converts to a tracking multiplier.
 */
function spacingShape(
  pattern: SpacingPattern,
  rowFraction: number,
  totalRows: number,
  row: number,
  params: SpacingParams,
  t: number,
  loopDuration: number,
): number {
  const distFromCenter = Math.abs(rowFraction - 0.5) * 2; // 0 mid, 1 edges
  switch (pattern) {
    case 'uniform':
      return 0.5;
    case 'tight-middle':
      return 1 - distFromCenter;
    case 'tight-edges':
      return distFromCenter;
    case 'bell': {
      // Smooth gaussian peak at middle. sigma 0.25 → near-zero at edges.
      return Math.exp(-Math.pow((rowFraction - 0.5) / 0.25, 2) / 2);
    }
    case 'valley': {
      return 1 - Math.exp(-Math.pow((rowFraction - 0.5) / 0.25, 2) / 2);
    }
    case 'linear-down':
      return 1 - rowFraction;
    case 'linear-up':
      return rowFraction;
    case 'stepped': {
      // 3 plateaus: rows split into thirds, each third = constant tightness.
      const step = Math.min(2, Math.floor(rowFraction * 3));
      return step / 2;
    }
    case 'sine': {
      // Original behaviour preserved: frequency + scroll-animated phase.
      const loop = Math.max(0.0001, loopDuration);
      const phaseShift = (t / loop) * 2 * Math.PI * (params.scroll ?? 0);
      const wave = Math.sin(rowFraction * Math.PI * params.frequency - phaseShift);
      return (wave + 1) / 2;
    }
    case 'spike':
      return row === Math.round((totalRows - 1) / 2) ? 1 : 0;
    case 'zebra':
      return row % 2 === 0 ? 0 : 1;
    case 'random':
      return hash01(row * 31 + 7);
  }
}

/**
 * Spacing rhythm treatment: varies horizontal cell-spacing per row.
 *
 * Each row gets a tracking multiplier based on its position via spacingShape().
 * Cells in that row are repositioned: their x is rescaled relative to canvas
 * center. Twelve patterns cover smooth curves, ramps, oscillations, and
 * discrete shapes.
 */
export function createSpacing(params: SpacingParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'spacing',
    enabled: true,
    apply(cell: Cell, row: number, _col: number, ctx) {
      const rowFraction = ctx.rows <= 1 ? 0.5 : row / (ctx.rows - 1);
      const tightness = spacingShape(
        params.pattern,
        rowFraction,
        ctx.rows,
        row,
        params,
        ctx.t,
        ctx.loopDuration,
      );
      // Map tightness [0..1] → multiplier [1+amp .. 1-amp].
      // tightness 0 → loose (1+amp), tightness 1 → tight (1-amp).
      let multiplier = 1 + params.amplitude - 2 * params.amplitude * tightness;
      multiplier = Math.max(0.05, multiplier);

      const center = ctx.config.canvas.width / 2;
      const newX = center + (cell.position.x - center) * multiplier;
      return { ...cell, position: { x: newX, y: cell.position.y } };
    },
  };
}
