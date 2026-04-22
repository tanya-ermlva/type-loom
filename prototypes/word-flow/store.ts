import { create } from 'zustand';
import type { Composition, Flow, RowFlowParams } from './flow';

/**
 * Default composition: recreates the SHAPING / THE / FUTURE middle card
 * from the reference image. Three RowFlows stacked vertically, each with
 * its own rhythm.
 */
export const DEFAULT_COMPOSITION: Composition = {
  canvas: { width: 1000, height: 800 },
  bgColor: '#f5f1e8',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  loopDuration: 6,
  flows: [
    {
      id: 'shaping',
      kind: 'row',
      enabled: true,
      params: {
        word: 'SHAPING',
        rows: 8,
        // Outer rows are densely packed with SHAPINGs, middle rows are sparser.
        density: { mode: 'tight-edges', min: 2, max: 6 },
        xWave: { amplitude: 30, frequency: 0.6, phase: 0, phaseSpeed: 1 },
        rowSpacing: 32,
        yCenter: 170,
        fontSize: 26,
        color: '#0a0a0a',
        jitter: { position: 2, rotation: 0.015, opacity: 0.12 },
      },
    },
    {
      id: 'the',
      kind: 'row',
      enabled: true,
      params: {
        word: 'THE',
        rows: 10,
        // Middle rows are dense with THEs; edges are sparser.
        density: { mode: 'tight-middle', min: 5, max: 14 },
        xWave: { amplitude: 18, frequency: 0.8, phase: 0.25, phaseSpeed: 1 },
        rowSpacing: 26,
        yCenter: 400,
        fontSize: 24,
        color: '#0a0a0a',
        jitter: { position: 1.5, rotation: 0.012, opacity: 0.1 },
      },
    },
    {
      id: 'future',
      kind: 'row',
      enabled: true,
      params: {
        word: 'FUTURE',
        rows: 7,
        density: { mode: 'uniform', min: 5, max: 7 },
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

interface Store {
  composition: Composition;
  playing: boolean;
  selectedFlowId: string | null;
  setPlaying: (v: boolean) => void;
  selectFlow: (id: string | null) => void;
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
