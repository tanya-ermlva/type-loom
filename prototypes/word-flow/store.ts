import { create } from 'zustand';
import type {
  Composition,
  Flow,
  FlowKind,
  RowFlowParams,
  CircleFlowParams,
} from './flow';

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
  // One font size for the whole composition — every word in every flow renders at this size.
  fontSize: 25,
  // Clear pixels around all four edges. No word ever extends past this.
  edgePadding: 60,
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
        xWave: { amplitude: 30, frequency: 0.6, phase: 0, phaseSpeed: 1, envelope: 'center-peak' },
        densityPulse: { amplitude: 0, phaseSpeed: 1 },
        rowSpacing: 32,
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
        xWave: { amplitude: 18, frequency: 0.8, phase: 0.25, phaseSpeed: 1, envelope: 'center-peak' },
        densityPulse: { amplitude: 0, phaseSpeed: 1 },
        rowSpacing: 28,
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
        xWave: { amplitude: 22, frequency: 0.55, phase: 0.5, phaseSpeed: 1, envelope: 'center-peak' },
        densityPulse: { amplitude: 0, phaseSpeed: 1 },
        rowSpacing: 30,
        color: '#0a0a0a',
        jitter: { position: 2, rotation: 0.015, opacity: 0.12 },
      },
    },
  ],
};

type CompositionMeta = Pick<Composition, 'bgColor' | 'loopDuration' | 'fontFamily' | 'edgePadding'>;

interface Store {
  composition: Composition;
  playing: boolean;
  selectedFlowId: string | null;
  setPlaying: (v: boolean) => void;
  selectFlow: (id: string | null) => void;
  updateCompositionMeta: (patch: Partial<CompositionMeta>) => void;
  /** Patch params on whichever kind the flow is. Caller passes shape matching that kind. */
  updateFlowParams: (
    id: string,
    patch: Partial<RowFlowParams> | Partial<CircleFlowParams>,
  ) => void;
  toggleFlow: (id: string) => void;
  addFlow: (kind: FlowKind) => void;
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
        flows: s.composition.flows.map((f) => {
          if (f.id !== id) return f;
          // Merge by kind so the discriminated union stays consistent.
          if (f.kind === 'row') {
            return { ...f, params: { ...f.params, ...(patch as Partial<RowFlowParams>) } };
          }
          return { ...f, params: { ...f.params, ...(patch as Partial<CircleFlowParams>) } };
        }),
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
  addFlow: (kind) =>
    set((s) => {
      const id = `flow-${Date.now()}`;
      const newFlow: Flow =
        kind === 'row'
          ? {
              id,
              kind: 'row',
              enabled: true,
              params: {
                word: 'WORD',
                rows: 6,
                density: { mode: 'uniform', min: 4, max: 4 },
                xWave: { amplitude: 15, frequency: 0.5, phase: 0, phaseSpeed: 1, envelope: 'center-peak' },
                densityPulse: { amplitude: 0, phaseSpeed: 1 },
                rowSpacing: 30,
                color: '#0a0a0a',
                jitter: { position: 1.5, rotation: 0.012, opacity: 0.1 },
              },
            }
          : {
              id,
              kind: 'circle',
              enabled: true,
              params: {
                word: 'CIRCLE',
                center: { x: s.composition.canvas.width / 2, y: s.composition.canvas.height / 2 },
                rings: 4,
                innerRadius: 80,
                outerRadius: 320,
                wordsPerRing: 8,
                alignment: 'tangent',
                rotation: { phase: 0, phaseSpeed: 1 },
                color: '#0a0a0a',
                jitter: { position: 1.5, rotation: 0.01, opacity: 0.1 },
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
