import { create } from 'zustand';
import type {
  Composition,
  Flow,
  FlowKind,
  RowFlowParams,
  CircleFlowParams,
} from './flow';

/**
 * Default composition: three RowFlows stacked vertically (D / F / D) forming
 * one continuous tapestry. All flows share rows and rowSpacing from the
 * composition, and the inter-flow gap equals rowSpacing — so the whole stack
 * reads as one grid divided by which letter and density each segment uses.
 */
export const DEFAULT_COMPOSITION: Composition = {
  canvas: { width: 1000, height: 800 },
  bgColor: '#f5f1e8',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  // One font size for the whole composition — every word in every flow renders at this size.
  fontSize: 25,
  // Clear pixels around all four edges. No word ever extends past this.
  edgePadding: 25,
  // Rows per flow — same for every flow.
  rows: 10,
  // Vertical spacing — same between rows AND between flow segments.
  rowSpacing: 24,
  loopDuration: 6,
  flows: [
    {
      id: 'd-top',
      kind: 'row',
      enabled: true,
      params: {
        word: 'D',
        // Outer rows densely packed, middle rows sparser.
        density: { mode: 'tight-edges', min: 12, max: 28 },
        xWave: { amplitude: 30, frequency: 0.6, phase: 0, phaseSpeed: 1, envelope: 'center-peak' },
        densityPulse: { amplitude: 0, phaseSpeed: 1 },
        color: '#0a0a0a',
        jitter: { position: 2, rotation: 0.015, opacity: 0.12 },
      },
    },
    {
      id: 'f-mid',
      kind: 'row',
      enabled: true,
      params: {
        word: 'F',
        // Middle rows densest.
        density: { mode: 'tight-middle', min: 12, max: 36 },
        xWave: { amplitude: 18, frequency: 0.8, phase: 0.25, phaseSpeed: 1, envelope: 'center-peak' },
        densityPulse: { amplitude: 0, phaseSpeed: 1 },
        color: '#0a0a0a',
        jitter: { position: 1.5, rotation: 0.012, opacity: 0.1 },
      },
    },
    {
      id: 'd-bottom',
      kind: 'row',
      enabled: true,
      params: {
        word: 'D',
        density: { mode: 'uniform', min: 18, max: 22 },
        xWave: { amplitude: 22, frequency: 0.55, phase: 0.5, phaseSpeed: 1, envelope: 'center-peak' },
        densityPulse: { amplitude: 0, phaseSpeed: 1 },
        color: '#0a0a0a',
        jitter: { position: 2, rotation: 0.015, opacity: 0.12 },
      },
    },
  ],
};

type CompositionMeta = Pick<
  Composition,
  'bgColor' | 'loopDuration' | 'fontFamily' | 'edgePadding' | 'rows' | 'rowSpacing'
>;

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
                word: 'X',
                density: { mode: 'uniform', min: 10, max: 15 },
                xWave: { amplitude: 15, frequency: 0.5, phase: 0, phaseSpeed: 1, envelope: 'center-peak' },
                densityPulse: { amplitude: 0, phaseSpeed: 1 },
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
