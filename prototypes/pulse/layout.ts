import type { AlignmentMode } from './store';

export interface TokenWidth {
  id: string;
  width: number;
}

export interface TokenPosition {
  id: string;
  x: number;
  width: number;
}

export interface LayoutOpts {
  canvasWidth: number;
  edgePadding: number;
  tokenSpacingTight: number;
}

export function layoutLine(
  tokens: TokenWidth[],
  mode: AlignmentMode,
  opts: LayoutOpts,
): TokenPosition[] {
  if (tokens.length === 0) return [];
  const { canvasWidth, edgePadding, tokenSpacingTight } = opts;
  const sumWidths = tokens.reduce((s, t) => s + t.width, 0);

  if (mode === 'justified' && tokens.length > 1) {
    const inner = canvasWidth - 2 * edgePadding;
    const gap = (inner - sumWidths) / (tokens.length - 1);
    let x = edgePadding;
    return tokens.map((t) => {
      const pos = { id: t.id, x, width: t.width };
      x += t.width + gap;
      return pos;
    });
  }

  // centered / left / right / (justified with 1 token) — same packing, different start
  const contentW = sumWidths + tokenSpacingTight * Math.max(0, tokens.length - 1);
  let startX: number;
  switch (mode) {
    case 'left':      startX = edgePadding; break;
    case 'right':     startX = canvasWidth - edgePadding - contentW; break;
    case 'centered':
    case 'justified': // single-token case
    default:          startX = (canvasWidth - contentW) / 2; break;
  }

  let x = startX;
  return tokens.map((t) => {
    const pos = { id: t.id, x, width: t.width };
    x += t.width + tokenSpacingTight;
    return pos;
  });
}
