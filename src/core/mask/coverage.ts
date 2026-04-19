import type { Cell, Size } from '../types';
import type { MaskParams } from './types';

/**
 * Coverage of `mask` over the cell, in [0, 1].
 *
 * - 1 = fully inside the shape (effect applies at full strength)
 * - 0 = fully outside (effect doesn't apply)
 * - in between = soft-edge transition
 *
 * Cell position is normalized against canvas size first.
 */
export function maskCoverage(cell: Cell, canvas: Size, mask: MaskParams): number {
  const px = cell.position.x / canvas.width;
  const py = cell.position.y / canvas.height;
  const sx = Math.max(0.0001, mask.sizeX);
  const sy = Math.max(0.0001, mask.sizeY);

  let d: number;
  if (mask.shape === 'circle') {
    const dx = (px - mask.centerX) / sx;
    const dy = (py - mask.centerY) / sx; // circles use sizeX as radius for both axes
    d = Math.sqrt(dx * dx + dy * dy);
  } else {
    const dx = Math.abs(px - mask.centerX) / sx;
    const dy = Math.abs(py - mask.centerY) / sy;
    d = Math.max(dx, dy);
  }

  let cov: number;
  if (mask.softness <= 0) {
    cov = d <= 1 ? 1 : 0;
  } else {
    const fadeStart = 1 - mask.softness;
    if (d <= fadeStart) cov = 1;
    else if (d >= 1) cov = 0;
    else cov = 1 - (d - fadeStart) / (1 - fadeStart);
  }

  return mask.invert ? 1 - cov : cov;
}
