/**
 * Word-flow prototype.
 *
 * Fundamentally different mental model from Type Loom:
 *   - Atomic unit is a WORD INSTANCE, not a character cell.
 *   - A Composition is an ordered list of Flows.
 *   - A Flow is a pure function `(t, ctx) => WordInstance[]`.
 *   - Rendering just walks all instances and draws them.
 *
 * No per-character pipeline. No mutable cells. Word-internal letter spacing
 * is the font's own typography and is never touched.
 */

export type WordInstance = {
  word: string;
  x: number;          // anchor (center) in canvas px
  y: number;
  rotation: number;   // radians
  opacity: number;    // 0..1
  color: string;
  fontSize: number;   // px
};

/** Density envelope shape: how word-count varies across rows. */
export type DensityMode =
  | 'uniform'
  | 'tight-middle'   // V-shape: peak in middle, sparse at edges
  | 'tight-edges'    // Λ-shape: sparse middle, dense edges
  | 'linear-down'    // ramps from max (top) to min (bottom)
  | 'linear-up'      // ramps from min (top) to max (bottom)
  | 'sine'           // smoothly oscillates across rows (2 full cycles)
  | 'random';        // deterministic per-row noise between min and max

export interface RowFlowParams {
  word: string;
  rows: number;
  /** Words per row — count is interpolated between min and max per the envelope. */
  density: {
    mode: DensityMode;
    min: number;
    max: number;
  };
  /** Horizontal sine offset applied per row — the braided wave. */
  xWave: {
    amplitude: number;   // px
    frequency: number;   // cycles per row
    phase: number;       // 0..1 turns (static offset)
    phaseSpeed: number;  // turns per loop; INTEGER values keep the loop seamless
  };
  rowSpacing: number;    // px between adjacent rows
  yCenter: number;       // canvas y the block is centered on
  fontSize: number;
  color: string;
  /** Deterministic per-instance noise — gives the printed-paper feel. */
  jitter: {
    position: number;    // px, ± each axis
    rotation: number;    // radians, ±
    opacity: number;     // 0..this subtracted from 1
  };
}

export interface Flow {
  id: string;
  kind: 'row';
  enabled: boolean;
  params: RowFlowParams;
}

export interface Composition {
  canvas: { width: number; height: number };
  bgColor: string;
  fontFamily: string;
  loopDuration: number;
  flows: Flow[];
}

/**
 * Deterministic 0..1 hash from an integer seed. We want per-instance noise
 * that's stable across frames — true Math.random() would re-roll every
 * render and the jitter would dissolve into flicker. This is the classic
 * `sin * large-number` trick; cheap and good-enough for visual jitter.
 */
function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function countForRow(row: number, total: number, params: RowFlowParams): number {
  if (total <= 1) return Math.round((params.density.min + params.density.max) / 2);
  const rowFraction = row / (total - 1);                // 0..1
  const distFromCenter = Math.abs(rowFraction - 0.5) * 2; // 0 mid, 1 edges
  const { min, max, mode } = params.density;
  const span = max - min;
  switch (mode) {
    case 'uniform':
      return Math.round((min + max) / 2);
    case 'tight-middle':
      // middle = max (dense), edges = min (sparse)
      return Math.round(max - span * distFromCenter);
    case 'tight-edges':
      // middle = min (sparse), edges = max (dense)
      return Math.round(min + span * distFromCenter);
    case 'linear-down':
      // top = max, bottom = min (decrescendo)
      return Math.round(max - span * rowFraction);
    case 'linear-up':
      // top = min, bottom = max (crescendo)
      return Math.round(min + span * rowFraction);
    case 'sine': {
      // Two full cycles across rows. wave ∈ [-1, 1]; map to [min, max].
      const wave = Math.sin(rowFraction * Math.PI * 4); // 4π = 2 full cycles
      return Math.round(min + (span / 2) * (wave + 1));
    }
    case 'random': {
      // Deterministic per-row noise. Same row index always picks the same count.
      return Math.round(min + hash01(row * 31 + 7) * span);
    }
  }
}

export function evaluateRowFlow(
  params: RowFlowParams,
  t: number,
  canvasWidth: number,
  loopDuration: number,
): WordInstance[] {
  const out: WordInstance[] = [];
  const phaseTurns =
    params.xWave.phase +
    params.xWave.phaseSpeed * (t / Math.max(0.0001, loopDuration));
  const phaseRad = phaseTurns * 2 * Math.PI;

  const margin = canvasWidth * 0.06;
  const usable = canvasWidth - 2 * margin;

  for (let r = 0; r < params.rows; r++) {
    const count = countForRow(r, params.rows, params);
    if (count < 1) continue;

    const y = params.yCenter + (r - (params.rows - 1) / 2) * params.rowSpacing;
    const xWave = Math.sin(r * params.xWave.frequency + phaseRad) * params.xWave.amplitude;

    for (let i = 0; i < count; i++) {
      const tFrac = count === 1 ? 0.5 : i / (count - 1);
      const baseX = margin + tFrac * usable + xWave;

      const seed = r * 1000 + i;
      const jx = (hash01(seed * 7) - 0.5) * 2 * params.jitter.position;
      const jy = (hash01(seed * 11) - 0.5) * 2 * params.jitter.position;
      const jr = (hash01(seed * 13) - 0.5) * 2 * params.jitter.rotation;
      const jo = 1 - hash01(seed * 17) * params.jitter.opacity;

      out.push({
        word: params.word,
        x: baseX + jx,
        y: y + jy,
        rotation: jr,
        opacity: jo,
        color: params.color,
        fontSize: params.fontSize,
      });
    }
  }

  return out;
}

export function evaluate(c: Composition, t: number): WordInstance[] {
  const all: WordInstance[] = [];
  for (const flow of c.flows) {
    if (!flow.enabled) continue;
    all.push(...evaluateRowFlow(flow.params, t, c.canvas.width, c.loopDuration));
  }
  return all;
}

export function render(
  ctx: CanvasRenderingContext2D,
  c: Composition,
  instances: WordInstance[],
): void {
  ctx.save();
  ctx.fillStyle = c.bgColor;
  ctx.fillRect(0, 0, c.canvas.width, c.canvas.height);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  for (const inst of instances) {
    ctx.save();
    ctx.translate(inst.x, inst.y);
    ctx.rotate(inst.rotation);
    ctx.globalAlpha = inst.opacity;
    ctx.fillStyle = inst.color;
    ctx.font = `${inst.fontSize}px ${c.fontFamily}`;
    ctx.fillText(inst.word, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
