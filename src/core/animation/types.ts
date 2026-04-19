import type { TreatmentType } from '../treatments/types';

export type AnimationCurve = 'sine' | 'triangle' | 'sawtooth' | 'ease-in-out';

/**
 * One animation spec: animates a single numeric param of one treatment.
 *
 * `paramKey` is the param object key on the treatment's stored params
 * (e.g. "size" for Silhouette, "amplitude" for Drift).
 */
export interface AnimationSpec {
  id: string;
  treatmentId: string;
  treatmentType: TreatmentType;
  paramKey: string;
  from: number;
  to: number;
  curve: AnimationCurve;
  duration: number;   // seconds — one full back-and-forth cycle
  delay: number;      // seconds — phase offset
}
