/**
 * Stack store — Phase 1.5.
 *
 * Holds ONLY stack-level concerns:
 *   • canvas size + cycle timing + scroll easing + play/pause
 *   • atom count + per-atom colour palette
 *
 * The actual atom Composition (alignments, character effects, font, etc.)
 * comes live from the Pulse store. Each atom in the stack is the same
 * composition with a different colour and a different phase offset (i / N).
 *
 * Persisted to localStorage under `stack:state`. Custom merge backfills any
 * missing fields from defaults so future schema extensions don't crash.
 */
import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import type { EasingMode } from '../pulse/store';

export interface AtomColor {
  blockColor: string;
  textColor: string;
}

export const DEFAULT_PALETTE: AtomColor[] = [
  { blockColor: '#0D7EFF', textColor: '#D1D1D1' }, // 1. blue
  { blockColor: '#E453AA', textColor: '#D1D1D1' }, // 2. pink
  { blockColor: '#7DFFB8', textColor: '#0a0a0a' }, // 3. mint — only one with black text
  { blockColor: '#F9576E', textColor: '#D1D1D1' }, // 4. coral
];

export interface StackState {
  canvas: { width: number; height: number };
  /** Total cycle time in seconds. One cycle = one scroll-step + one full horizontal pulse cycle. */
  cycleDuration: number;
  /** Easing curve applied to the vertical scroll motion within each cycle. */
  scrollEasing: EasingMode;
  /** Auto-cycle on/off. */
  playing: boolean;
  /** Number of distinct atom slots in the cycle. Atoms repeat the palette if count > palette.length. */
  atomCount: number;
  /** Per-atom colours. */
  atomPalette: AtomColor[];
}

export const DEFAULT_STACK_STATE: StackState = {
  canvas: { width: 1920, height: 1080 },
  cycleDuration: 3,
  scrollEasing: 'easeOutQuart',
  playing: true,
  atomCount: 4,
  atomPalette: DEFAULT_PALETTE,
};

interface Store extends StackState {
  setCycleDuration: (v: number) => void;
  setScrollEasing: (v: EasingMode) => void;
  setPlaying: (v: boolean) => void;
  setAtomCount: (v: number) => void;
  setAtomColor: (idx: number, color: Partial<AtomColor>) => void;
  reset: () => void;
}

const STORAGE_KEY = 'stack:state';
const SCHEMA_VERSION = 1;

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...DEFAULT_STACK_STATE,
      setCycleDuration: (cycleDuration) => set({ cycleDuration }),
      setScrollEasing: (scrollEasing) => set({ scrollEasing }),
      setPlaying: (playing) => set({ playing }),
      setAtomCount: (atomCount) => set({ atomCount: Math.max(1, Math.min(8, Math.round(atomCount))) }),
      setAtomColor: (idx, color) =>
        set((s) => {
          const next = s.atomPalette.slice();
          next[idx] = { ...next[idx], ...color };
          return { atomPalette: next };
        }),
      reset: () => set(DEFAULT_STACK_STATE),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (s) =>
        ({
          canvas: s.canvas,
          cycleDuration: s.cycleDuration,
          scrollEasing: s.scrollEasing,
          playing: s.playing,
          atomCount: s.atomCount,
          atomPalette: s.atomPalette,
        }) as StorageValue<Store>['state'],
      // Field-by-field merge: missing keys fall back to current (DEFAULT_STACK_STATE).
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        return { ...current, ...(persisted as Partial<Store>) };
      },
    },
  ),
);
