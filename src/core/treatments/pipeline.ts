import type { Cell } from '../types';
import type { Treatment, TreatmentContext } from './types';

/**
 * Run all enabled treatments over every cell, in stack order.
 * Returns a new array; does not mutate the input.
 */
export function runPipeline(
  cells: Cell[],
  treatments: Treatment[],
  ctx: TreatmentContext,
): Cell[] {
  if (treatments.length === 0) return cells;
  const active = treatments.filter(t => t.enabled);
  if (active.length === 0) return cells;

  return cells.map((cell, idx) => {
    const row = Math.floor(idx / ctx.columns);
    const col = idx % ctx.columns;
    let next = cell;
    for (const treatment of active) {
      next = treatment.apply(next, row, col, ctx);
    }
    return next;
  });
}
