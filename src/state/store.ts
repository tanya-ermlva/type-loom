import { create } from 'zustand';
import { DEFAULT_BASE_CONFIG, type BaseGridConfig } from '../core/types';
import type { Treatment } from '../core/treatments/types';

interface StoreState {
  config: BaseGridConfig;
  treatments: Treatment[];

  updateConfig: (patch: Partial<BaseGridConfig>) => void;
  addTreatment: (t: Treatment) => void;
  removeTreatment: (id: string) => void;
  updateTreatment: (id: string, next: Treatment) => void;
  reset: () => void;
}

export const useStore = create<StoreState>((set) => ({
  config: { ...DEFAULT_BASE_CONFIG },
  treatments: [],

  updateConfig: (patch) =>
    set((s) => ({ config: { ...s.config, ...patch } })),

  addTreatment: (t) =>
    set((s) => ({ treatments: [...s.treatments, t] })),

  removeTreatment: (id) =>
    set((s) => ({ treatments: s.treatments.filter(t => t.id !== id) })),

  updateTreatment: (id, next) =>
    set((s) => ({ treatments: s.treatments.map(t => t.id === id ? next : t) })),

  reset: () =>
    set({ config: { ...DEFAULT_BASE_CONFIG }, treatments: [] }),
}));
