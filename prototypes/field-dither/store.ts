import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Field, GlobalParams } from './types';

export const CANVAS_W = 1190;
export const CANVAS_H = 1684;

const initialField: Field = {
  id: 'f1',
  cx: CANVAS_W / 2,
  cy: CANVAS_H / 2,
  sx: 350,
  sy: 500,
  fx: CANVAS_W / 2,
  fy: CANVAS_H / 2,
  strength: 0.6,
};

const initialGlobals: GlobalParams = {
  word: 'OPERATORS DITHER FIELD',
  charCount: 48,
  rowCount: 64,
  letterSize: 18,
  rowSpacing: 22,
  columnSpacing: 22,
  baseDensity: 0.0,
  threshold: 0.5,
  ditherAlgo: 'floyd-steinberg',
  falloff: 'smoothstep',
  backgroundColor: '#0a0a0a',
  letterColor: '#ff7a00', // Operators-ish orange
};

type State = {
  fields: Field[];
  globals: GlobalParams;
  selectedFieldId: string | null;
};

type Actions = {
  addField: () => void;
  removeField: (id: string) => void;
  updateField: (id: string, patch: Partial<Field>) => void;
  selectField: (id: string | null) => void;
  updateGlobals: (patch: Partial<GlobalParams>) => void;
  reset: () => void;
};

let nextId = 2;

function clampForceCenter(
  fx: number, fy: number, cx: number, cy: number, sx: number, sy: number,
): { fx: number; fy: number } {
  const nx = (fx - cx) / sx;
  const ny = (fy - cy) / sy;
  const r = Math.sqrt(nx * nx + ny * ny);
  if (r <= 0.98) return { fx, fy };
  const scale = 0.98 / r;
  return { fx: cx + nx * scale * sx, fy: cy + ny * scale * sy };
}

export const useStore = create<State & Actions>()(
  persist(
    (set) => ({
      fields: [initialField],
      globals: initialGlobals,
      selectedFieldId: 'f1',

      addField: () =>
        set((s) => {
          const id = `f${nextId++}`;
          const cx = CANVAS_W / 2 + (s.fields.length % 3 - 1) * 200;
          const cy = CANVAS_H / 2 + (Math.floor(s.fields.length / 3)) * 200;
          return {
            fields: [
              ...s.fields,
              { id, cx, cy, sx: 300, sy: 400, fx: cx, fy: cy, strength: 0.6 },
            ],
            selectedFieldId: id,
          };
        }),

      removeField: (id) =>
        set((s) => {
          const next = s.fields.filter((f) => f.id !== id);
          return {
            fields: next,
            selectedFieldId: s.selectedFieldId === id ? (next[0]?.id ?? null) : s.selectedFieldId,
          };
        }),

      updateField: (id, patch) =>
        set((s) => ({
          fields: s.fields.map((f) => {
            if (f.id !== id) return f;
            const next = { ...f, ...patch };
            const c = clampForceCenter(next.fx, next.fy, next.cx, next.cy, next.sx, next.sy);
            return { ...next, fx: c.fx, fy: c.fy };
          }),
        })),

      selectField: (id) => set({ selectedFieldId: id }),

      updateGlobals: (patch) =>
        set((s) => ({ globals: { ...s.globals, ...patch } })),

      reset: () =>
        set({
          fields: [initialField],
          globals: initialGlobals,
          selectedFieldId: 'f1',
        }),
    }),
    {
      name: 'field-dither-store-v1',
      version: 1,
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined;
        if (!p) return current;
        return {
          ...current,
          ...p,
          globals: { ...current.globals, ...(p.globals ?? {}) },
        };
      },
    },
  ),
);
