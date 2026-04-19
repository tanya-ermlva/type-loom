export type MaskShape = 'circle' | 'rect';

/**
 * A mask spatially limits where a treatment applies. All position values
 * are normalized: 0..1 across canvas width/height. The mask is centered
 * on (centerX, centerY); sizeX is the half-extent horizontally, sizeY is
 * the half-extent vertically (sizeY ignored for circles — they use sizeX
 * as radius).
 *
 * `softness` (0..1) gives a soft edge fade; `invert` flips the mask so
 * the effect applies *outside* the shape instead of inside.
 */
export interface MaskParams {
  shape: MaskShape;
  centerX: number;
  centerY: number;
  sizeX: number;
  sizeY: number;
  softness: number;
  invert: boolean;
}

export const DEFAULT_MASK: MaskParams = {
  shape: 'circle',
  centerX: 0.5,
  centerY: 0.5,
  sizeX: 0.3,
  sizeY: 0.3,
  softness: 0.1,
  invert: false,
};
