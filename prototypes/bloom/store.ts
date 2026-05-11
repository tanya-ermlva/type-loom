/**
 * Bloom store — single atom prototype.
 *
 * The atom is two filled SVG circles centered at the same point that swap
 * roles between rest and active:
 *   1. SMALL circle — rendered on TOP. At rest it's fully visible (the dot
 *      you see in the DFD wireframe). It shrinks toward 0 as activity rises.
 *   2. BIG circle — rendered BEHIND the small. At rest it's hidden (radius 0
 *      or behind the small). It grows past the small's radius as activity
 *      rises, becoming the dominant visual at full bloom.
 *
 * State A (rest) and State B (active) each define both circles' radius,
 * colour, and opacity. A growth value g ∈ [0..1] linearly interpolates every
 * field — the atom view supplies g via play loop / manual slider, the
 * bloom-stack supplies it via cursor-field strength.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EasingMode } from '../pulse/store';

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'difference' | 'lighten' | 'darken';

/**
 * Per-circle transition config. Each circle interpolates A → B within its
 * own [start, end] sub-range of the bloom's growth value g ∈ [0..1].
 *
 *   start: the g value at which this circle BEGINS transitioning (pins to A below)
 *   end:   the g value at which this circle REACHES B (pins to B above)
 *   easing: the curve applied to the local progress (g remapped into [0,1] inside the range)
 *
 * Defaults [0, 1, linear] reproduce the simple linear lerp. Narrower ranges
 * = faster transitions ("speed"). Non-overlapping ranges = sequenced handoff
 * (e.g. small.end = big.start = 0.5 → small fully shrinks before big grows).
 */
export interface CircleTransition {
  start: number;
  end: number;
  easing: EasingMode;
}

/** One visual state of the bloom atom. State A and State B share this shape. */
export interface BloomState {
  /** Small circle — rendered on top. The dot you see at rest. */
  smallRadius: number;
  smallColor: string;
  smallOpacity: number;

  /** Big circle — rendered behind the small. Hidden at rest, dominant at active. */
  bigRadius: number;
  bigColor: string;
  bigOpacity: number;
}

/** Colour fields that cascade A → B when State A changes (see updateStateA). */
const CASCADE_KEYS: ReadonlyArray<keyof BloomState> = ['smallColor', 'bigColor'];

interface Store {
  // Playback / preview drivers — atom-view only; stack ignores these.
  playing: boolean;
  cycleDuration: number;     // seconds for one full A → B → A loop
  gManual: number;           // used when paused, so you can scrub by hand

  // Canvas-level visual options.
  bgColor: string;
  blendMode: BlendMode;

  // The two states the atom interpolates between.
  stateA: BloomState;
  stateB: BloomState;

  // Per-circle transition shape — speed (via range width) + easing.
  smallTransition: CircleTransition;
  bigTransition: CircleTransition;

  // Actions.
  setPlaying: (v: boolean) => void;
  setCycleDuration: (v: number) => void;
  setGManual: (v: number) => void;
  setBgColor: (v: string) => void;
  setBlendMode: (v: BlendMode) => void;
  updateStateA: (patch: Partial<BloomState>) => void;
  updateStateB: (patch: Partial<BloomState>) => void;
  updateSmallTransition: (patch: Partial<CircleTransition>) => void;
  updateBigTransition: (patch: Partial<CircleTransition>) => void;
  reset: () => void;
}

// Defaults — match the hand-drawn DFD wireframe (lime on near-white).
// At rest you see just the small dot. At full activity the small is gone
// and the big circle dominates at 4× the rest-dot's size.
const DEFAULT_A: BloomState = {
  smallRadius: 8,
  smallColor: '#CAEE50',
  smallOpacity: 1,
  bigRadius: 0,              // hidden at rest (radius 0)
  bigColor: '#CAEE50',       // same colour by default; user can shift via B
  bigOpacity: 1,
};

const DEFAULT_B: BloomState = {
  smallRadius: 0,            // shrunk to nothing at active
  smallColor: '#CAEE50',     // ← same colour as A by default (cascade)
  smallOpacity: 1,
  bigRadius: 32,             // 4× the rest-dot — dominant visual at active
  bigColor: '#CAEE50',
  bigOpacity: 1,
};

const DEFAULT_TRANSITION: CircleTransition = {
  start: 0,
  end: 1,
  easing: 'linear',
};

const INITIAL = {
  playing: true,
  cycleDuration: 1.5,
  gManual: 0,
  bgColor: '#FAFAFA',
  blendMode: 'normal' as BlendMode,
  stateA: DEFAULT_A,
  stateB: DEFAULT_B,
  smallTransition: DEFAULT_TRANSITION,
  bigTransition: DEFAULT_TRANSITION,
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...INITIAL,

      setPlaying: (v) => set({ playing: v }),
      setCycleDuration: (v) => set({ cycleDuration: v }),
      setGManual: (v) => set({ gManual: v }),
      setBgColor: (v) => set({ bgColor: v }),
      setBlendMode: (v) => set({ blendMode: v }),

      // State A is the master for colour: changing A's smallColor or bigColor
      // also writes the same value into State B, so the bloom stays one-tone
      // by default. Other fields (radii, opacities) DON'T cascade — those are
      // exactly what should differ between rest and active.
      // Editing State B never touches State A.
      updateStateA: (patch) => set((s) => {
        const cascade: Partial<BloomState> = {};
        for (const k of CASCADE_KEYS) {
          if (k in patch && patch[k] !== undefined) {
            (cascade as Record<string, unknown>)[k] = patch[k];
          }
        }
        const stateB = Object.keys(cascade).length > 0
          ? { ...s.stateB, ...cascade }
          : s.stateB;
        return { stateA: { ...s.stateA, ...patch }, stateB };
      }),
      updateStateB: (patch) => set((s) => ({ stateB: { ...s.stateB, ...patch } })),
      updateSmallTransition: (patch) => set((s) => ({
        smallTransition: { ...s.smallTransition, ...patch },
      })),
      updateBigTransition: (patch) => set((s) => ({
        bigTransition: { ...s.bigTransition, ...patch },
      })),
      reset: () => set({
        stateA: DEFAULT_A, stateB: DEFAULT_B,
        smallTransition: DEFAULT_TRANSITION,
        bigTransition: DEFAULT_TRANSITION,
        blendMode: 'normal', bgColor: '#FAFAFA',
      }),
    }),
    {
      // v6 — added per-circle CircleTransition (start, end, easing) so the
      // small and big circles can interpolate at their own speed and curve.
      // Older shapes are harmless orphan entries.
      name: 'bloom:state:v6',
      version: 1,
      partialize: (s) => ({
        playing: s.playing,
        cycleDuration: s.cycleDuration,
        gManual: s.gManual,
        bgColor: s.bgColor,
        blendMode: s.blendMode,
        stateA: s.stateA,
        stateB: s.stateB,
        smallTransition: s.smallTransition,
        bigTransition: s.bigTransition,
      }),
    },
  ),
);
