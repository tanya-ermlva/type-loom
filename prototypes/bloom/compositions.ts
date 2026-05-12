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
import { DFD_POSITIONS, DFD_VIEWBOX, type DotPosition, type Letter } from './positions';

export type CompositionId =
  | 'single'
  | 'triple-stack'
  | 'grid-3x5'
  | 'random-scatter'
  | 'jittered-grid'
  // Geometric shapes — recognisable, primarily outlines / polygons.
  | 'circle'
  | 'heart'
  | 'cross-x'
  | 'arrow'
  | 'diamond'
  | 'star'
  // Mathematical curves — abstract patterns from parametric equations.
  | 'wave'
  | 'spiral'
  | 'concentric-rings'
  | 'lissajous'
  | 'rose'
  | 'phyllotaxis';

/** Composition groups for the sidebar dropdown — order matters for UI. */
export const COMPOSITION_GROUPS: { label: string; ids: CompositionId[] }[] = [
  { label: 'DFD',    ids: ['single', 'triple-stack', 'grid-3x5'] },
  { label: 'Random', ids: ['random-scatter', 'jittered-grid'] },
  { label: 'Shapes', ids: ['circle', 'heart', 'cross-x', 'arrow', 'diamond', 'star'] },
  { label: 'Curves', ids: ['wave', 'spiral', 'concentric-rings', 'lissajous', 'rose', 'phyllotaxis'] },
];

// ---------- Deterministic PRNG (mulberry32) ----------
// Same seed → same sequence, so a composition can be regenerated identically
// from its stored seed. Increment the seed for a fresh layout.
function makeRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random scatter — N atoms at uniformly-random positions inside the canvas
 *  (with a small padding so atoms never sit flush against the edges). */
function randomScatter(seed: number, count: number, vbW: number, vbH: number): DotPosition[] {
  const pad = Math.min(vbW, vbH) * 0.06;
  const rng = makeRng(seed);
  const positions: DotPosition[] = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      cx: pad + rng() * (vbW - 2 * pad),
      cy: pad + rng() * (vbH - 2 * pad),
      r: 36,
      letter: 'D1' as Letter,
    });
  }
  return positions;
}

/** Jittered grid — a regular cols×rows lattice with each cell's atom nudged
 *  by up to ±40% of the cell size. Reads as "structured but organic". */
function jitteredGrid(seed: number, count: number, vbW: number, vbH: number): DotPosition[] {
  const aspect = vbW / vbH;
  const rows = Math.max(2, Math.round(Math.sqrt(count / aspect)));
  const cols = Math.max(2, Math.round(count / rows));
  const stepX = vbW / cols;
  const stepY = vbH / rows;
  const jitter = 0.4; // ±40% of cell size
  const rng = makeRng(seed);
  const positions: DotPosition[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        cx: stepX * (col + 0.5) + (rng() - 0.5) * stepX * jitter,
        cy: stepY * (row + 0.5) + (rng() - 0.5) * stepY * jitter,
        r: 36,
        letter: 'D1' as Letter,
      });
    }
  }
  return positions;
}

// ---------- Shape compositions ----------
// All shape generators take (count, vbW, vbH) and return atom positions
// distributed along/inside the shape. They centre on the canvas and scale
// to fit. No seed needed — shapes are deterministic from count alone.

const dot = (cx: number, cy: number): DotPosition => ({
  cx, cy, r: 36, letter: 'D1' as Letter,
});

/** Circle — atoms evenly spaced around a ring centred on the canvas. */
function circleRing(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const radius = Math.min(vbW, vbH) * 0.4;
  return Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2 - Math.PI / 2; // start at top
    return dot(cx + Math.cos(t) * radius, cy + Math.sin(t) * radius);
  });
}

/** Heart — atoms along the classic parametric heart curve. */
function heart(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  // The curve's natural extent fits in ~[-16, 16] × [-17, 5], so we scale
  // by ~vbH/40 to fill most of the canvas vertically and offset to centre.
  const scale = Math.min(vbW, vbH) / 38;
  return Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return dot(cx + x * scale, cy + y * scale);
  });
}

/** X (cross) — two diagonals through the canvas centre, half atoms each. */
function crossX(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const len = Math.min(vbW, vbH) * 0.4;
  const half = Math.floor(count / 2);
  const positions: DotPosition[] = [];
  for (let i = 0; i < half; i++) {
    const t = (i / Math.max(1, half - 1)) * 2 - 1; // -1..1
    positions.push(dot(cx + t * len, cy + t * len));
  }
  for (let i = 0; i < count - half; i++) {
    const t = (i / Math.max(1, count - half - 1)) * 2 - 1;
    positions.push(dot(cx + t * len, cy - t * len));
  }
  return positions;
}

/** Arrow — horizontal shaft pointing right with a chevron head. */
function arrow(count: number, vbW: number, vbH: number): DotPosition[] {
  const cy = vbH / 2;
  const startX = vbW * 0.15;
  const tipX = vbW * 0.85;
  const headLen = vbW * 0.12;
  const headHt = vbH * 0.18;
  const bodyCount = Math.max(2, Math.round(count * 0.6));
  const armCount = Math.max(1, Math.floor((count - bodyCount) / 2));
  const positions: DotPosition[] = [];
  // Shaft.
  for (let i = 0; i < bodyCount; i++) {
    positions.push(dot(startX + (tipX - startX) * (i / Math.max(1, bodyCount - 1)), cy));
  }
  // Upper chevron arm (from tip back-and-up).
  for (let i = 0; i < armCount; i++) {
    const t = (i + 1) / armCount;
    positions.push(dot(tipX - t * headLen, cy - t * headHt));
  }
  // Lower chevron arm.
  for (let i = 0; i < armCount; i++) {
    const t = (i + 1) / armCount;
    positions.push(dot(tipX - t * headLen, cy + t * headHt));
  }
  return positions;
}

/** Spiral — archimedean spiral expanding outward over ~3 turns. */
function spiral(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const maxRadius = Math.min(vbW, vbH) * 0.45;
  const turns = 3;
  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1); // 0..1
    const angle = t * Math.PI * 2 * turns;
    const radius = t * maxRadius;
    return dot(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  });
}

/** Phyllotaxis — golden-angle spiral that fills a disc like a sunflower. */
function phyllotaxis(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  // sqrt(count) packs atoms tightly without overlap; scale so the outer
  // atoms reach ~45% of the smaller canvas dimension.
  const scale = (Math.min(vbW, vbH) * 0.45) / Math.sqrt(Math.max(1, count));
  return Array.from({ length: count }, (_, i) => {
    const angle = i * goldenAngle;
    const radius = scale * Math.sqrt(i);
    return dot(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  });
}

/** Diamond — atoms along the perimeter of a diamond (rotated square). */
function diamond(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const r = Math.min(vbW, vbH) * 0.4;
  const vertices: Array<[number, number]> = [
    [cx, cy - r],  // top
    [cx + r, cy],  // right
    [cx, cy + r],  // bottom
    [cx - r, cy],  // left
  ];
  return polygonOutline(vertices, count);
}

/** Star — 5-pointed star, atoms along the outline through 10 vertices. */
function star(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const outerR = Math.min(vbW, vbH) * 0.4;
  const innerR = outerR * 0.5;
  const points = 5;
  const vertices: Array<[number, number]> = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : innerR;
    vertices.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return polygonOutline(vertices, count);
}

/** Distribute `count` atoms along the closed polygon defined by `vertices`. */
function polygonOutline(
  vertices: Array<[number, number]>,
  count: number,
): DotPosition[] {
  const n = vertices.length;
  const perEdge = Math.max(1, Math.floor(count / n));
  const positions: DotPosition[] = [];
  for (let i = 0; i < n; i++) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + 1) % n];
    for (let j = 0; j < perEdge; j++) {
      const t = j / perEdge;
      positions.push(dot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t));
    }
  }
  return positions;
}

/** Sine wave — horizontal traversal with sin amplitude, ~2 cycles. */
function wave(count: number, vbW: number, vbH: number): DotPosition[] {
  const margin = vbW * 0.08;
  const usableW = vbW - 2 * margin;
  const cy = vbH / 2;
  const amplitude = vbH * 0.28;
  const cycles = 2;
  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1);
    return dot(margin + t * usableW, cy + Math.sin(t * Math.PI * 2 * cycles) * amplitude);
  });
}

/** Concentric rings — 4 nested rings, atoms allocated proportionally to ring
 *  circumference so spacing along the rings stays roughly uniform. */
function concentricRings(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const maxR = Math.min(vbW, vbH) * 0.45;
  const rings = 4;
  const radii = Array.from({ length: rings }, (_, i) => maxR * (i + 1) / rings);
  const totalC = radii.reduce((sum, r) => sum + 2 * Math.PI * r, 0);
  const positions: DotPosition[] = [];
  for (const r of radii) {
    const ringCount = Math.max(4, Math.round(count * (2 * Math.PI * r) / totalC));
    for (let j = 0; j < ringCount; j++) {
      const t = (j / ringCount) * Math.PI * 2 - Math.PI / 2;
      positions.push(dot(cx + Math.cos(t) * r, cy + Math.sin(t) * r));
    }
  }
  return positions;
}

/** Lissajous — closed curve from `(A sin(at + δ), B sin(bt))`. Default 3:2
 *  ratio with quarter-cycle phase gives a recognisable, fillable knot. */
function lissajous(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const A = vbW * 0.4, B = vbH * 0.4;
  const a = 3, b = 2;
  const delta = Math.PI / 2;
  return Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2;
    return dot(cx + A * Math.sin(a * t + delta), cy + B * Math.sin(b * t));
  });
}

/** Rose curve — `r = A cos(kθ)`. Petal count: k if k is odd, 2k if k is even.
 *  Default k=5 → five-petaled rose. */
function rose(count: number, vbW: number, vbH: number): DotPosition[] {
  const cx = vbW / 2, cy = vbH / 2;
  const A = Math.min(vbW, vbH) * 0.45;
  const k = 5;
  // For odd k the curve completes in [0, π]; for even k it needs [0, 2π].
  const totalAngle = k % 2 === 0 ? Math.PI * 2 : Math.PI;
  return Array.from({ length: count }, (_, i) => {
    const theta = (i / count) * totalAngle;
    const r = A * Math.cos(k * theta);
    return dot(cx + r * Math.cos(theta), cy + r * Math.sin(theta));
  });
}

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
  /** Recommended cursor reach for this layout (viewBox units). Used to
   *  seed both reachX and reachY when switching into this composition. */
  defaultReach: number;
  /** Recommended gap to seed when the user switches into this layout. */
  defaultGap: number;
  /** Recommended atom count for generative layouts (random / jittered). */
  defaultCount: number;
  /** False for layouts that ignore gap (single DFD has nothing to space against). */
  usesGap: boolean;
  /** True for layouts whose positions depend on a regenerable seed. */
  usesSeed: boolean;
  /** True for layouts where the user can dial atom count. */
  usesCount: boolean;
  viewBox: { width: number; height: number };
  positions: DotPosition[];
}

interface CompositionMeta {
  label: string;
  defaultReach: number;
  defaultGap: number;
  defaultCount: number;
  usesGap: boolean;
  usesSeed: boolean;
  usesCount: boolean;
}

const META: Record<CompositionId, CompositionMeta> = {
  'single':         { label: 'Single DFD',       defaultReach: 250, defaultGap: 0,   defaultCount: 0,   usesGap: false, usesSeed: false, usesCount: false },
  'triple-stack':   { label: '3 DFDs stacked',   defaultReach: 250, defaultGap: 200, defaultCount: 0,   usesGap: true,  usesSeed: false, usesCount: false },
  'grid-3x5':       { label: 'Grid · 3×5 DFDs',  defaultReach: 200, defaultGap: 150, defaultCount: 0,   usesGap: true,  usesSeed: false, usesCount: false },
  'random-scatter': { label: 'Random scatter',   defaultReach: 300, defaultGap: 0,   defaultCount: 80,  usesGap: false, usesSeed: true,  usesCount: true  },
  'jittered-grid':  { label: 'Jittered grid',    defaultReach: 300, defaultGap: 0,   defaultCount: 120, usesGap: false, usesSeed: true,  usesCount: true  },
  'circle':           { label: 'Circle',                  defaultReach: 250, defaultGap: 0, defaultCount: 36,  usesGap: false, usesSeed: false, usesCount: true },
  'heart':            { label: 'Heart',                   defaultReach: 250, defaultGap: 0, defaultCount: 64,  usesGap: false, usesSeed: false, usesCount: true },
  'cross-x':          { label: 'X · cross',               defaultReach: 250, defaultGap: 0, defaultCount: 28,  usesGap: false, usesSeed: false, usesCount: true },
  'arrow':            { label: 'Arrow',                   defaultReach: 250, defaultGap: 0, defaultCount: 40,  usesGap: false, usesSeed: false, usesCount: true },
  'diamond':          { label: 'Diamond',                 defaultReach: 250, defaultGap: 0, defaultCount: 32,  usesGap: false, usesSeed: false, usesCount: true },
  'star':             { label: 'Star · 5-point',          defaultReach: 250, defaultGap: 0, defaultCount: 40,  usesGap: false, usesSeed: false, usesCount: true },
  'wave':             { label: 'Sine wave',               defaultReach: 250, defaultGap: 0, defaultCount: 60,  usesGap: false, usesSeed: false, usesCount: true },
  'spiral':           { label: 'Spiral',                  defaultReach: 250, defaultGap: 0, defaultCount: 96,  usesGap: false, usesSeed: false, usesCount: true },
  'concentric-rings': { label: 'Concentric rings',        defaultReach: 250, defaultGap: 0, defaultCount: 80,  usesGap: false, usesSeed: false, usesCount: true },
  'lissajous':        { label: 'Lissajous · 3:2',         defaultReach: 250, defaultGap: 0, defaultCount: 200, usesGap: false, usesSeed: false, usesCount: true },
  'rose':             { label: 'Rose · 5 petals',         defaultReach: 250, defaultGap: 0, defaultCount: 200, usesGap: false, usesSeed: false, usesCount: true },
  'phyllotaxis':      { label: 'Phyllotaxis · sunflower', defaultReach: 200, defaultGap: 0, defaultCount: 150, usesGap: false, usesSeed: false, usesCount: true },
};

/** Stable list for the sidebar dropdown — order matters for UI. */
export const COMPOSITION_IDS: CompositionId[] = [
  'single', 'triple-stack', 'grid-3x5',
  'random-scatter', 'jittered-grid',
];

export function getComposition(
  id: CompositionId,
  gap: number,
  seed = 1,
  count = 80,
): Composition {
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

  if (id === 'random-scatter') {
    return {
      ...base,
      viewBox: { width: W, height: H },
      positions: randomScatter(seed, Math.max(1, Math.round(count)), W, H),
    };
  }

  if (id === 'jittered-grid') {
    return {
      ...base,
      viewBox: { width: W, height: H },
      positions: jitteredGrid(seed, Math.max(1, Math.round(count)), W, H),
    };
  }

  // Shape compositions — all share the same (count, W, H) signature.
  const n = Math.max(2, Math.round(count));
  const shapeBase = { ...base, viewBox: { width: W, height: H } };
  if (id === 'circle')           return { ...shapeBase, positions: circleRing(n, W, H) };
  if (id === 'heart')            return { ...shapeBase, positions: heart(n, W, H) };
  if (id === 'cross-x')          return { ...shapeBase, positions: crossX(n, W, H) };
  if (id === 'arrow')            return { ...shapeBase, positions: arrow(n, W, H) };
  if (id === 'diamond')          return { ...shapeBase, positions: diamond(n, W, H) };
  if (id === 'star')             return { ...shapeBase, positions: star(n, W, H) };
  if (id === 'wave')             return { ...shapeBase, positions: wave(n, W, H) };
  if (id === 'spiral')           return { ...shapeBase, positions: spiral(n, W, H) };
  if (id === 'concentric-rings') return { ...shapeBase, positions: concentricRings(n, W, H) };
  if (id === 'lissajous')        return { ...shapeBase, positions: lissajous(n, W, H) };
  if (id === 'rose')             return { ...shapeBase, positions: rose(n, W, H) };
  if (id === 'phyllotaxis')      return { ...shapeBase, positions: phyllotaxis(n, W, H) };

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
