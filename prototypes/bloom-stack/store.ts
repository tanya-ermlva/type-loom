/**
 * Bloom-stack store — composition-level state only.
 *
 * The atom config (State A / State B, blend mode, bg) lives in the bloom
 * atom's store (`../bloom/store`) and is shared across both routes — tweaks
 * in /bloom show up immediately in /bloom-stack and vice-versa. This store
 * only owns the things specific to the composition: the cursor's field of
 * influence (an ellipse with a falloff curve) and the layout choice.
 *
 * The "field" model is borrowed from prototypes/compress: every atom reads
 * its growth value g from the field strength at its position, where the
 * field is centered on the cursor, shaped as an ellipse (reachX × reachY),
 * and decays from 1 (at the cursor) to 0 (at the ellipse edge) according
 * to the chosen falloff curve. Stretching the ellipse asymmetrically gives
 * "horizontal stripe" or "vertical stripe" feels without any special-case
 * mode logic.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompositionId } from '../bloom/compositions';
import type { Letter } from '../bloom/positions';

/**
 * Curves from the compress prototype's force-field model — all return 1 at
 * d=0 (cursor) and 0 at d=1 (ellipse edge), smoothly in between.
 *
 *   linear        — straight taper.
 *   smoothstep    — 3d² − 2d³ inverted, soft S-curve at both ends.
 *   smootherstep  — Perlin's flatter-ended variant.
 *   gaussian      — bell curve, tight peak with long soft tail.
 *   constant      — flat plateau, sudden cliff at the edge.
 */
export type FalloffKind =
  | 'linear'
  | 'smoothstep'
  | 'smootherstep'
  | 'gaussian'
  | 'constant';

/**
 * Per-letter palette override. Each field is either `null` (inherit from the
 * shared atom config) or a colour value that replaces the atom config's
 * corresponding colour for atoms of this letter.
 *
 * Note: the override applies to BOTH State A and State B for that letter.
 * That keeps the UI light (one swatch per field, not four), and matches the
 * common case where each letter has a colour identity that's consistent
 * across rest and active. If we want per-state per-letter colours later,
 * this struct can grow without breaking the store key.
 */
export interface LetterOverride {
  smallColor: string | null;
  bigColor: string | null;
}

/**
 * Per-composition settings — the fields whose ideal value depends on the
 * layout. Each composition keeps its own snapshot so switching layouts
 * preserves the user's tuning per layout. Defaults seed the map at init;
 * setters write to the active composition's entry; setComposition just
 * changes which entry is active (no auto-reseed).
 */
export interface CompositionSettings {
  reachX: number;
  reachY: number;
  compositionGap: number;
}

interface Store {
  /** Which named layout to render (single DFD, 3 stacked, etc.). */
  composition: CompositionId;
  /** Per-composition saved settings. Read snapshots[composition] for the
   *  values that drive the active layout. */
  snapshots: Record<CompositionId, CompositionSettings>;
  /** Curve from cursor centre → ellipse edge. Global — not per-composition. */
  fieldFalloff: FalloffKind;
  /** Per-letter colour overrides keyed by letter id. Global. */
  letterOverrides: Record<Letter, LetterOverride>;

  setComposition: (v: CompositionId) => void;
  setCompositionGap: (v: number) => void;     // writes snapshots[composition].compositionGap
  setReachX: (v: number) => void;             // writes snapshots[composition].reachX
  setReachY: (v: number) => void;             // writes snapshots[composition].reachY
  setFieldFalloff: (v: FalloffKind) => void;
  setLetterOverride: (letter: Letter, patch: Partial<LetterOverride>) => void;
  clearLetterOverride: (letter: Letter) => void;
  reset: () => void;
}

const EMPTY_LETTER_OVERRIDES: Record<Letter, LetterOverride> = {
  D1: { smallColor: null, bigColor: null },
  F:  { smallColor: null, bigColor: null },
  D2: { smallColor: null, bigColor: null },
};

// Default settings per composition. 250 ≈ 2.5 grid cells in the source
// viewBox; grid uses a tighter reach so each cluster blooms independently.
// Gap defaults follow each composition's defaultGap in compositions.ts.
const DEFAULT_SNAPSHOTS: Record<CompositionId, CompositionSettings> = {
  'single':       { reachX: 250, reachY: 250, compositionGap: 0   },
  'triple-stack': { reachX: 250, reachY: 250, compositionGap: 200 },
  'grid-3x5':     { reachX: 200, reachY: 200, compositionGap: 150 },
};

const INITIAL = {
  composition: 'single' as CompositionId,
  snapshots: DEFAULT_SNAPSHOTS,
  // Smoothstep gives a soft S-curve falloff that feels "fielded" — atoms
  // bloom in proportion to how close they sit to the cursor, with gentle
  // tapers at both the centre and the edge. Linear works too but feels
  // more like a hard spotlight.
  fieldFalloff: 'smoothstep' as FalloffKind,
  letterOverrides: EMPTY_LETTER_OVERRIDES,
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...INITIAL,
      setComposition: (v) => set({ composition: v }),
      // Each reach/gap setter writes into the active composition's snapshot,
      // so the user's tuning is preserved per-layout. Switching composition
      // (above) just changes which snapshot is active — no auto-reseed.
      setCompositionGap: (v) => set((s) => ({
        snapshots: {
          ...s.snapshots,
          [s.composition]: { ...s.snapshots[s.composition], compositionGap: v },
        },
      })),
      setReachX: (v) => set((s) => ({
        snapshots: {
          ...s.snapshots,
          [s.composition]: { ...s.snapshots[s.composition], reachX: v },
        },
      })),
      setReachY: (v) => set((s) => ({
        snapshots: {
          ...s.snapshots,
          [s.composition]: { ...s.snapshots[s.composition], reachY: v },
        },
      })),
      setFieldFalloff: (v) => set({ fieldFalloff: v }),
      setLetterOverride: (letter, patch) => set((s) => ({
        letterOverrides: {
          ...s.letterOverrides,
          [letter]: { ...s.letterOverrides[letter], ...patch },
        },
      })),
      clearLetterOverride: (letter) => set((s) => ({
        letterOverrides: {
          ...s.letterOverrides,
          [letter]: { smallColor: null, bigColor: null },
        },
      })),
      reset: () => set({
        ...INITIAL,
        snapshots: DEFAULT_SNAPSHOTS,
        letterOverrides: EMPTY_LETTER_OVERRIDES,
      }),
    }),
    {
      // v8 — reach + gap moved into a per-composition snapshots map so
      // switching layouts preserves the user's tuning per layout. Older
      // shapes (v1..v7) are harmless orphan localStorage entries.
      name: 'bloom-stack:state:v8',
      version: 1,
      partialize: (s) => ({
        composition: s.composition,
        snapshots: s.snapshots,
        fieldFalloff: s.fieldFalloff,
        letterOverrides: s.letterOverrides,
      }),
    },
  ),
);
