import type { Treatment, TreatmentType } from '../treatments/types';
import type { AnimationSpec } from '../animation/types';
import type { BaseGridConfig } from '../types';
import type { MaskParams } from '../mask/types';
import { recreateTreatment, type TreatmentParams } from '../treatments/factory';

export interface SerializedTreatment {
  id: string;
  type: TreatmentType;
  enabled: boolean;
  params: TreatmentParams;
  mask: MaskParams | null;
}

export interface ProjectSnapshot {
  schemaVersion: 1;
  config: BaseGridConfig;
  treatments: SerializedTreatment[];
  animations: AnimationSpec[];
  loopDuration: number;
  showMaskOverlays: boolean;
}

export interface SnapshotState {
  config: BaseGridConfig;
  treatments: Treatment[];
  animations: AnimationSpec[];
  loopDuration: number;
  showMaskOverlays: boolean;
}

/**
 * Strip the `apply` function off a treatment so it can be JSON-serialized.
 */
export function serializeTreatment(t: Treatment): SerializedTreatment {
  const params = (t as Treatment & { params?: TreatmentParams }).params;
  if (!params) throw new Error(`Treatment ${t.id} (${t.type}) has no .params; cannot serialize`);
  return {
    id: t.id,
    type: t.type,
    enabled: t.enabled,
    params,
    mask: t.mask ?? null,
  };
}

export function deserializeTreatment(s: SerializedTreatment): Treatment {
  const t = recreateTreatment(s.type, s.params, s.id, s.enabled);
  if (s.mask) t.mask = s.mask;
  return t;
}

export function makeSnapshot(state: SnapshotState): ProjectSnapshot {
  return {
    schemaVersion: 1,
    config: { ...state.config },
    treatments: state.treatments.map(serializeTreatment),
    animations: state.animations.map((a) => ({ ...a })),
    loopDuration: state.loopDuration,
    showMaskOverlays: state.showMaskOverlays,
  };
}

export function fromSnapshot(snap: ProjectSnapshot): SnapshotState {
  return {
    config: snap.config,
    treatments: snap.treatments.map(deserializeTreatment),
    animations: snap.animations.map((a) => ({ ...a })),
    loopDuration: snap.loopDuration,
    showMaskOverlays: snap.showMaskOverlays,
  };
}
