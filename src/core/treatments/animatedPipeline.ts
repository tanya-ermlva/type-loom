import type { Cell } from '../types';
import type { Treatment, TreatmentContext } from './types';
import type { AnimationSpec } from '../animation/types';
import type { MaskParams } from '../mask/types';
import { evaluateAnimation, staggerFraction } from '../animation/evaluate';
import { recreateTreatment, type TreatmentParams } from './factory';
import { maskCoverage } from '../mask/coverage';
import { blendCells } from '../mask/blend';

const MASK_PREFIX = 'mask.';

/**
 * Run the treatment pipeline with per-cell animation evaluation and
 * per-treatment optional masking.
 *
 * For each cell:
 *  1. For each enabled treatment:
 *     - Evaluate animations into the treatment's params (with stagger).
 *     - If the treatment has a mask, compute coverage at this cell.
 *       Coverage 0 → skip, coverage 1 → apply normally,
 *       coverage in between → apply, then blend with original.
 *     - Apply the (possibly recreated) treatment.
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
      const baseParams = (treatment as Treatment & { params?: TreatmentParams }).params;
      const baseMask = treatment.mask ?? null;

      // Resolve params + mask at this (cell, t).
      let effectiveParams: TreatmentParams | undefined = baseParams;
      let effectiveMask: MaskParams | null = baseMask;

      if (anims) {
        const newParams = baseParams ? ({ ...baseParams } as Record<string, unknown>) : null;
        let newMask: MaskParams | null = baseMask ? { ...baseMask } : null;

        for (const anim of anims) {
          const offset = anim.staggerAmount > 0
            ? anim.staggerAmount * staggerFraction(row, col, ctx.rows, ctx.columns, anim.staggerAxis)
            : 0;
          const value = evaluateAnimation(anim, ctx.t + offset);

          if (anim.paramKey.startsWith(MASK_PREFIX)) {
            if (!newMask) newMask = { ...(baseMask ?? { shape: 'circle', centerX: 0.5, centerY: 0.5, sizeX: 0.3, sizeY: 0.3, softness: 0.1, invert: false }) };
            const key = anim.paramKey.slice(MASK_PREFIX.length) as keyof MaskParams;
            (newMask as unknown as Record<string, unknown>)[key as string] = value;
          } else if (newParams) {
            newParams[anim.paramKey] = value;
          }
        }

        if (newParams) effectiveParams = newParams as unknown as TreatmentParams;
        effectiveMask = newMask;
      }

      // If a mask is active, compute coverage and possibly skip / blend.
      if (effectiveMask) {
        const coverage = maskCoverage(next, ctx.config.canvas, effectiveMask);
        if (coverage <= 0) continue;  // outside mask — pass through

        // Build a per-cell version of the treatment with the resolved params.
        const localTreatment = effectiveParams
          ? recreateTreatment(treatment.type, effectiveParams, treatment.id, treatment.enabled)
          : treatment;
        const treated = localTreatment.apply(next, row, col, ctx);
        next = coverage >= 1 ? treated : blendCells(next, treated, coverage);
      } else if (effectiveParams && anims) {
        // No mask, but animations changed the params — recreate and apply.
        const localTreatment = recreateTreatment(
          treatment.type,
          effectiveParams,
          treatment.id,
          treatment.enabled,
        );
        next = localTreatment.apply(next, row, col, ctx);
      } else {
        // No mask, no animations on this treatment — apply directly.
        next = treatment.apply(next, row, col, ctx);
      }
    }
    return next;
  });
}
