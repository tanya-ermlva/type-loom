import { create } from 'zustand';
import { DEFAULT_BASE_CONFIG, type BaseGridConfig } from '../core/types';
import type { Treatment } from '../core/treatments/types';
import type { AnimationSpec } from '../core/animation/types';
import { pickRandomPalette } from '../core/palettes';

function makeInitialConfig(): BaseGridConfig {
  const palette = pickRandomPalette();
  return { ...DEFAULT_BASE_CONFIG, fgColor: palette.fg, bgColor: palette.bg };
}

interface StoreState {
  config: BaseGridConfig;
  treatments: Treatment[];
  animations: AnimationSpec[];

  // Playback
  isPlaying: boolean;
  currentTime: number;     // seconds, wrapped within loopDuration
  loopDuration: number;    // seconds — auto from animations or user-set

  // Config / treatment actions
  updateConfig: (patch: Partial<BaseGridConfig>) => void;
  addTreatment: (t: Treatment) => void;
  removeTreatment: (id: string) => void;
  updateTreatment: (id: string, next: Treatment) => void;

  // Animation actions
  addAnimation: (a: AnimationSpec) => void;
  removeAnimation: (id: string) => void;
  updateAnimation: (id: string, patch: Partial<AnimationSpec>) => void;

  // Playback actions
  setPlaying: (b: boolean) => void;
  setCurrentTime: (t: number) => void;
  setLoopDuration: (d: number) => void;

  randomizePalette: () => void;
  reset: () => void;
}

export const useStore = create<StoreState>((set) => ({
  config: makeInitialConfig(),
  treatments: [],
  animations: [],

  isPlaying: false,
  currentTime: 0,
  loopDuration: 4,

  updateConfig: (patch) =>
    set((s) => ({ config: { ...s.config, ...patch } })),

  addTreatment: (t) =>
    set((s) => ({ treatments: [...s.treatments, t] })),

  removeTreatment: (id) =>
    set((s) => ({
      treatments: s.treatments.filter((t) => t.id !== id),
      // Also drop any animations that targeted this treatment
      animations: s.animations.filter((a) => a.treatmentId !== id),
    })),

  updateTreatment: (id, next) =>
    set((s) => ({ treatments: s.treatments.map((t) => (t.id === id ? next : t)) })),

  addAnimation: (a) =>
    set((s) => ({ animations: [...s.animations, a] })),

  removeAnimation: (id) =>
    set((s) => ({ animations: s.animations.filter((a) => a.id !== id) })),

  updateAnimation: (id, patch) =>
    set((s) => ({
      animations: s.animations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  setPlaying: (b) => set({ isPlaying: b }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setLoopDuration: (d) => set({ loopDuration: Math.max(0.1, d) }),

  randomizePalette: () =>
    set((s) => {
      const p = pickRandomPalette();
      return { config: { ...s.config, fgColor: p.fg, bgColor: p.bg } };
    }),

  reset: () =>
    set({
      config: { ...DEFAULT_BASE_CONFIG },
      treatments: [],
      animations: [],
      isPlaying: false,
      currentTime: 0,
      loopDuration: 4,
    }),
}));
