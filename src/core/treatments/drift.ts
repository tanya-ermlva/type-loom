import type { Cell } from '../types';
import type { Treatment } from './types';

export type DriftAxis = 'x' | 'y' | 'both';
export type DriftScope = 'character' | 'word';
export type DriftWaveform = 'sine' | 'triangle' | 'square';
export type DriftEnvelope = 'uniform' | 'center-peak' | 'edge-peak';

export interface DriftParams {
  axis: DriftAxis;
  amplitude: number;
  frequency: number;
  scope: DriftScope;
  /** Phase offset in turns (0..1 = one full cycle). Animate 0→1 over loop for a traveling wave. */
  phase: number;
  waveform: DriftWaveform;
  /** Across-row amplitude envelope: scales each cell's drift by its column position. */
  envelope: DriftEnvelope;
}

/**
 * Smooth (raised-cosine / Hann) envelope across a row.
 * tFrac=0 leftmost, 0.5 center, 1 rightmost.
 *
 * - uniform: 1 everywhere (every cell drifts equally, original behavior)
 * - center-peak: bell, 1 at center, 0 at edges (edge cells stand still)
 * - edge-peak: inverse — center cells stand still, edges move
 */
function envelopeFactor(envelope: DriftEnvelope, tFrac: number): number {
  if (envelope === 'uniform') return 1;
  const distFromCenter = Math.abs(tFrac - 0.5) * 2;
  const bell = (1 + Math.cos(distFromCenter * Math.PI)) / 2;
  return envelope === 'center-peak' ? bell : 1 - bell;
}

/**
 * Wave shape function. Returns a value in [-1, 1].
 * All variants share zero-crossings and peaks at the same theta as sine,
 * so swapping waveform is purely a stylistic change with the same period.
 */
function wave(kind: DriftWaveform, theta: number): number {
  switch (kind) {
    case 'sine':
      return Math.sin(theta);
    case 'triangle': {
      // Normalize to t ∈ [0, 1) so we can express the triangle in turns.
      const t = ((theta / (2 * Math.PI)) % 1 + 1) % 1;
      // Peaks at t=0.25 (+1) and t=0.75 (-1); zeros at t=0, 0.5, 1.
      if (t < 0.25) return 4 * t;
      if (t < 0.75) return 2 - 4 * t;
      return 4 * t - 4;
    }
    case 'square':
      return Math.sin(theta) >= 0 ? 1 : -1;
  }
}

/**
 * Drift treatment: offsets each cell's position by a sine wave.
 *
 * - axis 'x': x-position shifts, varying down rows (same X offset per row).
 * - axis 'y': y-position shifts, varying across the grid.
 * - axis 'both': both.
 *
 * - scope 'character': y-axis drift varies per-cell (col-based) — letters
 *   within a word end up at different vertical offsets.
 * - scope 'word': y-axis drift varies per-word-repetition (wordIndex-based) —
 *   every letter of a given word shares the same offset, so within-word
 *   tracking stays rigid and words bob as units.
 *
 * Scope only changes behavior for the y-axis component. The x-axis drift
 * is row-based and is already word-consistent (same offset for every
 * letter in a row).
 */
export function createDrift(params: DriftParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'drift',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      const wordLen = Math.max(1, ctx.config.input.length);
      const yIndex = params.scope === 'word' ? Math.floor(col / wordLen) : col;
      const phaseRad = params.phase * Math.PI * 2;

      // Across-row envelope: scales drift by column position so e.g. edge cells can stand still.
      const colFrac = ctx.columns <= 1 ? 0.5 : col / (ctx.columns - 1);
      const env = envelopeFactor(params.envelope, colFrac);

      const offsetX = (params.axis === 'x' || params.axis === 'both')
        ? wave(params.waveform, row * params.frequency + phaseRad) * params.amplitude * env
        : 0;
      const offsetY = (params.axis === 'y' || params.axis === 'both')
        ? wave(params.waveform, yIndex * params.frequency + phaseRad) * params.amplitude * env
        : 0;
      return {
        ...cell,
        position: {
          x: cell.position.x + offsetX,
          y: cell.position.y + offsetY,
        },
      };
    },
  };
}
