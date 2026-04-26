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

/** Per-word amplitude envelope across a row. */
export type WaveEnvelope = 'uniform' | 'center-peak' | 'edge-peak';

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
    /** Across-row envelope: scales each word's wave contribution by column position. */
    envelope: WaveEnvelope;
  };
  /** Animates the per-row word count over time — words breathe in/out. */
  densityPulse: {
    amplitude: number;   // ± words added/removed at peak (0 = off)
    phaseSpeed: number;  // turns per loop; integer keeps the loop seamless
  };
  rowSpacing: number;    // px between adjacent rows
  color: string;
  /** Deterministic per-instance noise — gives the printed-paper feel. */
  jitter: {
    position: number;    // px, ± each axis
    rotation: number;    // radians, ±
    opacity: number;     // 0..this subtracted from 1
  };
}

/** Words placed on concentric rings around a center point. */
export interface CircleFlowParams {
  word: string;
  center: { x: number; y: number };
  rings: number;             // number of concentric rings
  innerRadius: number;       // px
  outerRadius: number;       // px
  wordsPerRing: number;      // count, evenly spaced around each ring
  /** Whether words follow the ring tangent or stay upright. */
  alignment: 'tangent' | 'horizontal';
  /** Whole composition rotates over time. */
  rotation: {
    phase: number;           // 0..1 turns (static offset)
    phaseSpeed: number;      // turns per loop; integer = seamless
  };
  color: string;
  jitter: {
    position: number;
    rotation: number;
    opacity: number;
  };
}

/** Discriminated union of flow kinds. Adding a new kind = one new variant + one switch case. */
export type Flow =
  | { id: string; kind: 'row';    enabled: boolean; params: RowFlowParams }
  | { id: string; kind: 'circle'; enabled: boolean; params: CircleFlowParams };

export type FlowKind = Flow['kind'];

export interface Composition {
  canvas: { width: number; height: number };
  bgColor: string;
  fontFamily: string;
  /** Single font size shared by every word in every flow. */
  fontSize: number;
  /** Clear pixels around all four canvas edges. No word ever extends past this. */
  edgePadding: number;
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

/**
 * Conservative word-width estimate (px). Slight over-estimate so that we err on
 * the side of more clear space — safety over density. For uppercase sans-serif
 * at common sizes, ~0.65 × fontSize per char captures most letters' advance.
 */
function approximateWordWidth(word: string, fontSize: number): number {
  return word.length * fontSize * 0.65;
}

/**
 * Returns 0..1 multiplier for the wave amplitude based on a word's column position
 * within its row. tFrac=0 is leftmost, 0.5 is center, 1 is rightmost.
 *
 * - uniform: 1 everywhere (every word moves equally — old behavior)
 * - center-peak: smooth bell, 1 at center, 0 at edges (edges stand still)
 * - edge-peak: inverse — center stands still, edges move
 *
 * Smooth (raised-cosine / Hann) shape — gentler than a linear tent.
 */
function envelopeFactor(envelope: WaveEnvelope, tFrac: number): number {
  if (envelope === 'uniform') return 1;
  const distFromCenter = Math.abs(tFrac - 0.5) * 2; // 0 at center, 1 at edges
  const bell = (1 + Math.cos(distFromCenter * Math.PI)) / 2; // 1 → 0
  return envelope === 'center-peak' ? bell : 1 - bell;
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
  fontSize: number,
  yCenter: number,
  edgePadding: number,
): WordInstance[] {
  const out: WordInstance[] = [];
  const loop = Math.max(0.0001, loopDuration);
  const phaseTurns = params.xWave.phase + params.xWave.phaseSpeed * (t / loop);
  const phaseRad = phaseTurns * 2 * Math.PI;

  // Density pulse: time-varying delta added to every row's count.
  // amplitude=0 → no pulse (backwards compatible).
  const pulseDelta =
    Math.sin(2 * Math.PI * params.densityPulse.phaseSpeed * (t / loop)) *
    params.densityPulse.amplitude;

  // Per-flow safe margin: guarantees no word ever crosses edgePadding.
  // Account for: half the word width (we draw centered), the wave shift the
  // edge word will receive (depends on envelope — center-peak edges = 0), and
  // worst-case jitter.
  const envFactorAtEdge = envelopeFactor(params.xWave.envelope, 0);
  const wordHalfWidth = approximateWordWidth(params.word, fontSize) / 2;
  const safeMargin =
    edgePadding +
    wordHalfWidth +
    Math.abs(params.xWave.amplitude) * envFactorAtEdge +
    params.jitter.position;
  const usable = Math.max(0, canvasWidth - 2 * safeMargin);
  const margin = safeMargin;

  for (let r = 0; r < params.rows; r++) {
    const baseCount = countForRow(r, params.rows, params);
    const count = Math.max(0, Math.round(baseCount + pulseDelta));
    if (count < 1) continue;

    const y = yCenter + (r - (params.rows - 1) / 2) * params.rowSpacing;
    const xWave = Math.sin(r * params.xWave.frequency + phaseRad) * params.xWave.amplitude;

    for (let i = 0; i < count; i++) {
      const tFrac = count === 1 ? 0.5 : i / (count - 1);
      const env = envelopeFactor(params.xWave.envelope, tFrac);
      const baseX = margin + tFrac * usable + xWave * env;

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
        fontSize,
      });
    }
  }

  return out;
}

export function evaluateCircleFlow(
  params: CircleFlowParams,
  t: number,
  loopDuration: number,
  fontSize: number,
): WordInstance[] {
  const out: WordInstance[] = [];
  const loop = Math.max(0.0001, loopDuration);
  const globalRotRad =
    (params.rotation.phase + params.rotation.phaseSpeed * (t / loop)) * 2 * Math.PI;

  for (let r = 0; r < params.rings; r++) {
    const ringFrac = params.rings <= 1 ? 0.5 : r / (params.rings - 1);
    const radius = params.innerRadius + ringFrac * (params.outerRadius - params.innerRadius);
    const count = Math.max(1, params.wordsPerRing);
    // Alternate rings get a half-step rotation offset → richer texture.
    const ringPhaseRad = (r % 2 === 0) ? 0 : Math.PI / count;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + ringPhaseRad + globalRotRad;
      const x = params.center.x + Math.cos(angle) * radius;
      const y = params.center.y + Math.sin(angle) * radius;

      const seed = r * 1000 + i;
      const jx = (hash01(seed * 7) - 0.5) * 2 * params.jitter.position;
      const jy = (hash01(seed * 11) - 0.5) * 2 * params.jitter.position;
      const jr = (hash01(seed * 13) - 0.5) * 2 * params.jitter.rotation;
      const jo = 1 - hash01(seed * 17) * params.jitter.opacity;

      // Tangent-aligned words rotate to the ring's tangent direction (angle + 90°).
      const baseRotation = params.alignment === 'tangent' ? angle + Math.PI / 2 : 0;

      out.push({
        word: params.word,
        x: x + jx,
        y: y + jy,
        rotation: baseRotation + jr,
        opacity: jo,
        color: params.color,
        fontSize,
      });
    }
  }
  return out;
}

/**
 * Auto-layout: distributes enabled RowFlows vertically with edgePadding at top
 * and bottom, and even gaps between blocks for any leftover space. CircleFlows
 * position themselves explicitly via params.center and are not part of the row
 * stack.
 *
 * If the total content height exceeds the available space (canvas - 2×edgePadding),
 * inner gaps clamp to 0 (blocks touch) and some bottom clipping is accepted —
 * better than violating the locked row spacing or the edge padding contract.
 */
function computeRowFlowYCenters(c: Composition): Map<string, number> {
  const enabledRowFlows = c.flows.filter(
    (f): f is Extract<Flow, { kind: 'row' }> => f.enabled && f.kind === 'row',
  );
  const heights = enabledRowFlows.map((f) => f.params.rows * f.params.rowSpacing);
  const totalHeight = heights.reduce((sum, h) => sum + h, 0);

  const usableHeight = Math.max(0, c.canvas.height - 2 * c.edgePadding);
  const innerGapsCount = Math.max(0, enabledRowFlows.length - 1);
  const innerGap =
    innerGapsCount > 0 ? Math.max(0, (usableHeight - totalHeight) / innerGapsCount) : 0;

  const map = new Map<string, number>();
  let y = c.edgePadding;
  for (let i = 0; i < enabledRowFlows.length; i++) {
    map.set(enabledRowFlows[i].id, y + heights[i] / 2);
    y += heights[i] + innerGap;
  }
  return map;
}

export function evaluate(c: Composition, t: number): WordInstance[] {
  const all: WordInstance[] = [];
  const rowYCenters = computeRowFlowYCenters(c);

  for (const flow of c.flows) {
    if (!flow.enabled) continue;
    switch (flow.kind) {
      case 'row': {
        const yCenter = rowYCenters.get(flow.id) ?? c.canvas.height / 2;
        all.push(
          ...evaluateRowFlow(
            flow.params,
            t,
            c.canvas.width,
            c.loopDuration,
            c.fontSize,
            yCenter,
            c.edgePadding,
          ),
        );
        break;
      }
      case 'circle':
        all.push(...evaluateCircleFlow(flow.params, t, c.loopDuration, c.fontSize));
        break;
    }
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
