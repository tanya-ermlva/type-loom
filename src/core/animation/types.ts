import type { TreatmentType } from '../treatments/types';

export type AnimationCurve = 'sine' | 'triangle' | 'sawtooth' | 'ease-in-out';

/**
 * Direction along which staggered animation propagates across the grid.
 * - 'x': left → right
 * - 'x-reverse': right → left
 * - 'y': top → bottom
 * - 'y-reverse': bottom → top
 * - 'diagonal': top-left → bottom-right (↘)
 * - 'anti-diagonal': top-right → bottom-left (↙)
 * - 'radial': center → out (cells farther from center are delayed)
 * - 'radial-in': out → center (cells closer to center are delayed)
 * - 'random': deterministic per-cell noise (chaotic burst)
 */
export type StaggerAxis =
  | 'x'
  | 'x-reverse'
  | 'y'
  | 'y-reverse'
  | 'diagonal'
  | 'anti-diagonal'
  | 'radial'
  | 'radial-in'
  | 'random';

/** UI-facing list of stagger axes with human-readable labels. Single source of truth. */
export const STAGGER_AXIS_OPTIONS: ReadonlyArray<{ value: StaggerAxis; label: string }> = [
  { value: 'x',             label: 'x (→)' },
  { value: 'x-reverse',     label: 'x reverse (←)' },
  { value: 'y',             label: 'y (↓)' },
  { value: 'y-reverse',     label: 'y reverse (↑)' },
  { value: 'diagonal',      label: 'diagonal (↘)' },
  { value: 'anti-diagonal', label: 'anti-diagonal (↙)' },
  { value: 'radial',        label: 'radial (out)' },
  { value: 'radial-in',     label: 'radial in' },
  { value: 'random',        label: 'random' },
];

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
  treatmentType?: TreatmentType;  // omitted for config animations (treatmentId === 'config')
  paramKey: string;
  from: number;
  to: number;
  curve: AnimationCurve;
  duration: number;        // seconds — one full back-and-forth cycle
  delay: number;           // seconds — global phase offset
  staggerAmount: number;   // seconds — per-cell time offset spanning the grid
  staggerAxis: StaggerAxis;
}
