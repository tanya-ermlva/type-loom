import { create } from 'zustand';
import { DEFAULT_BASE_CONFIG, type BaseGridConfig } from '../core/types';
import type { Treatment } from '../core/treatments/types';
import type { AnimationSpec } from '../core/animation/types';
import { pickRandomPalette } from '../core/palettes';
import { fromSnapshot, makeSnapshot, type ProjectSnapshot } from '../core/persistence/serialize';
import * as storage from '../core/persistence/storage';

function makeInitialConfig(): BaseGridConfig {
  const palette = pickRandomPalette();
  return { ...DEFAULT_BASE_CONFIG, fgColor: palette.fg, bgColor: palette.bg };
}

interface StoreState {
  config: BaseGridConfig;
  treatments: Treatment[];
  animations: AnimationSpec[];

  isPlaying: boolean;
  currentTime: number;
  loopDuration: number;
  playbackSpeed: number;        // multiplier on time advancement (1 = normal)
  showMaskOverlays: boolean;

  currentProjectId: string | null;
  currentProjectName: string;
  isDirty: boolean;

  updateConfig: (patch: Partial<BaseGridConfig>) => void;
  addTreatment: (t: Treatment) => void;
  removeTreatment: (id: string) => void;
  updateTreatment: (id: string, next: Treatment) => void;

  addAnimation: (a: AnimationSpec) => void;
  removeAnimation: (id: string) => void;
  updateAnimation: (id: string, patch: Partial<AnimationSpec>) => void;

  setPlaying: (b: boolean) => void;
  setCurrentTime: (t: number) => void;
  setLoopDuration: (d: number) => void;
  setPlaybackSpeed: (s: number) => void;
  setShowMaskOverlays: (b: boolean) => void;

  randomizePalette: () => void;

  saveCurrentProject: (name: string, thumbnail?: string) => storage.SavedProject;
  saveAsNewProject: (name: string, thumbnail?: string) => storage.SavedProject;
  loadProject: (id: string) => boolean;
  loadSnapshot: (snap: ProjectSnapshot) => void;
  newProject: () => void;
  setProjectName: (name: string) => void;
  markClean: () => void;
  reset: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  config: makeInitialConfig(),
  treatments: [],
  animations: [],

  isPlaying: false,
  currentTime: 0,
  loopDuration: 4,
  playbackSpeed: 1,
  showMaskOverlays: true,

  currentProjectId: null,
  currentProjectName: 'Untitled',
  isDirty: false,

  updateConfig: (patch) =>
    set((s) => ({ config: { ...s.config, ...patch }, isDirty: true })),

  addTreatment: (t) =>
    set((s) => ({ treatments: [...s.treatments, t], isDirty: true })),

  removeTreatment: (id) =>
    set((s) => ({
      treatments: s.treatments.filter((t) => t.id !== id),
      animations: s.animations.filter((a) => a.treatmentId !== id),
      isDirty: true,
    })),

  updateTreatment: (id, next) =>
    set((s) => ({
      treatments: s.treatments.map((t) => (t.id === id ? next : t)),
      isDirty: true,
    })),

  addAnimation: (a) =>
    set((s) => ({ animations: [...s.animations, a], isDirty: true })),

  removeAnimation: (id) =>
    set((s) => ({ animations: s.animations.filter((a) => a.id !== id), isDirty: true })),

  updateAnimation: (id, patch) =>
    set((s) => ({
      animations: s.animations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      isDirty: true,
    })),

  setPlaying: (b) => set({ isPlaying: b }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setLoopDuration: (d) => set({ loopDuration: Math.max(0.1, d), isDirty: true }),
  setPlaybackSpeed: (s) => set({ playbackSpeed: Math.max(0.05, s) }),
  setShowMaskOverlays: (b) => set({ showMaskOverlays: b }),

  randomizePalette: () =>
    set((s) => {
      const p = pickRandomPalette();
      return { config: { ...s.config, fgColor: p.fg, bgColor: p.bg }, isDirty: true };
    }),

  saveCurrentProject: (name, thumbnail) => {
    const s = get();
    const snap = makeSnapshot(s);
    const saved = storage.saveProject(name, snap, thumbnail, s.currentProjectId ?? undefined);
    set({ currentProjectId: saved.id, currentProjectName: saved.name, isDirty: false });
    return saved;
  },

  saveAsNewProject: (name, thumbnail) => {
    const snap = makeSnapshot(get());
    const saved = storage.saveProject(name, snap, thumbnail);
    set({ currentProjectId: saved.id, currentProjectName: saved.name, isDirty: false });
    return saved;
  },

  loadProject: (id) => {
    const proj = storage.getProject(id);
    if (!proj) return false;
    const restored = fromSnapshot(proj.snapshot);
    set({
      ...restored,
      currentProjectId: proj.id,
      currentProjectName: proj.name,
      isPlaying: false,
      currentTime: 0,
      isDirty: false,
    });
    return true;
  },

  loadSnapshot: (snap) => {
    const restored = fromSnapshot(snap);
    set({
      ...restored,
      currentProjectId: null,
      currentProjectName: 'Untitled',
      isPlaying: false,
      currentTime: 0,
      isDirty: false,
    });
  },

  newProject: () =>
    set({
      config: makeInitialConfig(),
      treatments: [],
      animations: [],
      isPlaying: false,
      currentTime: 0,
      loopDuration: 4,
      currentProjectId: null,
      currentProjectName: 'Untitled',
      isDirty: false,
    }),

  setProjectName: (name) => set({ currentProjectName: name, isDirty: true }),

  markClean: () => set({ isDirty: false }),

  reset: () =>
    set({
      config: { ...DEFAULT_BASE_CONFIG },
      treatments: [],
      animations: [],
      isPlaying: false,
      currentTime: 0,
      loopDuration: 4,
      showMaskOverlays: true,
      currentProjectId: null,
      currentProjectName: 'Untitled',
      isDirty: false,
    }),
}));

export { listProjects, deleteProject, duplicateProject, renameProject } from '../core/persistence/storage';
