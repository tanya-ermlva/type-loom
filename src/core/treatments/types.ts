import type { Cell, BaseGridConfig } from '../types';

/**
 * Context passed to every treatment, providing what it needs to compute
 * its modifier function: the base config, the current row/col counts,
 * and the current animation time t (always 0 in v0.1).
 */
export interface TreatmentContext {
  config: BaseGridConfig;
  rows: number;
  columns: number;
  t: number; // seconds since start (0 in v0.1, no animation)
}

/**
 * A treatment is a pure function: given a cell and context, return
 * the modified cell. Treatments compose by being applied in order.
 */
export interface Treatment {
  id: string;
  type: TreatmentType;
  enabled: boolean;
  apply(cell: Cell, row: number, col: number, ctx: TreatmentContext): Cell;
}

export type TreatmentType = 'silhouette';
// Future types: 'spacing' | 'drift' | 'scale' | 'rotation' | 'tint'
