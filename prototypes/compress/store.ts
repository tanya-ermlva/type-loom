import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alignment, FalloffKind, Field, GlobalParams } from './types';
import type { ProjectSnapshot } from './persistence';

// A4 portrait at 100 dpi-ish. Keeps the unit small enough for the canvas
// shadow / sidebar layout but stays in the right proportions.
export const CANVAS_W = 1190;
export const CANVAS_H = 1684;

// Color palette derived from Tatiana's reference photos: navy / green / red /
// brown / pink (cream stool image). These are the only colors in the
// rotation when "Randomize colors" is fired.
export const PALETTE = [
  { name: 'navy',  fg: '#0f2952', bg: '#dde9d4' },
  { name: 'green', fg: '#1f4934', bg: '#f0ead6' },
  { name: 'red',   fg: '#a8341e', bg: '#f5e8d4' },
  { name: 'brown', fg: '#3a2818', bg: '#e8c89c' },
  { name: 'pink',  fg: '#1a1a1a', bg: '#f4c8c8' },
];

// Per-word blob colors. Each word in the input string gets the color at
// its index (mod palette length), so all instances of "DIGITAL" stay one
// color across rows + cycles. Saturated, slightly off-tone — closer to
// poster-print inks than CSS-default brights.
export const WORD_COLORS = [
  '#d61e2c', // red
  '#3a9234', // green
  '#f0c14b', // yellow
  '#e83e8c', // pink/magenta
  '#2549b8', // blue
  '#6b46c1', // purple
];

const initialField: Field = {
  id: 'f1',
  cx: CANVAS_W / 2,
  cy: CANVAS_H / 2,
  sx: 350,
  sy: 500,
  fx: CANVAS_W / 2, // force center starts coincident with shape center
  fy: CANVAS_H / 2,
  // Animation target defaults to the same point as fx/fy → no animation
  // until the user drags the target ghost handle elsewhere.
  targetFx: CANVAS_W / 2,
  targetFy: CANVAS_H / 2,
  strength: 60, // attraction by default — produces compression
};

/** Clamp (fx, fy) so the force center stays just inside the shape ellipse.
 *  If the requested point is outside, project it back onto the boundary. */
export function clampForceCenter(
  fx: number, fy: number, cx: number, cy: number, sx: number, sy: number,
): { fx: number; fy: number } {
  const nx = (fx - cx) / sx;
  const ny = (fy - cy) / sy;
  const r = Math.sqrt(nx * nx + ny * ny);
  if (r <= 0.98) return { fx, fy };
  const scale = 0.98 / r; // pull just inside the boundary
  return { fx: cx + nx * scale * sx, fy: cy + ny * scale * sy };
}

const initialGlobals: GlobalParams = {
  word: 'DIGITAL FREEDOM DIALOGUE',
  charCount: 25,
  rowCount: 30,
  letterSize: 28,
  minDistance: 32,
  rowSpacing: 51,
  columnSpacing: 34,
  alignment: 'center',
  edgeRowsLocked: 1,
  edgeFalloffRows: 3,
  falloff: 'smoothstep',
  dropTolerance: 60,
  loopDuration: 4,
  wordBackgrounds: true,
  wordBlobSize: 66,
  wordBlobBlur: 25.5,
  wordBlobWobble: 46,
  wordColors: ['#ff79bc', '#ff3300', '#47a966', ...WORD_COLORS.slice(3)],
  backgroundColor: '#d1d1d1',
};

type State = {
  fields: Field[];
  globals: GlobalParams;
  selectedFieldId: string | null;
  paletteIndex: number;
  /** Animation playback state — not persisted across reloads. */
  isPlaying: boolean;
  /** Current loop progress in [0, 1]. Driven by the rAF loop in App. */
  progress: number;
};

type Actions = {
  // fields
  addField: () => void;
  removeField: (id: string) => void;
  duplicateField: (id: string) => void;
  updateField: (id: string, patch: Partial<Field>) => void;
  selectField: (id: string | null) => void;
  // globals
  updateGlobals: (patch: Partial<GlobalParams>) => void;
  setAlignment: (a: Alignment) => void;
  setFalloff: (f: FalloffKind) => void;
  // palette
  cyclePalette: () => void;
  // animation
  togglePlay: () => void;
  setProgress: (p: number) => void;
  // word colors
  setWordColor: (idx: number, color: string) => void;
  // project snapshots
  toSnapshot: () => ProjectSnapshot;
  loadSnapshot: (s: ProjectSnapshot) => void;
  // misc
  reset: () => void;
};

let nextId = 2;

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      fields: [initialField],
      globals: initialGlobals,
      selectedFieldId: 'f1',
      paletteIndex: 0,
      isPlaying: false,
      progress: 0,

      addField: () =>
        set((s) => {
          const id = `f${nextId++}`;
          const cx = CANVAS_W / 2 + (s.fields.length % 3 - 1) * 200;
          const cy = CANVAS_H / 2 + (Math.floor(s.fields.length / 3)) * 200;
          return {
            fields: [
              ...s.fields,
              {
                id,
                cx, cy,
                sx: 300,
                sy: 400,
                fx: cx, fy: cy, // new fields start with coincident force center
                targetFx: cx, targetFy: cy, // no animation by default
                strength: 60,
              },
            ],
            selectedFieldId: id,
          };
        }),

      removeField: (id) =>
        set((s) => {
          const next = s.fields.filter((f) => f.id !== id);
          return {
            fields: next,
            selectedFieldId: s.selectedFieldId === id
              ? (next[0]?.id ?? null)
              : s.selectedFieldId,
          };
        }),

      duplicateField: (id) =>
        set((s) => {
          const src = s.fields.find((f) => f.id === id);
          if (!src) return s;
          const newId = `f${nextId++}`;
          // Offset the copy by 40px diagonally so it doesn't sit exactly
          // on top of the original — the user can immediately see + drag
          // it. Force center moves with the shape (preserves offset).
          const dx = 40;
          const dy = 40;
          const copy: Field = {
            ...src,
            id: newId,
            cx: src.cx + dx,
            cy: src.cy + dy,
            fx: src.fx + dx,
            fy: src.fy + dy,
            targetFx: src.targetFx + dx,
            targetFy: src.targetFy + dy,
          };
          // Insert right after the source so list order stays predictable.
          const idx = s.fields.findIndex((f) => f.id === id);
          const next = [...s.fields.slice(0, idx + 1), copy, ...s.fields.slice(idx + 1)];
          return { fields: next, selectedFieldId: newId };
        }),

      updateField: (id, patch) =>
        set((s) => ({
          fields: s.fields.map((f) => {
            if (f.id !== id) return f;
            const next = { ...f, ...patch };
            // Force center AND animation target must stay inside the shape —
            // clamp both on every update so resizing the shape can't strand
            // either point outside the ellipse.
            const fc = clampForceCenter(next.fx, next.fy, next.cx, next.cy, next.sx, next.sy);
            const tc = clampForceCenter(next.targetFx, next.targetFy, next.cx, next.cy, next.sx, next.sy);
            return { ...next, fx: fc.fx, fy: fc.fy, targetFx: tc.fx, targetFy: tc.fy };
          }),
        })),

      selectField: (id) => set({ selectedFieldId: id }),

      updateGlobals: (patch) =>
        set((s) => ({ globals: { ...s.globals, ...patch } })),

      setAlignment: (a) =>
        set((s) => ({ globals: { ...s.globals, alignment: a } })),

      setFalloff: (f) =>
        set((s) => ({ globals: { ...s.globals, falloff: f } })),

      cyclePalette: () => set((s) => ({ paletteIndex: (s.paletteIndex + 1) % PALETTE.length })),

      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
      setProgress: (p) => set({ progress: p }),

      setWordColor: (idx, color) =>
        set((s) => {
          // Grow array up to idx if needed (filling gaps with palette defaults).
          const next = [...s.globals.wordColors];
          while (next.length <= idx) next.push(WORD_COLORS[next.length % WORD_COLORS.length]);
          next[idx] = color;
          return { globals: { ...s.globals, wordColors: next } };
        }),

      toSnapshot: () => {
        const s = get();
        return {
          schemaVersion: 1,
          fields: s.fields,
          globals: s.globals,
          selectedFieldId: s.selectedFieldId,
        };
      },

      loadSnapshot: (snap) =>
        set({
          fields: snap.fields,
          globals: snap.globals,
          selectedFieldId: snap.selectedFieldId,
          // Always start paused — opening a project shouldn't fire animation.
          isPlaying: false,
          progress: 0,
        }),

      reset: () =>
        set({
          fields: [initialField],
          globals: initialGlobals,
          selectedFieldId: 'f1',
          paletteIndex: 0,
          isPlaying: false,
          progress: 0,
        }),
    }),
    {
      name: 'compress-store-v1',
      version: 2,
      // Don't persist transient animation state — every reload starts paused
      // at progress=0 so the UI doesn't surprise the user with playback
      // continuing from somewhere mid-loop.
      partialize: (state) => ({
        fields: state.fields,
        globals: state.globals,
        selectedFieldId: state.selectedFieldId,
        paletteIndex: state.paletteIndex,
      }),
      // v2 added fx/fy (force center). Backfill any field that lacks them.
      // targetFx/targetFy added later — also backfilled here using the merge
      // callback below for any persisted state that predates them.
      migrate: (persisted: unknown, version: number) => {
        const p = persisted as { fields?: Array<Field & Partial<{ fx: number; fy: number; targetFx: number; targetFy: number }>> } | undefined;
        if (!p) return persisted as State & Actions;
        if (version < 2 && p.fields) {
          p.fields = p.fields.map((f) => ({
            ...f,
            fx: f.fx ?? f.cx,
            fy: f.fy ?? f.cy,
          }));
        }
        if (p.fields) {
          p.fields = p.fields.map((f) => ({
            ...f,
            targetFx: f.targetFx ?? f.fx ?? f.cx,
            targetFy: f.targetFy ?? f.fy ?? f.cy,
          }));
        }
        return p as unknown as State & Actions;
      },
      // Deep-merge persisted globals over the current defaults so adding new
      // global params (like dropTolerance) doesn't break old persisted state.
      // Fields also get backfilled here for any new per-field property added
      // since the state was last persisted — keeps the prototype evolvable
      // without bumping the version on every change.
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined;
        if (!p) return current;
        const fields = (p.fields ?? current.fields).map((f) => ({
          ...f,
          fx: f.fx ?? f.cx,
          fy: f.fy ?? f.cy,
          targetFx: f.targetFx ?? f.fx ?? f.cx,
          targetFy: f.targetFy ?? f.fy ?? f.cy,
        }));
        // backgroundColor is new — backfill from the persisted paletteIndex
        // if it's missing so users keep their last canvas color.
        const persistedGlobals = p.globals ?? {};
        const paletteIdx = p.paletteIndex ?? 0;
        const backgroundColor =
          persistedGlobals.backgroundColor ?? PALETTE[paletteIdx % PALETTE.length].bg;
        return {
          ...current,
          ...p,
          fields,
          globals: { ...current.globals, ...persistedGlobals, backgroundColor },
        };
      },
    },
  ),
);
