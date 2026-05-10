import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import { tokenize } from './tokens';

// ---------- Types ----------

export interface Token {
  id: string;
  text: string;
}

export interface Line {
  id: string;
  tokens: Token[];
}

export type AlignmentMode =
  | 'left'
  | 'right'
  | 'centered'
  | 'justified'
  | 'justified-chars'   // every CHARACTER in the line is evenly spaced; first letter
                        // at left edge, last letter at right edge. intra-token and
                        // inter-token gaps are identical
  | 'stretched'         // each token grows in width (scaleX) to fill the line, no gaps
  | 'gravity-left'      // tokens cluster at left, exponentially growing gaps toward right
  | 'gravity-right'     // mirror of gravity-left
  | 'hugging-edges'     // first/last at edges, middle clustered in centre
  | 'scattered'         // deterministic random positions within the line (seeded)
  | 'mirrored'          // tokens placed in reverse visual order
  | 'offset-justified'  // justified but with quadratic-growing gaps
  | 'exploded';         // fixed large gaps (overflow allowed)

/**
 * Full Penner easing set + custom cubic-bezier. Keys mirror easings.net naming.
 * 'cubic-bezier' is special — pair it with `easingCurve` for the actual curve.
 */
export type EasingMode =
  | 'linear'
  | 'easeInSine' | 'easeOutSine' | 'easeInOutSine'
  | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
  | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint'
  | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeInCirc' | 'easeOutCirc' | 'easeInOutCirc'
  | 'easeInBack' | 'easeOutBack' | 'easeInOutBack'
  | 'easeInElastic' | 'easeOutElastic' | 'easeInOutElastic'
  | 'easeInBounce' | 'easeOutBounce' | 'easeInOutBounce'
  | 'cubic-bezier'
  // Legacy aliases for state migrated from earlier prototypes.
  | 'easeIn' | 'easeOut' | 'easeInOut';

export interface CubicBezierCurve {
  x1: number; y1: number; x2: number; y2: number;
}

export type DirectionMode = 'ping-pong' | 'one-way' | 'freeze-A' | 'freeze-B';

export type BgFillMode = 'continuous' | 'per-token';

export type CharacterEffect = 'none' | 'bow' | 'fan' | 'stretch' | 'wave';

export interface Composition {
  // Content
  lines: Line[];
  // Canvas
  canvasWidth: number;
  canvasHeight: number;
  // Colors
  bgColor: string;
  blockColor: string;
  textColor: string;
  // Typography
  fontFamily: string;
  fontSize: number;
  letterSpacingPct: number;
  lineHeight: number;
  interLineGap: number;
  tokenSpacingTight: number;
  // Layout per state
  stateA: { alignments: AlignmentMode[] };
  stateB: { alignments: AlignmentMode[] };
  /** Optional third state. When `useStateC` is true, the cycle becomes A→B→C→A. */
  stateC: { alignments: AlignmentMode[] };
  useStateC: boolean;
  edgePadding: number;
  /**
   * Per-line bg fill mode. One entry per line.
   * 'continuous' = one rect per line, spans first→last token (gaps between tokens are filled).
   * 'per-token'  = one rect per token, exactly its bounds (gaps reveal canvas bg).
   */
  bgBoundsModes: BgFillMode[];
  // Animation
  loopDuration: number;
  easing: EasingMode;
  /** Bezier control points for `easing === 'cubic-bezier'` (else unused). */
  easingCurve: CubicBezierCurve;
  direction: DirectionMode;
  phaseOffset: number;
  perTokenStagger: number;
  perLineOffset: number;
  bgLag: number;
  // Random
  jitterX: number;
  jitterY: number;
  jitterSeed: number;
  // Color trails — staggered echoes of the bg rect, fading from blockColor
  // (90% opacity at the closest trail) to blockColor (0% opacity at the deepest).
  trailsEnabled: boolean;
  /** Number of trail echoes (1..8). Each is blockColor with linearly decreasing opacity. */
  trailCount: number;
  /** Lag (fraction of cycle) added per trail relative to the main rect. */
  trailLagStep: number;
  // Character-level animation (per-letter effects, layered on top of token motion).
  characterStaggerEnabled: boolean;
  characterStagger: number;       // 0..0.5, per-character stagger window
  characterEffect: CharacterEffect;
  characterAmplitude: number;     // strength of the effect (px or degrees, depending on mode)
  // Debug
  showTokenBounds: boolean;
  showLineBounds: boolean;
  showCanvasGrid: boolean;
  showTValue: boolean;
  showStateLabel: boolean;
}

// ---------- Defaults ----------

export const DEFAULT_COMPOSITION: Composition = {
  lines: [
    { id: 'l1', tokens: [
      { id: 't1', text: 'Digital' },
      { id: 't2', text: 'Freedom' },
      { id: 't3', text: 'Dialogue' },
    ]},
    { id: 'l2', tokens: [
      { id: 't4', text: '8' },
      { id: 't5', text: '–' },  // en-dash (U+2013)
      { id: 't6', text: '11' },
      { id: 't7', text: 'June' },
    ]},
  ],
  canvasWidth: 1920,
  canvasHeight: 270,
  bgColor: '#B0AA6D',
  blockColor: '#0D7EFF',
  textColor: '#0a0a0a',
  fontFamily: '"NHaas Grotesk Display Pro", sans-serif',
  fontSize: 136,
  letterSpacingPct: -1,
  lineHeight: 138.5,
  interLineGap: 0,
  tokenSpacingTight: 36,
  stateA: { alignments: ['centered', 'centered'] },
  stateB: { alignments: ['left', 'justified'] },
  stateC: { alignments: ['right', 'centered'] },
  useStateC: false,
  edgePadding: 0,
  bgBoundsModes: ['continuous', 'continuous'],
  loopDuration: 2.0,
  easing: 'cubic-bezier',
  easingCurve: { x1: 0.84, y1: 0.02, x2: 0.25, y2: 1.00 },
  direction: 'ping-pong',
  phaseOffset: 0,
  perTokenStagger: 0,
  perLineOffset: 0,
  bgLag: 0,
  jitterX: 0,
  jitterY: 0,
  jitterSeed: 1,
  trailsEnabled: false,
  trailCount: 4,
  trailLagStep: 0.05,
  characterStaggerEnabled: false,
  characterStagger: 0.3,
  characterEffect: 'bow',
  characterAmplitude: 30,
  showTokenBounds: false,
  showLineBounds: false,
  showCanvasGrid: false,
  showTValue: true,
  showStateLabel: true,
};

// ---------- Store ----------

interface Store {
  composition: Composition;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  updateComposition: (patch: Partial<Composition>) => void;
  setLineText: (lineIdx: number, text: string) => void;
  reseedJitter: () => void;
  resetComposition: () => void;
}

const STORAGE_KEY = 'pulse:state';
const SCHEMA_VERSION = 4;

export const useStore = create<Store>()(
  persist(
    (set) => ({
      composition: DEFAULT_COMPOSITION,
      playing: true,
      setPlaying: (v) => set({ playing: v }),
      updateComposition: (patch) =>
        set((s) => ({ composition: { ...s.composition, ...patch } })),
      setLineText: (lineIdx, text) =>
        set((s) => {
          const next = { ...s.composition, lines: s.composition.lines.slice() };
          next.lines[lineIdx] = {
            ...next.lines[lineIdx],
            tokens: tokenize(text, next.lines[lineIdx].id),
          };
          return { composition: next };
        }),
      reseedJitter: () =>
        set((s) => ({
          composition: { ...s.composition, jitterSeed: s.composition.jitterSeed + 1 },
        })),
      resetComposition: () => set({ composition: DEFAULT_COMPOSITION }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      // Only persist the composition; UI state is per-session.
      partialize: (s) => ({ composition: s.composition }) as StorageValue<Store>['state'],
      // When the schema gains new fields, backfill them from defaults so older
      // localStorage states don't crash with `undefined` reads.
      migrate: (persisted, version) => {
        let p = persisted as { composition?: Record<string, unknown> } | null;
        if (version < 3) {
          // Old shapes may carry `bgBoundsMode` (singular string, removed in v3)
          // or no fill mode at all. Strip both forms; let DEFAULT_COMPOSITION
          // provide the fresh `bgBoundsModes` array via the merge step below.
          const old = p?.composition ?? {};
          const { bgBoundsMode: _drop, bgBoundsModes: _drop2, ...preserved } = old;
          p = {
            composition: {
              ...DEFAULT_COMPOSITION,
              ...(preserved as Partial<Composition>),
            },
          };
        }
        if (version < 4) {
          // v4: trail palette (`trailColors: string[]`) replaced by `trailCount`.
          // Each trail is now blockColor with auto-computed fading opacity.
          // Strip the dead palette so it doesn't ride along as an unknown field.
          const old = p?.composition ?? {};
          const { trailColors: _drop, ...preserved } = old;
          p = {
            composition: {
              ...DEFAULT_COMPOSITION,
              ...(preserved as Partial<Composition>),
            },
          };
        }
        return p as unknown as StorageValue<Store>['state'];
      },
      // Default merge in zustand is shallow — `{ ...current, ...persisted }` —
      // which means a persisted composition without a new field overwrites the
      // current composition entirely, leaving the new field undefined. We do a
      // field-by-field merge for `composition` so missing fields fall back to
      // the current defaults. This belt-and-suspenders the migrate step above.
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        const p = persisted as Partial<Store>;
        return {
          ...current,
          ...p,
          composition: {
            ...current.composition,
            ...(p.composition ?? {}),
          },
        };
      },
    },
  ),
);
