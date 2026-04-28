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

  /** Undo/redo stacks — snapshots of creative state only. */
  history: ProjectSnapshot[];
  redoStack: ProjectSnapshot[];

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

  /** Pop the most recent snapshot off history; pushes current state onto redo. */
  undo: () => boolean;
  /** Inverse of undo. */
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Module-level debounce state for history pushes.
 * Slider drags fire dozens of `update*` calls per second — we don't want each
 * pixel of motion to become its own undo step. Same `key` within HISTORY_DEBOUNCE_MS
 * collapses to a single entry (the "before drag" snapshot).
 */
const HISTORY_DEBOUNCE_MS = 350;
const HISTORY_MAX_SIZE = 50;
let lastHistoryKey: string | null = null;
let lastHistoryTime = 0;

function shouldDebounce(key: string | null): boolean {
  if (!key) return false; // discrete actions never debounce
  const now = Date.now();
  if (lastHistoryKey === key && now - lastHistoryTime < HISTORY_DEBOUNCE_MS) {
    lastHistoryTime = now;
    return true;
  }
  lastHistoryKey = key;
  lastHistoryTime = now;
  return false;
}

function resetHistoryDebounce() {
  lastHistoryKey = null;
  lastHistoryTime = 0;
}

export const useStore = create<StoreState>((set, get) => {
  /**
   * Capture the current creative state into history *before* a mutation runs.
   * `key` enables drag debouncing — pass a stable per-target key (e.g.
   * 'treatment-<id>') for slider streams; omit for discrete actions.
   */
  const recordHistory = (key?: string) => {
    if (shouldDebounce(key ?? null)) return;
    set((s) => ({
      history: [...s.history, makeSnapshot(s)].slice(-HISTORY_MAX_SIZE),
      redoStack: [],
    }));
  };

  return {
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

    history: [],
    redoStack: [],

    updateConfig: (patch) => {
      recordHistory('config');
      set((s) => ({ config: { ...s.config, ...patch }, isDirty: true }));
    },

    addTreatment: (t) => {
      recordHistory();
      set((s) => ({ treatments: [...s.treatments, t], isDirty: true }));
    },

    removeTreatment: (id) => {
      recordHistory();
      set((s) => ({
        treatments: s.treatments.filter((t) => t.id !== id),
        animations: s.animations.filter((a) => a.treatmentId !== id),
        isDirty: true,
      }));
    },

    updateTreatment: (id, next) => {
      recordHistory(`treatment-${id}`);
      set((s) => ({
        treatments: s.treatments.map((t) => (t.id === id ? next : t)),
        isDirty: true,
      }));
    },

    addAnimation: (a) => {
      recordHistory();
      set((s) => ({ animations: [...s.animations, a], isDirty: true }));
    },

    removeAnimation: (id) => {
      recordHistory();
      set((s) => ({ animations: s.animations.filter((a) => a.id !== id), isDirty: true }));
    },

    updateAnimation: (id, patch) => {
      recordHistory(`animation-${id}`);
      set((s) => ({
        animations: s.animations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        isDirty: true,
      }));
    },

    setPlaying: (b) => set({ isPlaying: b }),
    setCurrentTime: (t) => set({ currentTime: t }),
    setLoopDuration: (d) => {
      recordHistory('loop');
      set({ loopDuration: Math.max(0.1, d), isDirty: true });
    },
    setPlaybackSpeed: (s) => set({ playbackSpeed: Math.max(0.05, s) }),
    setShowMaskOverlays: (b) => {
      recordHistory();
      set({ showMaskOverlays: b });
    },

    randomizePalette: () => {
      recordHistory();
      set((s) => {
        const p = pickRandomPalette();
        return { config: { ...s.config, fgColor: p.fg, bgColor: p.bg }, isDirty: true };
      });
    },

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
      resetHistoryDebounce();
      set({
        ...restored,
        currentProjectId: proj.id,
        currentProjectName: proj.name,
        isPlaying: false,
        currentTime: 0,
        isDirty: false,
        history: [],
        redoStack: [],
      });
      return true;
    },

    loadSnapshot: (snap) => {
      const restored = fromSnapshot(snap);
      resetHistoryDebounce();
      set({
        ...restored,
        currentProjectId: null,
        currentProjectName: 'Untitled',
        isPlaying: false,
        currentTime: 0,
        isDirty: false,
        history: [],
        redoStack: [],
      });
    },

    newProject: () => {
      resetHistoryDebounce();
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
        history: [],
        redoStack: [],
      });
    },

    setProjectName: (name) => set({ currentProjectName: name, isDirty: true }),

    markClean: () => set({ isDirty: false }),

    reset: () => {
      resetHistoryDebounce();
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
        history: [],
        redoStack: [],
      });
    },

    undo: () => {
      const s = get();
      if (s.history.length === 0) return false;
      const target = s.history[s.history.length - 1];
      const restored = fromSnapshot(target);
      resetHistoryDebounce();
      set({
        ...restored,
        history: s.history.slice(0, -1),
        redoStack: [...s.redoStack, makeSnapshot(s)].slice(-HISTORY_MAX_SIZE),
        isDirty: true,
      });
      return true;
    },

    redo: () => {
      const s = get();
      if (s.redoStack.length === 0) return false;
      const target = s.redoStack[s.redoStack.length - 1];
      const restored = fromSnapshot(target);
      resetHistoryDebounce();
      set({
        ...restored,
        history: [...s.history, makeSnapshot(s)].slice(-HISTORY_MAX_SIZE),
        redoStack: s.redoStack.slice(0, -1),
        isDirty: true,
      });
      return true;
    },

    canUndo: () => get().history.length > 0,
    canRedo: () => get().redoStack.length > 0,
  };
});

export { listProjects, deleteProject, duplicateProject, renameProject } from '../core/persistence/storage';
