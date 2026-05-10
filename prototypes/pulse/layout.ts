import type { AlignmentMode } from './store';
import { jitterFor } from './animation';

export interface TokenWidth {
  id: string;
  width: number;
  /**
   * Optional per-character ink widths (one per glyph, no letter-spacing baked in).
   * Required for `justified-chars` alignment so the layout can compute the global
   * character gap. Other modes ignore it.
   */
  letterWidths?: number[];
}

export interface TokenPosition {
  id: string;
  x: number;
  /** Final rendered width for this token. Equals natural width unless `scaleX` !== 1. */
  width: number;
  /** Optional horizontal scale factor (default 1). Used by 'stretched' mode so the
   *  renderer can apply `textLength` for proportional glyph stretching. */
  scaleX?: number;
  /**
   * Optional per-token letter-spacing override (px). Set by `justified-chars`
   * so each token's letters track out to the global character gap. The renderer
   * falls back to the composition's natural letter-spacing when this is unset.
   */
  letterSpacingPx?: number;
}

export interface LayoutOpts {
  canvasWidth: number;
  edgePadding: number;
  tokenSpacingTight: number;
  /** Seed for deterministic random in 'scattered' mode. Defaults to 1 if absent. */
  scatterSeed?: number;
}

export function layoutLine(
  tokens: TokenWidth[],
  mode: AlignmentMode,
  opts: LayoutOpts,
): TokenPosition[] {
  if (tokens.length === 0) return [];

  switch (mode) {
    case 'justified':       return layoutJustified(tokens, opts);
    case 'justified-chars': return layoutJustifiedChars(tokens, opts);
    case 'stretched':       return layoutStretched(tokens, opts);
    case 'gravity-left':    return layoutGravity(tokens, opts, 'left');
    case 'gravity-right':   return layoutGravity(tokens, opts, 'right');
    case 'hugging-edges':   return layoutHugging(tokens, opts);
    case 'scattered':       return layoutScattered(tokens, opts);
    case 'mirrored':        return layoutMirrored(tokens, opts);
    case 'offset-justified':return layoutOffsetJustified(tokens, opts);
    case 'exploded':        return layoutExploded(tokens, opts);
    case 'left':
    case 'right':
    case 'centered':
    default:                return layoutPacked(tokens, mode, opts);
  }
}

// ---------- Modes ----------

/** Tokens packed tight with `tokenSpacingTight` between them. Anchored left/right/centered. */
function layoutPacked(
  tokens: TokenWidth[],
  mode: 'left' | 'right' | 'centered' | AlignmentMode,
  opts: LayoutOpts,
): TokenPosition[] {
  const { canvasWidth, edgePadding, tokenSpacingTight } = opts;
  const sumWidths = sum(tokens.map((t) => t.width));
  const contentW = sumWidths + tokenSpacingTight * Math.max(0, tokens.length - 1);
  let startX: number;
  switch (mode) {
    case 'left':  startX = edgePadding; break;
    case 'right': startX = canvasWidth - edgePadding - contentW; break;
    default:      startX = (canvasWidth - contentW) / 2; break;
  }
  let x = startX;
  return tokens.map((t) => {
    const pos: TokenPosition = { id: t.id, x, width: t.width };
    x += t.width + tokenSpacingTight;
    return pos;
  });
}

/**
 * `justified-chars` — every CHARACTER in the line gets equal spacing (intra-token
 * AND inter-token gaps are identical). The first letter sits at edgePadding, the
 * last letter at canvasWidth − edgePadding. Each returned token carries a
 * `letterSpacingPx` override the renderer uses to track its glyphs out to fill
 * its allocated slot.
 *
 * Math:
 *   • totalInk    = Σ letter widths across all tokens
 *   • totalChars  = Σ letter counts across all tokens
 *   • gap         = (innerWidth − totalInk) / (totalChars − 1)
 *   • token width = inkSum + (chars − 1) · gap
 *   • next token starts at: prev.x + prev.width + gap   (same gap as inter-letter)
 *
 * Falls back to centred packing if metrics are missing or there's only one
 * character in the line (no gaps to distribute).
 */
function layoutJustifiedChars(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  // Need per-letter widths from every token. If any token lacks them
  // (font not measured yet), gracefully fall back rather than NaN-out.
  if (tokens.some((t) => !t.letterWidths)) return layoutPacked(tokens, 'centered', opts);
  const { canvasWidth, edgePadding } = opts;
  const inner = canvasWidth - 2 * edgePadding;
  const inkPerToken = tokens.map((t) => sum(t.letterWidths!));
  const totalInk = sum(inkPerToken);
  const totalChars = tokens.reduce((s, t) => s + t.letterWidths!.length, 0);
  if (totalChars <= 1) return layoutPacked(tokens, 'centered', opts);
  const gap = (inner - totalInk) / (totalChars - 1);
  let x = edgePadding;
  return tokens.map((t, i) => {
    const chars = t.letterWidths!.length;
    const tokWidth = inkPerToken[i] + Math.max(0, chars - 1) * gap;
    const pos: TokenPosition = { id: t.id, x, width: tokWidth, letterSpacingPx: gap };
    x += tokWidth + gap;
    return pos;
  });
}

/** First token at edgePadding, last at canvasWidth - edgePadding - lastWidth, gaps even. */
function layoutJustified(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  if (tokens.length === 1) return layoutPacked(tokens, 'centered', opts);
  const { canvasWidth, edgePadding } = opts;
  const inner = canvasWidth - 2 * edgePadding;
  const gap = (inner - sum(tokens.map((t) => t.width))) / (tokens.length - 1);
  let x = edgePadding;
  return tokens.map((t) => {
    const pos = { id: t.id, x, width: t.width };
    x += t.width + gap;
    return pos;
  });
}

/** Each token grows in width to fill the line. No gaps between tokens. */
function layoutStretched(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  const { canvasWidth, edgePadding } = opts;
  const inner = canvasWidth - 2 * edgePadding;
  const naturalSum = sum(tokens.map((t) => t.width));
  if (naturalSum <= 0) return layoutPacked(tokens, 'centered', opts);
  const stretch = inner / naturalSum;
  let x = edgePadding;
  return tokens.map((t) => {
    const w = t.width * stretch;
    const pos: TokenPosition = { id: t.id, x, width: w, scaleX: stretch };
    x += w;
    return pos;
  });
}

/**
 * Tokens packed at one edge with exponentially growing gaps toward the other edge.
 * `direction = 'left'`: gap[i] grows from token 0 onward → tokens cluster at left.
 * `direction = 'right'`: mirrored — tokens cluster at right.
 */
function layoutGravity(
  tokens: TokenWidth[],
  opts: LayoutOpts,
  direction: 'left' | 'right',
): TokenPosition[] {
  if (tokens.length === 1) return layoutPacked(tokens, direction, opts);
  const { canvasWidth, edgePadding } = opts;
  const inner = canvasWidth - 2 * edgePadding;
  const sumWidths = sum(tokens.map((t) => t.width));
  const totalGap = inner - sumWidths;
  // Geometric series with ratio 2: sum = 2^N - 1 where N = tokens.length - 1.
  const N = tokens.length - 1;
  const denom = (1 << N) - 1; // 2^N - 1
  const baseGap = denom > 0 ? totalGap / denom : 0;

  if (direction === 'left') {
    let x = edgePadding;
    return tokens.map((t, i) => {
      const pos = { id: t.id, x, width: t.width };
      const gapAfter = i < tokens.length - 1 ? baseGap * (1 << i) : 0;
      x += t.width + gapAfter;
      return pos;
    });
  }

  // gravity-right: place from rightmost token leftward with the same exponential pattern
  let xRight = canvasWidth - edgePadding;
  const placed: TokenPosition[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    xRight -= t.width;
    placed[i] = { id: t.id, x: xRight, width: t.width };
    if (i > 0) {
      // gap BEFORE token i corresponds to (tokens.length - 1 - i)-th gap from the right
      const gapBefore = baseGap * (1 << (tokens.length - 1 - i));
      xRight -= gapBefore;
    }
  }
  return placed;
}

/** First/last tokens prabbed at edges, middle tokens packed tight in the centre. */
function layoutHugging(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  if (tokens.length <= 2) return layoutJustified(tokens, opts);
  const { canvasWidth, edgePadding, tokenSpacingTight } = opts;
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const middle = tokens.slice(1, -1);
  const middleSum = sum(middle.map((t) => t.width));
  const middleContentW = middleSum + tokenSpacingTight * Math.max(0, middle.length - 1);
  const middleStart = (canvasWidth - middleContentW) / 2;

  const positions: TokenPosition[] = [];
  positions[0] = { id: first.id, x: edgePadding, width: first.width };
  let mx = middleStart;
  middle.forEach((t, i) => {
    positions[i + 1] = { id: t.id, x: mx, width: t.width };
    mx += t.width + tokenSpacingTight;
  });
  positions[tokens.length - 1] = {
    id: last.id,
    x: canvasWidth - edgePadding - last.width,
    width: last.width,
  };
  return positions;
}

/** Deterministic random positions inside the line, seeded via opts.scatterSeed. */
function layoutScattered(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  const { canvasWidth, edgePadding, scatterSeed = 1 } = opts;
  return tokens.map((t, i) => {
    const span = Math.max(0, canvasWidth - 2 * edgePadding - t.width);
    const r = (jitterFor(scatterSeed + i, scatterSeed * 31 + i) + 1) / 2; // [0, 1]
    return { id: t.id, x: edgePadding + r * span, width: t.width };
  });
}

/** Tokens placed in reverse visual order: token 0 ends up at the rightmost slot. */
function layoutMirrored(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  const reversed = [...tokens].reverse();
  const reversedPositions = layoutPacked(reversed, 'centered', opts);
  return tokens.map((t, originalIdx) => {
    const reversedIdx = tokens.length - 1 - originalIdx;
    return { id: t.id, x: reversedPositions[reversedIdx].x, width: t.width };
  });
}

/** Justified but with quadratic-growing gaps from left to right. */
function layoutOffsetJustified(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  if (tokens.length === 1) return layoutPacked(tokens, 'centered', opts);
  const { canvasWidth, edgePadding } = opts;
  const inner = canvasWidth - 2 * edgePadding;
  const sumWidths = sum(tokens.map((t) => t.width));
  const totalGap = inner - sumWidths;
  // Quadratic weights 1, 4, 9, … N-1². Sum = (N-1)·N·(2N-1)/6 with N = tokens.length - 1.
  const N = tokens.length - 1;
  const weightSum = (N * (N + 1) * (2 * N + 1)) / 6;
  const unit = weightSum > 0 ? totalGap / weightSum : 0;
  let x = edgePadding;
  return tokens.map((t, i) => {
    const pos = { id: t.id, x, width: t.width };
    if (i < tokens.length - 1) {
      const gap = unit * Math.pow(i + 1, 2);
      x += t.width + gap;
    }
    return pos;
  });
}

/** Fixed large gaps; total can exceed canvasWidth (overflow allowed). */
function layoutExploded(tokens: TokenWidth[], opts: LayoutOpts): TokenPosition[] {
  const { edgePadding, tokenSpacingTight } = opts;
  const explodeGap = Math.max(80, tokenSpacingTight * 5);
  let x = edgePadding;
  return tokens.map((t) => {
    const pos = { id: t.id, x, width: t.width };
    x += t.width + explodeGap;
    return pos;
  });
}

// ---------- Helpers ----------

function sum(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0);
}
