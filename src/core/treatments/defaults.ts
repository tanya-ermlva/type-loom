import type { SilhouetteParams } from './silhouette';
import type { DriftParams } from './drift';
import type { SpacingParams } from './spacing';
import type { ScaleParams } from './scale';
import type { RotationParams } from './rotation';
import type { TintParams } from './tint';
import type { CharSwapParams } from './charSwap';
import type { CharScrambleParams } from './charScramble';
import type { CharFieldParams } from './charField';

/**
 * Canonical default params for each treatment type.
 *
 * Used by:
 * - TreatmentsPanel when adding a new treatment of a given type.
 * - Treatment cards as the `from` value when the user clicks the
 *   "Animate this" (✨) button on a slider.
 */

export const DEFAULT_SILHOUETTE_PARAMS: SilhouetteParams = {
  shape: 'lens',
  size: 0.7,
  softness: 0.1,
  invert: false,
  blendMode: 'intersect',
};

export const DEFAULT_DRIFT_PARAMS: DriftParams = {
  axis: 'x',
  amplitude: 30,
  frequency: 0.4,
};

export const DEFAULT_SPACING_PARAMS: SpacingParams = {
  pattern: 'tight-middle',
  amplitude: 0.5,
  frequency: 1,
  scroll: 0,
};

export const DEFAULT_SCALE_PARAMS: ScaleParams = {
  pattern: 'radial',
  min: 0.5,
  max: 1.5,
};

export const DEFAULT_ROTATION_PARAMS: RotationParams = {
  pattern: 'radial',
  minDegrees: -45,
  maxDegrees: 45,
};

export const DEFAULT_TINT_PARAMS: TintParams = {
  mode: 'opacity',
  pattern: 'radial',
  blendMode: 'normal',
  minOpacity: 0.2,
  maxOpacity: 1,
  colorA: '#1a1a4d',
  colorB: '#f0bb44',
};

export const DEFAULT_CHAR_SWAP_PARAMS: CharSwapParams = {
  pool: '*+#$%@&',
  mode: 'random',
  seed: 0,
  poolIndex: 0,
};

export const DEFAULT_CHAR_SCRAMBLE_PARAMS: CharScrambleParams = {
  pool: '!@#$%&*?_<>',
  mode: 'settle',
  settleStart: 0,
  flipsPerSecond: 12,
  staggerAmount: 1.5,
  staggerAxis: 'y',
};

export const DEFAULT_CHAR_FIELD_PARAMS: CharFieldParams = {
  pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  pattern: 'radial',
  scroll: 0,
};
