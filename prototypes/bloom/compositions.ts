/**
 * Compositions — named layouts of the DFD logo for the bloom-stack canvas.
 *
 * Each composition is computed from a shared `gap` value (in viewBox units).
 * Gap semantics: empty space BETWEEN DFD content boxes — `gap = 0` makes
 * adjacent DFDs touch; `gap > 0` separates them. The SVG viewBox grows with
 * the gap so atoms stay at their original (cx, cy) within their copy.
 *
 * Cursor proximity (hoverRadius) is also in viewBox units, so for large gaps
 * + many DFDs the cursor's reach feels relatively smaller — that's expected
 * (each cluster blooms independently). The hover-radius slider can compensate.
 */
import { DFD_POSITIONS, DFD_VIEWBOX, type DotPosition } from './positions';

export type CompositionId = 'single' | 'triple-stack' | 'grid-3x5';

/** DFD content bounding box (computed from positions.ts). Used to tile DFDs
 *  end-to-end when gap = 0; `gap` adds space beyond this. */
const CONTENT = {
  minX: 149.211,
  minY: 297.316,
  width: 1583.2,   // maxX - minX
  height: 480.16,  // maxY - minY
};

const W = DFD_VIEWBOX.width;   // 1920
const H = DFD_VIEWBOX.height;  // 1080
const PAD_RIGHT  = W - (CONTENT.minX + CONTENT.width);  // 187.6 — natural right padding around DFD
const PAD_BOTTOM = H - (CONTENT.minY + CONTENT.height); // 302.5 — natural bottom padding

export interface Composition {
  id: CompositionId;
  label: string;
  /** Recommended hoverRadius for this layout (viewBox units). */
  defaultHoverRadius: number;
  /** Recommended gap to seed when the user switches into this layout. */
  defaultGap: number;
  /** False for layouts that ignore gap (single DFD has nothing to space against). */
  usesGap: boolean;
  viewBox: { width: number; height: number };
  positions: DotPosition[];
}

interface CompositionMeta {
  label: string;
  defaultHoverRadius: number;
  defaultGap: number;
  usesGap: boolean;
}

const META: Record<CompositionId, CompositionMeta> = {
  'single':       { label: 'Single DFD',     defaultHoverRadius: 250, defaultGap: 0,   usesGap: false },
  'triple-stack': { label: '3 DFDs stacked', defaultHoverRadius: 250, defaultGap: 200, usesGap: true  },
  'grid-3x5':     { label: 'Grid · 3×5 DFDs', defaultHoverRadius: 200, defaultGap: 150, usesGap: true  },
};

/** Stable list for the sidebar dropdown — order matters for UI. */
export const COMPOSITION_IDS: CompositionId[] = ['single', 'triple-stack', 'grid-3x5'];

export function getComposition(id: CompositionId, gap: number): Composition {
  const meta = META[id];
  const base = { id, ...meta };
  const g = Math.max(0, gap);

  if (id === 'single') {
    return {
      ...base,
      viewBox: { width: W, height: H },
      positions: DFD_POSITIONS as DotPosition[],
    };
  }

  if (id === 'triple-stack') {
    // 3 DFDs vertically, each separated by `g` extra viewBox units.
    const strideY = CONTENT.height + g;
    const positions = [0, 1, 2].flatMap((row) =>
      DFD_POSITIONS.map((p) => ({ ...p, cy: p.cy + row * strideY })),
    );
    // viewBox: original DFD top padding + 3 content heights + 2 gaps + bottom padding.
    const vbHeight = CONTENT.minY + 3 * CONTENT.height + 2 * g + PAD_BOTTOM;
    return {
      ...base,
      viewBox: { width: W, height: vbHeight },
      positions,
    };
  }

  // grid-3x5
  const strideX = CONTENT.width + g;
  const strideY = CONTENT.height + g;
  const COLS = 3;
  const ROWS = 5;
  const positions = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) =>
      DFD_POSITIONS.map((p) => ({
        ...p,
        cx: p.cx + col * strideX,
        cy: p.cy + row * strideY,
      })),
    ).flat(),
  ).flat();
  const vbWidth  = CONTENT.minX + COLS * CONTENT.width  + (COLS - 1) * g + PAD_RIGHT;
  const vbHeight = CONTENT.minY + ROWS * CONTENT.height + (ROWS - 1) * g + PAD_BOTTOM;
  return {
    ...base,
    viewBox: { width: vbWidth, height: vbHeight },
    positions,
  };
}

/** Convenience accessor for the static metadata (used by the sidebar to
 *  populate the dropdown without computing positions just to read a label). */
export function getCompositionMeta(id: CompositionId): CompositionMeta {
  return META[id];
}
