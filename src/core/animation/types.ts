import type { TreatmentType } from '../treatments/types';

export type AnimationCurve = 'sine' | 'triangle' | 'sawtooth' | 'ease-in-out';

/**
 * Direction along which staggered animation propagates across the grid.
 * - 'x': left-to-right (cells with larger col are delayed)
 * - 'y': top-to-bottom (cells with larger row are delayed)
 * - 'radial': center outward (cells farther from center are delayed)
 * - 'diagonal': top-left to bottom-right
 */
export type StaggerAxis = 'x' | 'y' | 'radial' | 'diagonal';

/**
 * One animation spec: animates a single numeric param of one treatment.
 *
 * `paramKey` is the param object key on the treatment's stored params
 * (e.g. "size" for Silhouette, "amplitude" for Drift).
 *
 * `staggerAmount` is in seconds. When > 0, each cell receives a per-cell
 * time offset based on its position. staggerAmount=4 with a 4s duration
 * means the wave traverses the grid in exactly one cycle.
 */
export interface AnimationSpec {
  id: string;
  treatmentId: string;
  treatmentType: TreatmentType;
  paramKey: string;
  from: number;
  to: number;
  curve: AnimationCurve;
  duration: number;        // seconds — one full back-and-forth cycle
  delay: number;           // seconds — global phase offset
  staggerAmount: number;   // seconds — per-cell time offset spanning the grid
  staggerAxis: StaggerAxis;
}
