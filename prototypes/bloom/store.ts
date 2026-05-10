/**
 * Bloom store — single atom prototype.
 *
 * The atom is two SVG circles centered at the same point:
 *   1. DOT — the permanent identity. Stays put across both states; never
 *      shrinks or fades. The wireframe lime dot you'd see on the page.
 *   2. OUTLINE — the temporal element. Stroked circle whose geometric radius
 *      AND stroke width both grow from State A → State B. With a wide enough
 *      stroke, the outline visually covers the dot AND extends beyond it.
 *
 * State A (rest) and State B (active) each define both circles' fields.
 * A growth value g ∈ [0..1] linearly interpolates every field. The atom view
 * supplies g via a play loop or a manual slider; bloom-stack will supply it
 * via per-atom cursor proximity (atom doesn't know or care which).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'difference' | 'lighten' | 'darken';

/** One visual state of the bloom atom. State A and State B share this shape. */
export interface BloomState {
  /** Filled dot — the permanent identity at the atom's center. */
  dotRadius: number;
  dotColor: string;
  dotOpacity: number;

  /** Stroked outline circle — what grows to cover the dot + surroundings. */
  outlineRadius: number;     // geometric radius of the circle the stroke sits on
  outlineStroke: number;     // stroke width — when ≥ 2×outlineRadius, fills the disc
  outlineColor: string;
  outlineOpacity: number;
}

/** Which fields cascade A → B when State A changes (see updateStateA). */
const CASCADE_KEYS: ReadonlyArray<keyof BloomState> = ['dotColor', 'outlineColor'];

interface Store {
  // Playback / preview drivers — atom-view only; stack will ignore these.
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
// At rest you see just the dot. At full growth the outline's stroke is
// thick enough to cover the dot completely and extend past it.
const DEFAULT_A: BloomState = {
  dotRadius: 8,
  dotColor: '#CAEE50',
  dotOpacity: 1,
  outlineRadius: 8,          // sits at the dot's edge
  outlineStroke: 0,          // invisible at rest
  outlineColor: '#CAEE50',   // matches dot by default
  outlineOpacity: 1,
};

const DEFAULT_B: BloomState = {
  dotRadius: 8,              // ← unchanged: dot doesn't shrink
  dotColor: '#CAEE50',       // ← same color as A by default (cascade keeps in sync)
  dotOpacity: 1,             // ← unchanged: dot doesn't fade
  outlineRadius: 16,         // outer radius of the visible stroke band: 16 + 32/2 = 32
  outlineStroke: 32,         // inner edge: 16 − 32/2 = 0 → stroke covers dot & beyond
  outlineColor: '#CAEE50',   // ← same color as A by default
  outlineOpacity: 1,
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
      // State A is the master for color: changing A's dotColor or outlineColor
      // also writes the same value into State B, so the bloom stays one-tone
      // by default. Other fields (radii, opacities, stroke) DON'T cascade —
      // those are exactly what should differ between rest and active.
      // Editing State B never touches State A, so once B is overridden the
      // user has full control over the active palette.
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
      // v4 of the schema — restored split dotColor + outlineColor (v3 had
      // collapsed them into one), now coupled by an A → B cascade rather
      // than by sharing a field. Bumping the storage key keeps prototyping
      // cheap; older shapes (v1 multi-ring, v2 split, v3 single-color) all
      // become harmless orphan entries.
      name: 'bloom:state:v4',
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
