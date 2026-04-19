import type { Cell } from '../types';
import type { Treatment, TreatmentContext } from './types';
import type { AnimationSpec } from '../animation/types';
import { evaluateAnimation, staggerFraction } from '../animation/evaluate';
import { recreateTreatment, type TreatmentParams } from './factory';

/**
 * Run the treatment pipeline with per-cell animation evaluation.
 *
 * For each cell, every animated treatment param is evaluated at
 * `t + staggerAmount * staggerFraction(row, col, axis)`, producing the
 * staggered/rippling effect. Treatments with no animations are applied
 * directly without recreation.
 *
 * Treatments without stagger still pay the per-cell evaluation cost, but
 * since `evaluateAnimation` is cheap and the per-cell offset is just 0,
 * results are identical to global animation.
 */
export function runAnimatedPipeline(
  cells: Cell[],
  treatments: Treatment[],
  animations: AnimationSpec[],
  ctx: TreatmentContext,
): Cell[] {
  if (treatments.length === 0) return cells;
  const active = treatments.filter((t) => t.enabled);
  if (active.length === 0) return cells;

  // Group animations by treatment id so we don't filter per cell.
  const animsByTreatment = new Map<string, AnimationSpec[]>();
  for (const t of active) {
    const a = animations.filter((an) => an.treatmentId === t.id);
    if (a.length > 0) animsByTreatment.set(t.id, a);
  }

  return cells.map((cell, idx) => {
    const row = Math.floor(idx / ctx.columns);
    const col = idx % ctx.columns;
    let next = cell;

    for (const treatment of active) {
      const anims = animsByTreatment.get(treatment.id);
      if (!anims) {
        next = treatment.apply(next, row, col, ctx);
        continue;
      }
      const baseParams = (treatment as Treatment & { params?: TreatmentParams }).params;
      if (!baseParams) {
        next = treatment.apply(next, row, col, ctx);
        continue;
      }
      // Evaluate each animation at this cell's time.
      const newParams = { ...baseParams } as Record<string, unknown>;
      for (const anim of anims) {
        const offset = anim.staggerAmount > 0
          ? anim.staggerAmount * staggerFraction(row, col, ctx.rows, ctx.columns, anim.staggerAxis)
          : 0;
        newParams[anim.paramKey] = evaluateAnimation(anim, ctx.t + offset);
      }
      const localTreatment = recreateTreatment(
        treatment.type,
        newParams as unknown as TreatmentParams,
        treatment.id,
        treatment.enabled,
      );
      next = localTreatment.apply(next, row, col, ctx);
    }
    return next;
  });
}
