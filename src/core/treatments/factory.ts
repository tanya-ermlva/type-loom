import type { Treatment, TreatmentType } from './types';
import { createSilhouette, type SilhouetteParams } from './silhouette';
import { createDrift, type DriftParams } from './drift';
import { createSpacing, type SpacingParams } from './spacing';
import { createScale, type ScaleParams } from './scale';
import { createRotation, type RotationParams } from './rotation';
import { createTint, type TintParams } from './tint';
import { createCharSwap, type CharSwapParams } from './charSwap';
import { createCharScramble, type CharScrambleParams } from './charScramble';
import { createCharField, type CharFieldParams } from './charField';

export type TreatmentParams =
  | SilhouetteParams
  | DriftParams
  | SpacingParams
  | ScaleParams
  | RotationParams
  | TintParams
  | CharSwapParams
  | CharScrambleParams
  | CharFieldParams;

/**
 * Recreate a treatment from its type and a (possibly animated) params object.
 * Preserves the original `id` and `enabled` state, and stashes the params
 * back onto the treatment so cards can read them.
 */
export function recreateTreatment(
  type: TreatmentType,
  params: TreatmentParams,
  id: string,
  enabled: boolean,
): Treatment {
  let t: Treatment;
  switch (type) {
    case 'silhouette': t = createSilhouette(params as SilhouetteParams); break;
    case 'drift':      t = createDrift(params as DriftParams); break;
    case 'spacing':    t = createSpacing(params as SpacingParams); break;
    case 'scale':      t = createScale(params as ScaleParams); break;
    case 'rotation':   t = createRotation(params as RotationParams); break;
    case 'tint':       t = createTint(params as TintParams); break;
    case 'charSwap':     t = createCharSwap(params as CharSwapParams); break;
    case 'charScramble': t = createCharScramble(params as CharScrambleParams); break;
    case 'charField':    t = createCharField(params as CharFieldParams); break;
  }
  return Object.assign(t, { id, enabled, params });
}
