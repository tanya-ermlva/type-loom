import type {
  Cell,
  DitherAlgo,
  FalloffKind,
  Field,
  GlobalParams,
} from './types';

// ---------- Falloff curves (same family as compress) ----------

export function falloff(d: number, kind: FalloffKind): number {
  if (d <= 0) return 1;
  if (d >= 1) return 0;
  switch (kind) {
    case 'linear':       return 1 - d;
    case 'smoothstep': {
      const t = 1 - d;
      return t * t * (3 - 2 * t);
    }
    case 'smootherstep': {
      const t = 1 - d;
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    case 'gaussian': {
      const sigma = 0.4;
      return Math.exp(-(d * d) / (2 * sigma * sigma));
    }
    case 'constant':     return 1;
  }
}

// ---------- Field intensity at a point ----------
//
// Uses the same ray-casting approach as compress so the force center can
// sit anywhere inside the shape ellipse — d=0 at force center, d=1 at the
// shape boundary regardless of direction.

function intensityFromField(x: number, y: number, f: Field, kind: FalloffKind): number {
  if (f.sx <= 0 || f.sy <= 0) return 0;
  const A = (f.fx - f.cx) / f.sx;
  const B = (x - f.fx) / f.sx;
  const C = (f.fy - f.cy) / f.sy;
  const D = (y - f.fy) / f.sy;
  const aq = B * B + D * D;
  if (aq === 0) return f.strength;
  const bq = 2 * (A * B + C * D);
  const cq = A * A + C * C - 1;
  const disc = bq * bq - 4 * aq * cq;
  if (disc < 0) return 0;
  const sd = Math.sqrt(disc);
  const tExit = Math.max((-bq - sd) / (2 * aq), (-bq + sd) / (2 * aq));
  if (tExit <= 0) return 0;
  const d = 1 / tExit;
  if (d >= 1) return 0;
  return f.strength * falloff(d, kind);
}

/** Build the (rowCount × charCount) intensity grid. Each cell value is
 *  in [0, 1] after summing all fields against the base density and
 *  clamping. */
export function buildIntensityGrid(
  fields: Field[],
  params: GlobalParams,
  canvasW: number,
  canvasH: number,
): { grid: number[][]; positions: { x: number; y: number }[][] } {
  const { rowCount, charCount, columnSpacing, rowSpacing, letterSize } = params;
  const grid: number[][] = new Array(rowCount);
  const positions: { x: number; y: number }[][] = new Array(rowCount);

  // Centered grid layout.
  const totalW = (charCount - 1) * columnSpacing;
  const totalH = (rowCount - 1) * rowSpacing;
  const x0 = (canvasW - totalW) / 2;
  const y0 = (canvasH - totalH) / 2;

  for (let r = 0; r < rowCount; r++) {
    grid[r] = new Array(charCount);
    positions[r] = new Array(charCount);
    for (let c = 0; c < charCount; c++) {
      const x = x0 + c * columnSpacing;
      const y = y0 + r * rowSpacing;
      let v = params.baseDensity;
      for (const f of fields) v += intensityFromField(x, y, f, params.falloff);
      grid[r][c] = Math.max(0, Math.min(1, v));
      positions[r][c] = { x, y };
    }
    void letterSize; // reserved for future per-cell sizing
  }

  return { grid, positions };
}

// ---------- Dithering ----------
//
// Each algorithm consumes the intensity grid (mutates a working copy) and
// returns a boolean grid of the same shape: true = letter present at this
// cell.

function applyKernel(
  buf: number[][],
  r: number, c: number,
  err: number,
  kernel: { dr: number; dc: number; w: number }[],
): void {
  for (const { dr, dc, w } of kernel) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < buf.length && nc >= 0 && nc < buf[0].length) {
      buf[nr][nc] += err * w;
    }
  }
}

const FLOYD_STEINBERG = [
  { dr: 0, dc: +1, w: 7 / 16 },
  { dr: +1, dc: -1, w: 3 / 16 },
  { dr: +1, dc: 0, w: 5 / 16 },
  { dr: +1, dc: +1, w: 1 / 16 },
];

const ATKINSON = [
  { dr: 0, dc: +1, w: 1 / 8 },
  { dr: 0, dc: +2, w: 1 / 8 },
  { dr: +1, dc: -1, w: 1 / 8 },
  { dr: +1, dc: 0, w: 1 / 8 },
  { dr: +1, dc: +1, w: 1 / 8 },
  { dr: +2, dc: 0, w: 1 / 8 },
];

const SIERRA2 = [
  { dr: 0, dc: +1, w: 4 / 16 },
  { dr: 0, dc: +2, w: 3 / 16 },
  { dr: +1, dc: -2, w: 1 / 16 },
  { dr: +1, dc: -1, w: 2 / 16 },
  { dr: +1, dc: 0, w: 3 / 16 },
  { dr: +1, dc: +1, w: 2 / 16 },
  { dr: +1, dc: +2, w: 1 / 16 },
];

function ditherErrorDiffusion(
  intensity: number[][],
  threshold: number,
  kernel: typeof FLOYD_STEINBERG,
): boolean[][] {
  const rows = intensity.length;
  const cols = intensity[0].length;
  // Working buffer (we'll mutate it as error spreads).
  const buf = intensity.map((r) => [...r]);
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    out[r] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      const v = buf[r][c];
      const on = v > threshold;
      const quantized = on ? 1 : 0;
      const err = v - quantized;
      out[r][c] = on;
      applyKernel(buf, r, c, err, kernel);
    }
  }
  return out;
}

// Bayer threshold matrices, normalized to [0, 1].
function bayerMatrix(n: 4 | 8): number[][] {
  // Recursive construction: M_{2n}(i,j) = 4·M_n(i mod n, j mod n) +
  // M_2(floor(i / n), floor(j / n)). Base M_2 = [[0, 2], [3, 1]].
  function build(size: number): number[][] {
    if (size === 2) return [[0, 2], [3, 1]];
    const half = size / 2;
    const sub = build(half);
    const full: number[][] = Array.from({ length: size }, () => new Array(size));
    const corner = [[0, 2], [3, 1]];
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        full[i][j] = 4 * sub[i % half][j % half] + corner[Math.floor(i / half)][Math.floor(j / half)];
      }
    }
    return full;
  }
  const raw = build(n);
  const max = n * n;
  return raw.map((row) => row.map((v) => (v + 0.5) / max));
}

function ditherBayer(
  intensity: number[][],
  matrix: number[][],
): boolean[][] {
  const rows = intensity.length;
  const cols = intensity[0].length;
  const ms = matrix.length;
  const out: boolean[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    out[r] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      const t = matrix[r % ms][c % ms];
      out[r][c] = intensity[r][c] > t;
    }
  }
  return out;
}

function ditherThreshold(intensity: number[][], threshold: number): boolean[][] {
  return intensity.map((row) => row.map((v) => v > threshold));
}

const BAYER_4 = bayerMatrix(4);
const BAYER_8 = bayerMatrix(8);

export function applyDither(
  intensity: number[][],
  algo: DitherAlgo,
  threshold: number,
): boolean[][] {
  switch (algo) {
    case 'floyd-steinberg': return ditherErrorDiffusion(intensity, threshold, FLOYD_STEINBERG);
    case 'atkinson':        return ditherErrorDiffusion(intensity, threshold, ATKINSON);
    case 'sierra-2':        return ditherErrorDiffusion(intensity, threshold, SIERRA2);
    case 'bayer-4':         return ditherBayer(intensity, BAYER_4);
    case 'bayer-8':         return ditherBayer(intensity, BAYER_8);
    case 'threshold':       return ditherThreshold(intensity, threshold);
  }
}

// ---------- Word tokenization (skip whitespace) ----------

function lettersOnly(word: string): string {
  return word.replace(/\s+/g, '') || ' ';
}

// ---------- Top-level: build cell grid ----------

export function buildCells(
  fields: Field[],
  params: GlobalParams,
  canvasW: number,
  canvasH: number,
): Cell[] {
  const { grid, positions } = buildIntensityGrid(fields, params, canvasW, canvasH);
  const dithered = applyDither(grid, params.ditherAlgo, params.threshold);
  const letters = lettersOnly(params.word);
  const cells: Cell[] = [];
  let charIdx = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const on = dithered[r][c];
      // Only consume a character if this cell actually shows one — that
      // way the readable text reflows continuously through the visible
      // dots, no wasted "phantom positions" eaten by dropped cells.
      const char = on ? letters[charIdx++ % letters.length] : '';
      cells.push({
        r, c,
        x: positions[r][c].x,
        y: positions[r][c].y,
        char,
        on,
        intensity: grid[r][c],
      });
    }
  }
  return cells;
}
