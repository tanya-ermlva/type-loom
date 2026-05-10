/**
 * Bloom-stack store — composition-level state only.
 *
 * The atom config (State A / State B, blend mode, bg) lives in the bloom
 * atom's store (`../bloom/store`) and is shared across both routes — tweaks
 * in /bloom show up immediately in /bloom-stack and vice-versa. This store
 * only owns the things that are specific to the composition: how the cursor
 * influences atoms.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EasingMode } from '../pulse/store';
import type { CompositionId } from '../bloom/compositions';

interface Store {
  /** Which named layout to render (single DFD, 3 stacked, etc.). */
  composition: CompositionId;
  /** Empty space between DFD content boxes, in viewBox units. Ignored by 'single'. */
  compositionGap: number;
  /** Cursor influence radius, in viewBox units of the active composition. */
  hoverRadius: number;
  /** How proximity (1 - dist/hoverRadius, clamped) maps to growth value g. */
  falloffEasing: EasingMode;

  setComposition: (v: CompositionId) => void;
  setCompositionGap: (v: number) => void;
  setHoverRadius: (v: number) => void;
  setFalloffEasing: (v: EasingMode) => void;
  reset: () => void;
}

const INITIAL = {
  composition: 'single' as CompositionId,
  compositionGap: 0,
  // 250 viewBox units ≈ ~2.5 grid cells (each cell is ~96 units), so the
  // cursor's reach covers a small cluster of neighboring dots, not the
  // whole letter. Tweak in the sidebar to tune.
  hoverRadius: 250,
  falloffEasing: 'easeOutQuad' as EasingMode,
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...INITIAL,
      setComposition: (v) => set({ composition: v }),
      setCompositionGap: (v) => set({ compositionGap: v }),
      setHoverRadius: (v) => set({ hoverRadius: v }),
      setFalloffEasing: (v) => set({ falloffEasing: v }),
      reset: () => set(INITIAL),
    }),
    {
      // v3 — added `compositionGap`. Bumping the storage key keeps
      // prototyping cheap; older shapes are harmless orphan entries.
      name: 'bloom-stack:state:v3',
      version: 1,
      partialize: (s) => ({
        composition: s.composition,
        compositionGap: s.compositionGap,
        hoverRadius: s.hoverRadius,
        falloffEasing: s.falloffEasing,
      }),
    },
  ),
);
