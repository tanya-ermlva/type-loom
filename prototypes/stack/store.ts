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
import type { CubicBezierCurve, EasingMode } from '../pulse/store';

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
  /**
   * Total scroll cycle in seconds — primary timing knob. Defines how often the
   * canvas snaps up by one atomHeight, which is the visible rhythm of the stack.
   */
  cycleDuration: number;
  /**
   * Integer count: how many full atom pulses fit inside one scroll cycle.
   * Atoms in Stack use loopDuration = cycleDuration / pulsesPerScroll (overrides
   * the value from Pulse). Guarantees perfect loop = exactly cycleDuration.
   */
  pulsesPerScroll: number;
  /** Easing curve applied to the vertical scroll motion within each cycle. */
  scrollEasing: EasingMode;
  /** Bezier control points for `scrollEasing === 'cubic-bezier'`. */
  scrollEasingCurve: CubicBezierCurve;
  /** Auto-cycle on/off. */
  playing: boolean;
  /** Number of distinct atom slots in the cycle. Atoms repeat the palette if count > palette.length. */
  atomCount: number;
  /** Per-atom colours. */
  atomPalette: AtomColor[];
  /**
   * How per-atom phase offsets are derived:
   *   • 'step'   — fixed delta between adjacent atoms (atoms add to total spread as count grows).
   *   • 'spread' — fixed total cascade across N atoms (delta shrinks as count grows).
   */
  phaseMode: 'step' | 'spread';
  /** Per-atom step in 'step' mode. */
  phaseStep: number;
  /** Total spread across all atoms in 'spread' mode. */
  phaseSpread: number;
}

export const DEFAULT_STACK_STATE: StackState = {
  canvas: { width: 1920, height: 1080 },
  cycleDuration: 3.0,            // 3-second scroll cycle
  pulsesPerScroll: 1,            // 1 atom pulse per scroll step (atom = 3s in Stack)
  scrollEasing: 'easeOutQuart',
  scrollEasingCurve: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  playing: true,
  atomCount: 4,
  atomPalette: DEFAULT_PALETTE,
  phaseMode: 'step',
  phaseStep: 0.02,    // 2 % per atom (in 'step' mode)
  phaseSpread: 0.06,  // 6 % total cascade (in 'spread' mode)
};

interface Store extends StackState {
  setCycleDuration: (v: number) => void;
  setPulsesPerScroll: (v: number) => void;
  setScrollEasing: (v: EasingMode) => void;
  setScrollEasingCurve: (curve: CubicBezierCurve) => void;
  setPlaying: (v: boolean) => void;
  setAtomCount: (v: number) => void;
  setAtomColor: (idx: number, color: Partial<AtomColor>) => void;
  setPhaseStep: (v: number) => void;
  setPhaseMode: (v: 'step' | 'spread') => void;
  setPhaseSpread: (v: number) => void;
  reset: () => void;
}

const STORAGE_KEY = 'stack:state';
const SCHEMA_VERSION = 1;

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...DEFAULT_STACK_STATE,
      setCycleDuration: (cycleDuration) => set({ cycleDuration: Math.max(0.3, Math.min(15, cycleDuration)) }),
      setPulsesPerScroll: (pulsesPerScroll) =>
        set({ pulsesPerScroll: Math.max(1, Math.min(8, Math.round(pulsesPerScroll))) }),
      setScrollEasing: (scrollEasing) => set({ scrollEasing }),
      setScrollEasingCurve: (scrollEasingCurve) => set({ scrollEasingCurve }),
      setPlaying: (playing) => set({ playing }),
      setAtomCount: (atomCount) => set({ atomCount: Math.max(1, Math.min(16, Math.round(atomCount))) }),
      setAtomColor: (idx, color) =>
        set((s) => {
          const next = s.atomPalette.slice();
          next[idx] = { ...next[idx], ...color };
          return { atomPalette: next };
        }),
      setPhaseStep: (phaseStep) => set({ phaseStep: Math.max(0, Math.min(1, phaseStep)) }),
      setPhaseMode: (phaseMode) => set({ phaseMode }),
      setPhaseSpread: (phaseSpread) => set({ phaseSpread: Math.max(0, Math.min(1, phaseSpread)) }),
      reset: () => set(DEFAULT_STACK_STATE),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (s) =>
        ({
          canvas: s.canvas,
          cycleDuration: s.cycleDuration,
          pulsesPerScroll: s.pulsesPerScroll,
          scrollEasing: s.scrollEasing,
          scrollEasingCurve: s.scrollEasingCurve,
          playing: s.playing,
          atomCount: s.atomCount,
          atomPalette: s.atomPalette,
          phaseMode: s.phaseMode,
          phaseStep: s.phaseStep,
          phaseSpread: s.phaseSpread,
        }) as StorageValue<Store>['state'],
      // Field-by-field merge: missing keys fall back to current (DEFAULT_STACK_STATE).
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        return { ...current, ...(persisted as Partial<Store>) };
      },
    },
  ),
);
