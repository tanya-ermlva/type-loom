import type { Cell } from '../types';
import type { Treatment } from './types';

export type TintMode = 'opacity' | 'color';
export type TintPattern = 'radial' | 'linear-x' | 'linear-y';
export type TintBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';

export interface TintParams {
  mode: TintMode;
  pattern: TintPattern;
  blendMode: TintBlendMode;
  minOpacity: number;
  maxOpacity: number;
  colorA: string;
  colorB: string;
}

/** Per-channel blend math. a = prior channel value (0..1), b = incoming. */
function blendChannel(a: number, b: number, mode: TintBlendMode): number {
  switch (mode) {
    case 'normal':   return b;
    case 'multiply': return a * b;
    case 'screen':   return 1 - (1 - a) * (1 - b);
    case 'overlay':  return a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b);
    case 'add':      return Math.min(1, a + b);
  }
}

export function createTint(params: TintParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'tint',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      let t: number;
      switch (params.pattern) {
        case 'radial': {
          const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          t = Math.min(1, Math.sqrt(nx * nx + ny * ny));
          break;
        }
        case 'linear-x':
          t = ctx.columns <= 1 ? 0 : col / (ctx.columns - 1);
          break;
        case 'linear-y':
          t = ctx.rows <= 1 ? 0 : row / (ctx.rows - 1);
          break;
      }

      if (params.mode === 'opacity') {
        const opacity = params.minOpacity + (params.maxOpacity - params.minOpacity) * t;
        return { ...cell, opacity: cell.opacity * opacity };
      }
      const targetHex = lerpHexColor(params.colorA, params.colorB, t);
      const blended = blendHexColors(cell.color, targetHex, params.blendMode);
      return { ...cell, color: blended };
    },
  };
}

function lerpHexColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return toHex(r, g, bl);
}

function blendHexColors(prev: string, next: string, mode: TintBlendMode): string {
  const [pr, pg, pb] = parseHex(prev);
  const [nr, ng, nb] = parseHex(next);
  const r = Math.round(blendChannel(pr / 255, nr / 255, mode) * 255);
  const g = Math.round(blendChannel(pg / 255, ng / 255, mode) * 255);
  const b = Math.round(blendChannel(pb / 255, nb / 255, mode) * 255);
  return toHex(r, g, b);
}

function parseHex(hex: string): [number, number, number] {
  const s = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
