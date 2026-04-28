import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AspectRatio,
  CursorState,
  EffectState,
  FontRef,
  Poster,
  TextAlign,
} from './types';

const SAMPLE_POSTER_TEXT =
  'DFD ✱ Digital Freedom Dialogue is a three-day festival on encryption, open networks, and the right to think out loud. Berlin, May 14–16.';

const initialPoster: Poster = {
  text: SAMPLE_POSTER_TEXT,
  font: { kind: 'system' },
  fontSize: 48,
  lineHeight: 1.05,
  textColor: '#f4f0a8',
  textAlign: 'left',
  fontWeight: 800,
  background: '#d94426',
  aspectRatio: '4:5',
  cursor: {
    size: 0.4,
    wobbleAmount: 1,
    trailSeconds: 0.5,
  },
  effect: {
    blur: 2.5,
    threshold: 30,
    offset: -12,
    noiseScale: 0.018,
    noiseAmount: 6,
  },
};

type Store = {
  poster: Poster;

  setText: (text: string) => void;

  setCursor: (patch: Partial<CursorState>) => void;
  setEffect: (patch: Partial<EffectState>) => void;

  setFontSize: (size: number) => void;
  setLineHeight: (lh: number) => void;
  setTextColor: (c: string) => void;
  setTextAlign: (a: TextAlign) => void;
  setFontWeight: (w: number) => void;
  setFont: (f: FontRef) => void;

  setBackground: (c: string) => void;
  setAspectRatio: (r: AspectRatio) => void;

  reset: () => void;
};

export const usePosterStore = create<Store>()(
  persist(
    (set) => ({
      poster: initialPoster,

      setText: (text) => set((s) => ({ poster: { ...s.poster, text } })),

      setCursor: (patch) =>
        set((s) => ({
          poster: { ...s.poster, cursor: { ...s.poster.cursor, ...patch } },
        })),
      setEffect: (patch) =>
        set((s) => ({
          poster: { ...s.poster, effect: { ...s.poster.effect, ...patch } },
        })),

      setFontSize: (size) => set((s) => ({ poster: { ...s.poster, fontSize: size } })),
      setLineHeight: (lh) => set((s) => ({ poster: { ...s.poster, lineHeight: lh } })),
      setTextColor: (c) => set((s) => ({ poster: { ...s.poster, textColor: c } })),
      setTextAlign: (a) => set((s) => ({ poster: { ...s.poster, textAlign: a } })),
      setFontWeight: (w) => set((s) => ({ poster: { ...s.poster, fontWeight: w } })),
      setFont: (f) => set((s) => ({ poster: { ...s.poster, font: f } })),

      setBackground: (c) => set((s) => ({ poster: { ...s.poster, background: c } })),
      setAspectRatio: (r) => set((s) => ({ poster: { ...s.poster, aspectRatio: r } })),

      reset: () => set({ poster: initialPoster }),
    }),
    {
      name: 'gooey-poster-store-v1',
      // Bumped to v3: schema collapsed to cursor-only mode (other mask
      // sources removed). The migrate callback below pulls the cursor
      // sub-state out of the v2 `sources` envelope and drops the rest.
      version: 3,
      partialize: (state) => ({
        poster: {
          ...state.poster,
          // Object URLs (uploaded font) don't survive reload — strip on persist.
          font: state.poster.font.kind === 'custom'
            ? ({ kind: 'system' } as FontRef)
            : state.poster.font,
        },
      }),
      migrate: (persisted: unknown, version: number) => {
        const p = (persisted as { poster?: Record<string, unknown> } | undefined)?.poster;
        if (!p) return persisted as { poster: Poster };
        if (version < 3) {
          const sources = p.sources as { cursor?: Partial<CursorState> } | undefined;
          const cursor = (p.cursor as Partial<CursorState> | undefined) ?? sources?.cursor;
          return {
            poster: {
              text: p.text,
              font: p.font,
              fontSize: p.fontSize,
              lineHeight: p.lineHeight,
              textColor: p.textColor,
              textAlign: p.textAlign,
              fontWeight: p.fontWeight,
              background: p.background,
              aspectRatio: p.aspectRatio,
              cursor,
              effect: p.effect,
            },
          } as { poster: Poster };
        }
        return persisted as { poster: Poster };
      },
      // Deep-merge so persisted state can fill in missing fields without
      // requiring a version bump for every new tweakable parameter.
      merge: (persisted, current) => {
        const p = (persisted as { poster?: Partial<Poster> } | undefined)?.poster;
        if (!p) return current;
        return {
          ...current,
          poster: {
            ...current.poster,
            ...p,
            cursor: { ...current.poster.cursor, ...(p.cursor ?? {}) },
            effect: { ...current.poster.effect, ...(p.effect ?? {}) },
          },
        };
      },
    },
  ),
);
