import { create } from 'zustand';
import type { Composition, Flow, RowFlowParams } from './flow';

/**
 * Default composition: three RowFlows stacked vertically (DIGITAL / FREEDOM /
 * DIALOGUE), each with its own rhythm and density envelope. Inspired by the
 * reference image's SHAPING / THE / FUTURE layered card composition, retuned
 * for the longer word lengths so they fit without overlap.
 */
export const DEFAULT_COMPOSITION: Composition = {
  canvas: { width: 1000, height: 800 },
  bgColor: '#f5f1e8',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  loopDuration: 6,
  flows: [
    {
      id: 'digital',
      kind: 'row',
      enabled: true,
      params: {
        word: 'DIGITAL',
        rows: 8,
        // Outer rows are densely packed, middle rows sparser.
        density: { mode: 'tight-edges', min: 2, max: 5 },
        xWave: { amplitude: 30, frequency: 0.6, phase: 0, phaseSpeed: 1 },
        rowSpacing: 32,
        yCenter: 170,
        fontSize: 26,
        color: '#0a0a0a',
        jitter: { position: 2, rotation: 0.015, opacity: 0.12 },
      },
    },
    {
      id: 'freedom',
      kind: 'row',
      enabled: true,
      params: {
        word: 'FREEDOM',
        rows: 10,
        // Middle rows densest. Max kept low because FREEDOM is wide.
        density: { mode: 'tight-middle', min: 3, max: 7 },
        xWave: { amplitude: 18, frequency: 0.8, phase: 0.25, phaseSpeed: 1 },
        rowSpacing: 28,
        yCenter: 400,
        fontSize: 24,
        color: '#0a0a0a',
        jitter: { position: 1.5, rotation: 0.012, opacity: 0.1 },
      },
    },
    {
      id: 'dialogue',
      kind: 'row',
      enabled: true,
      params: {
        word: 'DIALOGUE',
        rows: 7,
        density: { mode: 'uniform', min: 4, max: 6 },
        xWave: { amplitude: 22, frequency: 0.55, phase: 0.5, phaseSpeed: 1 },
        rowSpacing: 30,
        yCenter: 640,
        fontSize: 26,
        color: '#0a0a0a',
        jitter: { position: 2, rotation: 0.015, opacity: 0.12 },
      },
    },
  ],
};

type CompositionMeta = Pick<Composition, 'bgColor' | 'loopDuration' | 'fontFamily'>;

interface Store {
  composition: Composition;
  playing: boolean;
  selectedFlowId: string | null;
  setPlaying: (v: boolean) => void;
  selectFlow: (id: string | null) => void;
  updateCompositionMeta: (patch: Partial<CompositionMeta>) => void;
  updateFlowParams: (id: string, patch: Partial<RowFlowParams>) => void;
  toggleFlow: (id: string) => void;
  addFlow: () => void;
  removeFlow: (id: string) => void;
  resetComposition: () => void;
}

export const useStore = create<Store>((set) => ({
  composition: DEFAULT_COMPOSITION,
  playing: true,
  selectedFlowId: DEFAULT_COMPOSITION.flows[0].id,
  setPlaying: (v) => set({ playing: v }),
  selectFlow: (id) => set({ selectedFlowId: id }),
  updateCompositionMeta: (patch) =>
    set((s) => ({ composition: { ...s.composition, ...patch } })),
  updateFlowParams: (id, patch) =>
    set((s) => ({
      composition: {
        ...s.composition,
        flows: s.composition.flows.map((f) =>
          f.id === id ? { ...f, params: { ...f.params, ...patch } } : f,
        ),
      },
    })),
  toggleFlow: (id) =>
    set((s) => ({
      composition: {
        ...s.composition,
        flows: s.composition.flows.map((f) =>
          f.id === id ? { ...f, enabled: !f.enabled } : f,
        ),
      },
    })),
  addFlow: () =>
    set((s) => {
      const id = `flow-${Date.now()}`;
      const newFlow: Flow = {
        id,
        kind: 'row',
        enabled: true,
        params: {
          word: 'WORD',
          rows: 6,
          density: { mode: 'uniform', min: 4, max: 4 },
          xWave: { amplitude: 15, frequency: 0.5, phase: 0, phaseSpeed: 1 },
          rowSpacing: 30,
          yCenter: s.composition.canvas.height / 2,
          fontSize: 24,
          color: '#0a0a0a',
          jitter: { position: 1.5, rotation: 0.012, opacity: 0.1 },
        },
      };
      return {
        composition: { ...s.composition, flows: [...s.composition.flows, newFlow] },
        selectedFlowId: id,
      };
    }),
  removeFlow: (id) =>
    set((s) => ({
      composition: {
        ...s.composition,
        flows: s.composition.flows.filter((f) => f.id !== id),
      },
      selectedFlowId: s.selectedFlowId === id ? null : s.selectedFlowId,
    })),
  resetComposition: () =>
    set({
      composition: DEFAULT_COMPOSITION,
      selectedFlowId: DEFAULT_COMPOSITION.flows[0].id,
    }),
}));
