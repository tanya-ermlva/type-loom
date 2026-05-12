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
 *
 *   seed / count: only used by generative compositions (random-scatter,
 *                 jittered-grid). DFD compositions ignore them.
 */
export interface CompositionSettings {
  reachX: number;
  reachY: number;
  compositionGap: number;
  seed: number;
  count: number;
}

/** How atom growth values are sourced.
 *
 *   hover    — single field follows the mouse
 *   autoplay — single field pings between two anchors over time
 *   fields   — N placeable static fields, the mouse is ignored; each
 *              atom takes the MAX field-strength across all fields
 */
export type CursorMode = 'hover' | 'autoplay' | 'fields';

/**
 * One placeable force field. Position is stored as a percentage of the
 * active composition's viewBox so it stays sensible across compositions.
 * Reach (ellipse radii) is in viewBox units. Falloff is global (shared
 * with the cursor field) — per-field falloff can be added later if needed.
 */
export interface BloomField {
  id: string;
  cxPct: number;   // 0..1
  cyPct: number;
  reachX: number;  // viewBox units
  reachY: number;
}

/**
 * Autoplay configuration — borrowed from prototypes/compress's field model.
 *
 * The field's centre pings between Anchor A and Anchor B over `loopDuration`
 * seconds, using a sin(π·progress) weight curve so it goes 0 → 1 → 0 and
 * seamlessly loops back to A. Anchors are stored as percentages of the
 * active composition's viewBox (0..1) so they stay sensible across layout
 * switches without re-tuning.
 */
export interface AutoplayConfig {
  loopDuration: number;     // seconds for one full A → B → A cycle
  anchorAX: number;         // anchor A x-percentage of viewBox (0..1)
  anchorAY: number;
  anchorBX: number;
  anchorBY: number;
}

interface Store {
  /** Which named layout to render (single DFD, 3 stacked, etc.). */
  composition: CompositionId;
  /** Per-composition saved settings. Read snapshots[composition] for the
   *  values that drive the active layout. */
  snapshots: Record<CompositionId, CompositionSettings>;
  /** Curve from cursor centre → ellipse edge. Global — not per-composition. */
  fieldFalloff: FalloffKind;
  /** Hover (mouse), autoplay (time-driven), or fields (N static fields). Global. */
  cursorMode: CursorMode;
  /** Autoplay sweep config — used when cursorMode = 'autoplay'. Global. */
  autoplay: AutoplayConfig;
  /** Placeable static fields — used when cursorMode = 'fields'. Global. */
  fields: BloomField[];
  /**
   * 0..1 amount of per-atom random size jitter applied to the SMALL circle.
   * At 0, every atom uses the lerped smallRadius (uniform sizing — matches
   * the previous behaviour). At higher values, each atom multiplies its
   * smallRadius by a deterministic per-atom factor in [1-variance, 1+variance]
   * so the small circles have natural size variety while still scaling
   * with proximity through the underlying lerp.
   */
  smallVariance: number;
  /** Per-letter colour overrides keyed by letter id. Global. */
  letterOverrides: Record<Letter, LetterOverride>;

  setComposition: (v: CompositionId) => void;
  setCompositionGap: (v: number) => void;     // writes snapshots[composition].compositionGap
  setReachX: (v: number) => void;             // writes snapshots[composition].reachX
  setReachY: (v: number) => void;             // writes snapshots[composition].reachY
  setFieldFalloff: (v: FalloffKind) => void;
  setCursorMode: (v: CursorMode) => void;
  updateAutoplay: (patch: Partial<AutoplayConfig>) => void;
  addField: () => void;
  updateField: (id: string, patch: Partial<BloomField>) => void;
  removeField: (id: string) => void;
  setSeed: (v: number) => void;
  regenerateSeed: () => void;
  setCount: (v: number) => void;
  setSmallVariance: (v: number) => void;
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
// seed/count only apply to generative compositions.
const DEFAULT_SNAPSHOTS: Record<CompositionId, CompositionSettings> = {
  'single':         { reachX: 250, reachY: 250, compositionGap: 0,   seed: 1, count: 0   },
  'triple-stack':   { reachX: 250, reachY: 250, compositionGap: 200, seed: 1, count: 0   },
  'grid-3x5':       { reachX: 200, reachY: 200, compositionGap: 150, seed: 1, count: 0   },
  'random-scatter': { reachX: 300, reachY: 300, compositionGap: 0,   seed: 1, count: 80  },
  'jittered-grid':  { reachX: 300, reachY: 300, compositionGap: 0,   seed: 1, count: 120 },
  'circle':           { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 36  },
  'heart':            { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 64  },
  'cross-x':          { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 28  },
  'arrow':            { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 40  },
  'diamond':          { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 32  },
  'star':             { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 40  },
  'wave':             { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 60  },
  'spiral':           { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 96  },
  'concentric-rings': { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 80  },
  'lissajous':        { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 200 },
  'rose':             { reachX: 250, reachY: 250, compositionGap: 0, seed: 1, count: 200 },
  'phyllotaxis':      { reachX: 200, reachY: 200, compositionGap: 0, seed: 1, count: 150 },
};

// Default fields layout: two attractors near the left and right thirds, on
// the horizontal centreline. Gives a recognisable double-bloom on first
// click of the Fields mode. Anchors are %-of-viewBox so they map across
// compositions sensibly.
const DEFAULT_FIELDS: BloomField[] = [
  { id: 'f1', cxPct: 0.30, cyPct: 0.50, reachX: 300, reachY: 300 },
  { id: 'f2', cxPct: 0.70, cyPct: 0.50, reachX: 300, reachY: 300 },
];

// Default autoplay: horizontal sweep across the middle 60% of the canvas
// over 4 seconds. Looks good for any composition since anchors are %-based.
const DEFAULT_AUTOPLAY: AutoplayConfig = {
  loopDuration: 4,
  anchorAX: 0.2, anchorAY: 0.5,
  anchorBX: 0.8, anchorBY: 0.5,
};

const INITIAL = {
  composition: 'single' as CompositionId,
  snapshots: DEFAULT_SNAPSHOTS,
  // Smoothstep gives a soft S-curve falloff that feels "fielded" — atoms
  // bloom in proportion to how close they sit to the cursor, with gentle
  // tapers at both the centre and the edge. Linear works too but feels
  // more like a hard spotlight.
  fieldFalloff: 'smoothstep' as FalloffKind,
  cursorMode: 'hover' as CursorMode,
  autoplay: DEFAULT_AUTOPLAY,
  fields: DEFAULT_FIELDS,
  smallVariance: 0,
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
      setCursorMode: (v) => set({ cursorMode: v }),
      updateAutoplay: (patch) => set((s) => ({
        autoplay: { ...s.autoplay, ...patch },
      })),
      addField: () => set((s) => ({
        fields: [
          ...s.fields,
          {
            id: `f_${Date.now().toString(36)}`,
            cxPct: 0.5, cyPct: 0.5,
            reachX: 300, reachY: 300,
          },
        ],
      })),
      updateField: (id, patch) => set((s) => ({
        fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      })),
      removeField: (id) => set((s) => ({
        fields: s.fields.filter((f) => f.id !== id),
      })),
      // seed + count both write into the active composition's snapshot —
      // mirrors how reach and gap already work.
      setSeed: (v) => set((s) => ({
        snapshots: {
          ...s.snapshots,
          [s.composition]: { ...s.snapshots[s.composition], seed: v },
        },
      })),
      regenerateSeed: () => set((s) => ({
        snapshots: {
          ...s.snapshots,
          [s.composition]: {
            ...s.snapshots[s.composition],
            // Pick a fresh seed that's unlikely to collide with the current
            // one. Math.random + millis keeps it interactive (each click feels
            // distinct) without needing a counter.
            seed: Math.floor(Math.random() * 0xffffffff),
          },
        },
      })),
      setCount: (v) => set((s) => ({
        snapshots: {
          ...s.snapshots,
          [s.composition]: { ...s.snapshots[s.composition], count: v },
        },
      })),
      setSmallVariance: (v) => set({ smallVariance: v }),
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
        fields: DEFAULT_FIELDS,
        letterOverrides: EMPTY_LETTER_OVERRIDES,
      }),
    }),
    {
      // v11 — added generative compositions (random-scatter, jittered-grid),
      // seed + count in CompositionSettings, fields cursorMode + BloomField[]
      // list. Older shapes (v1..v10) are harmless orphan entries.
      name: 'bloom-stack:state:v11',
      version: 1,
      // Custom merge: zustand's default shallow merge replaces top-level
      // keys outright, which means adding a new composition (with no entry
      // in the persisted snapshots map) crashes when the user switches to
      // it. By overlaying persisted.snapshots ONTO DEFAULT_SNAPSHOTS, we
      // get the user's customisations for existing compositions AND the
      // defaults for any composition added since they last saved. Same
      // pattern for the actions — they're never persisted, so we always
      // need the actions from currentState.
      merge: (persisted, current) => {
        if (typeof persisted !== 'object' || persisted === null) {
          return current as Store;
        }
        const p = persisted as Partial<Store>;
        return {
          ...current,
          ...p,
          snapshots: {
            ...DEFAULT_SNAPSHOTS,
            ...(p.snapshots && typeof p.snapshots === 'object' ? p.snapshots : {}),
          },
        } as Store;
      },
      partialize: (s) => ({
        composition: s.composition,
        snapshots: s.snapshots,
        fieldFalloff: s.fieldFalloff,
        cursorMode: s.cursorMode,
        autoplay: s.autoplay,
        fields: s.fields,
        smallVariance: s.smallVariance,
        letterOverrides: s.letterOverrides,
      }),
    },
  ),
);
