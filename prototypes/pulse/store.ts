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

export type AlignmentMode = 'left' | 'right' | 'centered' | 'justified';

export type EasingMode =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeOutCubic'
  | 'easeOutQuart'
  | 'easeOutBack';

export type DirectionMode = 'ping-pong' | 'one-way' | 'freeze-A' | 'freeze-B';

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
  edgePadding: number;
  // Animation
  loopDuration: number;
  easing: EasingMode;
  direction: DirectionMode;
  phaseOffset: number;
  perTokenStagger: number;
  perLineOffset: number;
  bgLag: number;
  // Random
  jitterX: number;
  jitterY: number;
  jitterSeed: number;
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
      { id: 't5', text: '—' },  // en-dash
      { id: 't6', text: '11' },
      { id: 't7', text: 'June' },
    ]},
  ],
  canvasWidth: 1920,
  canvasHeight: 263,
  bgColor: '#B0AA6D',
  blockColor: '#0D7EFF',
  textColor: '#0a0a0a',
  fontFamily: '"NHaas Grotesk Display Pro", sans-serif',
  fontSize: 134,
  letterSpacingPct: -1,
  lineHeight: 131.5,
  interLineGap: 0,
  tokenSpacingTight: 36,
  stateA: { alignments: ['centered', 'centered'] },
  stateB: { alignments: ['left', 'justified'] },
  edgePadding: 0,
  loopDuration: 2.0,
  easing: 'easeInOut',
  direction: 'ping-pong',
  phaseOffset: 0,
  perTokenStagger: 0,
  perLineOffset: 0,
  bgLag: 0,
  jitterX: 0,
  jitterY: 0,
  jitterSeed: 1,
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
const SCHEMA_VERSION = 1;

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
    },
  ),
);
