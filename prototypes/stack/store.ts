/**
 * Stack store — Phase 1.5+ (canvas-driven sizing).
 *
 * Holds ONLY stack-level concerns:
 *   • stack canvas size + cycle timing + scroll easing + play/pause
 *   • per-atom colour palette (4 slots, atoms cycle through them)
 *   • per-atom alignment overrides (4 slots, atoms cycle)
 *
 * The actual atom Composition (alignments, character effects, font, etc.)
 * comes live from the Pulse store. Each atom in the stack is the same
 * composition with a different colour and a different phase offset.
 *
 * Atom display dimensions are NO LONGER stored — they're derived per-frame in
 * Stack App.tsx as: atomDisplayWidth = stackCanvasWidth (always fills width);
 * atomDisplayHeight = stackCanvasWidth × (atomCanvasH / atomCanvasW) — i.e.
 * the atom's design aspect is preserved. Atom count = floor(stackCanvasHeight
 * / atomDisplayHeight). So a tall (portrait) stack canvas naturally tiles
 * many atoms vertically; a wider canvas tiles fewer.
 *
 * Persisted to localStorage under `stack:state`. Custom merge backfills any
 * missing fields from defaults so future schema extensions don't crash.
 */
import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import type { AlignmentMode, CubicBezierCurve, EasingMode } from '../pulse/store';

export interface AtomColor {
  blockColor: string;
  textColor: string;
}

/**
 * Per-atom override of state alignments. Any field left undefined inherits
 * the corresponding value from Pulse's composition. Per-line entries inside
 * each array can also be `null` to inherit just that one line.
 */
export interface AtomAlignmentOverride {
  stateA?: (AlignmentMode | null)[];
  stateB?: (AlignmentMode | null)[];
  stateC?: (AlignmentMode | null)[];
}

export const DEFAULT_PALETTE: AtomColor[] = [
  { blockColor: '#0D7EFF', textColor: '#D1D1D1' }, // 1. blue
  { blockColor: '#E453AA', textColor: '#D1D1D1' }, // 2. pink
  { blockColor: '#7DFFB8', textColor: '#0a0a0a' }, // 3. mint — only one with black text
  { blockColor: '#F9576E', textColor: '#D1D1D1' }, // 4. coral
];

/**
 * Number of palette/alignment-override slots. Atoms beyond this index cycle
 * back: atom N picks slot N % SLOT_COUNT. Keeps the override UI manageable
 * even when a tall canvas yields many atoms.
 */
export const SLOT_COUNT = 4;

/** Canvas preset choices. 'custom' uses the W/H values stored in state directly. */
export type CanvasPreset =
  | 'wide'           // 1920 × 1080 (16:9, current default — 4 atoms tall at 1920×270)
  | 'square'         // 1080 × 1080
  | 'portrait-3-4'   // 1080 × 1440
  | 'a4-portrait'    // 1240 × 1754 (~A4 at ~150dpi)
  | 'a4-landscape'   // 1754 × 1240
  | 'a3-portrait'    // 1748 × 2480 (~A3 at ~150dpi)
  | 'a3-landscape'   // 2480 × 1748
  | 'custom';        // user-set W and H (sliders)

export const CANVAS_PRESETS: Record<Exclude<CanvasPreset, 'custom'>, { width: number; height: number }> = {
  'wide':          { width: 1920, height: 1080 },
  'square':        { width: 1080, height: 1080 },
  'portrait-3-4':  { width: 1080, height: 1440 },
  'a4-portrait':   { width: 1240, height: 1754 },
  'a4-landscape':  { width: 1754, height: 1240 },
  'a3-portrait':   { width: 1748, height: 2480 },
  'a3-landscape':  { width: 2480, height: 1748 },
};

export interface StackState {
  /** Selected canvas proportion preset. 'custom' means use stackCanvas{Width,Height} as-is. */
  canvasPreset: CanvasPreset;
  /**
   * Stack canvas dimensions. Mirror the active preset, OR are user-controlled
   * when preset === 'custom'. Persisted so a custom canvas survives reloads.
   */
  stackCanvasWidth: number;
  stackCanvasHeight: number;
  /**
   * Stack canvas background colour. Independent of Pulse's bgColor — change here
   * doesn't affect Pulse and vice versa. Default matches Pulse's default so first
   * load looks identical to before.
   */
  bgColor: string;
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
  /** Master pause/play — controls atoms AND scroll. */
  playing: boolean;
  /**
   * Independently disable vertical scroll motion. When false, atoms still
   * pulse horizontally (governed by `playing`) but the canvas stops snapping.
   */
  scrollEnabled: boolean;
  /**
   * Per-atom colours. Always SLOT_COUNT entries; atoms cycle through them.
   */
  atomPalette: AtomColor[];
  /**
   * Per-atom alignment overrides. Always SLOT_COUNT entries; atoms cycle.
   * Empty `{}` entry = atom inherits all alignments from Pulse for that slot.
   */
  atomAlignmentOverrides: AtomAlignmentOverride[];
  /**
   * How per-atom phase offsets are derived:
   *   • 'step'            — fixed delta between adjacent atoms (atoms add to total spread as count grows).
   *   • 'spread'          — fixed total cascade across N atoms (delta shrinks as count grows).
   *   • 'viewport-spread' — phase is bound to the SLOT POSITION in the viewport,
   *                         not to the atom composition. Top slot always at phase 0,
   *                         bottom slot at phaseSpread%. As you scroll, atom
   *                         compositions cycle through these slot positions,
   *                         each picking up the slot's phase. Eliminates the
   *                         visible "seam" where the cascade wraps from max → 0.
   */
  phaseMode: 'step' | 'spread' | 'viewport-spread';
  /** Per-atom step in 'step' mode. */
  phaseStep: number;
  /** Total spread across all atoms in 'spread' mode. */
  phaseSpread: number;
}

export const DEFAULT_STACK_STATE: StackState = {
  canvasPreset: 'wide',
  stackCanvasWidth: CANVAS_PRESETS.wide.width,
  stackCanvasHeight: CANVAS_PRESETS.wide.height,
  bgColor: '#B0AA6D',  // matches Pulse default for visual continuity
  cycleDuration: 3.0,            // 3-second scroll cycle
  pulsesPerScroll: 1,            // 1 atom pulse per scroll step (atom = 3s in Stack)
  scrollEasing: 'easeOutQuart',
  scrollEasingCurve: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  playing: true,
  scrollEnabled: true,
  atomPalette: DEFAULT_PALETTE,
  atomAlignmentOverrides: [{}, {}, {}, {}],
  phaseMode: 'step',
  phaseStep: 0.02,    // 2 % per atom (in 'step' mode)
  phaseSpread: 0.06,  // 6 % total cascade (in 'spread' mode)
};

interface Store extends StackState {
  setCanvasPreset: (p: CanvasPreset) => void;
  /** Set custom W/H. Implicitly switches preset to 'custom'. */
  setCustomCanvas: (w: number, h: number) => void;
  setBgColor: (c: string) => void;
  setCycleDuration: (v: number) => void;
  setPulsesPerScroll: (v: number) => void;
  setScrollEasing: (v: EasingMode) => void;
  setScrollEasingCurve: (curve: CubicBezierCurve) => void;
  setPlaying: (v: boolean) => void;
  setScrollEnabled: (v: boolean) => void;
  setAtomColor: (idx: number, color: Partial<AtomColor>) => void;
  /** Set one cell of one atom's per-state per-line alignment override. Pass null to inherit. */
  setAtomAlignment: (atomIdx: number, state: 'stateA' | 'stateB' | 'stateC',
                     lineIdx: number, mode: AlignmentMode | null) => void;
  resetAtomAlignments: (atomIdx: number) => void;
  setPhaseStep: (v: number) => void;
  setPhaseMode: (v: 'step' | 'spread' | 'viewport-spread') => void;
  setPhaseSpread: (v: number) => void;
  reset: () => void;
}

const STORAGE_KEY = 'stack:state';
// v2: dropped `atomCount` (now derived from canvas + atom aspect),
//     added `canvasPreset` + `stackCanvasWidth/Height`,
//     palette + alignment overrides fixed to SLOT_COUNT (4) entries.
const SCHEMA_VERSION = 2;

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...DEFAULT_STACK_STATE,
      setCanvasPreset: (canvasPreset) =>
        set(() => {
          if (canvasPreset === 'custom') return { canvasPreset };
          const dims = CANVAS_PRESETS[canvasPreset];
          return { canvasPreset, stackCanvasWidth: dims.width, stackCanvasHeight: dims.height };
        }),
      setCustomCanvas: (w, h) => set({
        canvasPreset: 'custom',
        stackCanvasWidth: Math.max(200, Math.min(8000, Math.round(w))),
        stackCanvasHeight: Math.max(200, Math.min(8000, Math.round(h))),
      }),
      setBgColor: (bgColor) => set({ bgColor }),
      setCycleDuration: (cycleDuration) => set({ cycleDuration: Math.max(0.3, Math.min(15, cycleDuration)) }),
      setPulsesPerScroll: (pulsesPerScroll) =>
        set({ pulsesPerScroll: Math.max(1, Math.min(8, Math.round(pulsesPerScroll))) }),
      setScrollEasing: (scrollEasing) => set({ scrollEasing }),
      setScrollEasingCurve: (scrollEasingCurve) => set({ scrollEasingCurve }),
      setPlaying: (playing) => set({ playing }),
      setScrollEnabled: (scrollEnabled) => set({ scrollEnabled }),
      setAtomColor: (idx, color) =>
        set((s) => {
          const next = s.atomPalette.slice();
          next[idx] = { ...next[idx], ...color };
          return { atomPalette: next };
        }),
      setAtomAlignment: (atomIdx, state, lineIdx, mode) =>
        set((s) => {
          const overrides = s.atomAlignmentOverrides.slice();
          while (overrides.length <= atomIdx) overrides.push({});
          const cur = overrides[atomIdx] ?? {};
          const arr = (cur[state] ?? []).slice() as (AlignmentMode | null)[];
          while (arr.length <= lineIdx) arr.push(null);
          arr[lineIdx] = mode;
          // If all entries are null, drop the array (back to fully inherit for this state).
          const clean = arr.every((v) => v === null) ? undefined : arr;
          overrides[atomIdx] = { ...cur, [state]: clean };
          return { atomAlignmentOverrides: overrides };
        }),
      resetAtomAlignments: (atomIdx) =>
        set((s) => {
          const overrides = s.atomAlignmentOverrides.slice();
          overrides[atomIdx] = {};
          return { atomAlignmentOverrides: overrides };
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
          canvasPreset: s.canvasPreset,
          stackCanvasWidth: s.stackCanvasWidth,
          stackCanvasHeight: s.stackCanvasHeight,
          bgColor: s.bgColor,
          cycleDuration: s.cycleDuration,
          pulsesPerScroll: s.pulsesPerScroll,
          scrollEasing: s.scrollEasing,
          scrollEasingCurve: s.scrollEasingCurve,
          playing: s.playing,
          scrollEnabled: s.scrollEnabled,
          atomPalette: s.atomPalette,
          atomAlignmentOverrides: s.atomAlignmentOverrides,
          phaseMode: s.phaseMode,
          phaseStep: s.phaseStep,
          phaseSpread: s.phaseSpread,
        }) as StorageValue<Store>['state'],
      // v1 → v2: drop atomCount (now derived); backfill the new canvas fields
      // from defaults so older states load cleanly. Field-by-field merge below
      // handles any other missing keys.
      migrate: (persisted, version) => {
        let p = persisted as Record<string, unknown> | null;
        if (version < 2 && p) {
          const { atomCount: _drop, ...preserved } = p;
          p = {
            ...DEFAULT_STACK_STATE,
            ...preserved,
          } as Record<string, unknown>;
        }
        return p as unknown as StorageValue<Store>['state'];
      },
      // Field-by-field merge: missing keys fall back to current (DEFAULT_STACK_STATE).
      // Trim palette + overrides to SLOT_COUNT in case persisted state had more.
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        const p = persisted as Partial<Store>;
        const merged = { ...current, ...p };
        if (merged.atomPalette && merged.atomPalette.length !== SLOT_COUNT) {
          // Pad with defaults if short, trim if long.
          const next = merged.atomPalette.slice(0, SLOT_COUNT);
          while (next.length < SLOT_COUNT) next.push(DEFAULT_PALETTE[next.length] ?? DEFAULT_PALETTE[0]);
          merged.atomPalette = next;
        }
        if (merged.atomAlignmentOverrides && merged.atomAlignmentOverrides.length !== SLOT_COUNT) {
          const next = merged.atomAlignmentOverrides.slice(0, SLOT_COUNT);
          while (next.length < SLOT_COUNT) next.push({});
          merged.atomAlignmentOverrides = next;
        }
        return merged;
      },
    },
  ),
);
