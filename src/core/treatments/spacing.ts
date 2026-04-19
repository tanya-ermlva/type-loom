import type { Cell } from '../types';
import type { Treatment } from './types';

export type SpacingPattern = 'tight-middle' | 'tight-edges' | 'sine';

export interface SpacingParams {
  pattern: SpacingPattern;
  amplitude: number;   // 0..1, how strong the variation is
  frequency: number;   // for 'sine' pattern only, cycles down the canvas
  scroll: number;      // for 'sine' pattern only, radians/sec to shift the wave; +down, -up
}

/**
 * Spacing rhythm treatment: varies the horizontal cell-spacing per row.
 *
 * Each row gets a tracking multiplier based on its position. Cells in
 * that row are repositioned: their x is rescaled relative to the canvas
 * left edge.
 *
 * - tight-middle: middle rows have tighter tracking, edges are spread out
 * - tight-edges: middle rows are spread out, edges tighten
 * - sine: a sine wave of tracking variation as you go down rows.
 *   `scroll > 0` makes the wave travel down the canvas over time;
 *   `scroll < 0` travels up; 0 = static spatial pattern (default).
 */
export function createSpacing(params: SpacingParams): Treatment {
  const scroll = params.scroll ?? 0;
  return {
    id: crypto.randomUUID(),
    type: 'spacing',
    enabled: true,
    apply(cell: Cell, row: number, _col: number, ctx) {
      const rowFraction = ctx.rows <= 1 ? 0.5 : row / (ctx.rows - 1); // 0..1
      const distFromCenter = Math.abs(rowFraction - 0.5) * 2;          // 0 at middle, 1 at edges

      let multiplier: number;
      switch (params.pattern) {
        case 'tight-middle':
          // middle = 1 - amp (tighter), edges = 1 + amp (looser)
          multiplier = 1 - params.amplitude + 2 * params.amplitude * distFromCenter;
          break;
        case 'tight-edges':
          // middle = 1 + amp (looser), edges = 1 - amp (tighter)
          multiplier = 1 + params.amplitude - 2 * params.amplitude * distFromCenter;
          break;
        case 'sine':
          multiplier =
            1 + params.amplitude * Math.sin(rowFraction * Math.PI * params.frequency - ctx.t * scroll);
          break;
      }
      multiplier = Math.max(0.05, multiplier);

      // Rescale x position from canvas center.
      const center = ctx.config.canvas.width / 2;
      const newX = center + (cell.position.x - center) * multiplier;

      return { ...cell, position: { x: newX, y: cell.position.y } };
    },
  };
}
