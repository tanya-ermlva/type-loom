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

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'difference' | 'lighten' | 'darken';

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

  // Actions.
  setPlaying: (v: boolean) => void;
  setCycleDuration: (v: number) => void;
  setGManual: (v: number) => void;
  setBgColor: (v: string) => void;
  setBlendMode: (v: BlendMode) => void;
  updateStateA: (patch: Partial<BloomState>) => void;
  updateStateB: (patch: Partial<BloomState>) => void;
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

const INITIAL = {
  playing: true,
  cycleDuration: 1.5,
  gManual: 0,
  bgColor: '#FAFAFA',
  blendMode: 'normal' as BlendMode,
  stateA: DEFAULT_A,
  stateB: DEFAULT_B,
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
      reset: () => set({
        stateA: DEFAULT_A, stateB: DEFAULT_B,
        blendMode: 'normal', bgColor: '#FAFAFA',
      }),
    }),
    {
      // v7 — removed per-circle CircleTransition (start/end/easing) — both
      // circles now just lerp linearly from State A to State B as the
      // field strengthens. Older shapes are harmless orphan entries.
      name: 'bloom:state:v7',
      version: 1,
      partialize: (s) => ({
        playing: s.playing,
        cycleDuration: s.cycleDuration,
        gManual: s.gManual,
        bgColor: s.bgColor,
        blendMode: s.blendMode,
        stateA: s.stateA,
        stateB: s.stateB,
      }),
    },
  ),
);
